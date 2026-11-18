import { buildSellerWorkerScript } from '~/server/utils/cloudflareWorkerTemplate';

const CF_API = 'https://api.cloudflare.com/client/v4';

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(len);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars.charAt(bytes[i] % chars.length);
  }
  return out;
}

function randomHex(byteLen = 4) {
  const bytes = new Uint8Array(byteLen);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function cfFetch(path, token, opts = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, status: res.status, data: json };
}

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  try {
    const body = (await readBody(event)) || {};
    const env = event.context.cloudflare?.env || process.env;
    const cfToken = String(env.CLOUDFLARE_API_TOKEN || body.cfToken || '').trim();
    const envAccountId = String(env.CLOUDFLARE_ACCOUNT_ID || '').trim();
    const storeName = String(body.name || '').trim();
    const storeType = 'restaurant';
    const currency = ['SEK', 'NOK', 'DKK', 'EUR'].includes(body.currency) ? body.currency : 'SEK';
    const shippingFee = Math.max(0, Number(body.shippingFee) || 0);
    const phone = String(body.phone || '').trim();
    const companyNumber = String(body.companyNumber || '').trim();
    const email = String(body.email || '').trim();

    if (!storeName) {
      setResponseStatus(event, 400);
      return { ok: false, error: 'نام فروشگاه یا رستوران الزامی است.' };
    }

    if (!cfToken) {
      setResponseStatus(event, 500);
      return { ok: false, error: 'توکن کلودفلر روی سرور تنظیم نشده است (CLOUDFLARE_API_TOKEN).' };
    }

    // 1. Resolve Cloudflare Account ID
    let accountId = envAccountId || String(body.accountId || '').trim();
    if (!accountId) {
      const accRes = await cfFetch('/accounts?per_page=5', cfToken);
      if (!accRes.ok || !Array.isArray(accRes.data?.result) || accRes.data.result.length === 0) {
        const msg = accRes.data?.errors?.[0]?.message || 'توکن کلودفلر معتبر نیست یا دسترسی Account ندارد.';
        setResponseStatus(event, 401);
        return { ok: false, error: msg };
      }
      accountId = accRes.data.result[0].id;
    }

    // 2. Get Workers.dev Subdomain
    const subRes = await cfFetch(`/accounts/${accountId}/workers/subdomain`, cfToken);
    const subdomain = subRes.data?.result?.subdomain;
    if (!subdomain) {
      setResponseStatus(event, 400);
      return { ok: false, error: 'ساب‌دامین workers.dev در حساب کلودفلر فعال نیست.' };
    }

    // 3. Create Isolated Cloudflare D1 Database
    const suffix = randomHex(4);
    const dbName = `linksho-db-${suffix}`;
    const workerName = `linksho-site-${suffix}`;

    const dbRes = await cfFetch(`/accounts/${accountId}/d1/database`, cfToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dbName }),
    });

    if (!dbRes.ok || !dbRes.data?.result?.uuid) {
      const errMsg = dbRes.data?.errors?.[0]?.message || 'خطا در ساخت دیتابیس D1 روی کلودفلر.';
      setResponseStatus(event, 400);
      return { ok: false, error: errMsg };
    }
    const dbId = dbRes.data.result.uuid;

    // 4. Initialize D1 Schema + Initial Store Config
    const storeId = `ST-${randomCode(5)}`;
    const pinCode = randomCode(6);
    const apiKey = `sk_live_${randomHex(12)}`;
    const initialConfig = {
      id: storeId,
      pinCode,
      apiKey,
      name: storeName,
      type: storeType,
      currency,
      shippingFee,
      freeShippingOver: 0,
      stripe: { enabled: false, mode: 'test', publishableKey: '' },
      phone,
      companyNumber,
      email,
      address: '',
      description: '',
      createdAt: new Date().toISOString(),
    };

    const schemaSql = `
      CREATE TABLE IF NOT EXISTS store_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT, price REAL NOT NULL DEFAULT 0, image TEXT, description TEXT, available INTEGER NOT NULL DEFAULT 1, created_at TEXT);
      CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL, customer_address TEXT, delivery_type TEXT, items_json TEXT NOT NULL, subtotal REAL DEFAULT 0, shipping_fee REAL DEFAULT 0, total_amount REAL NOT NULL DEFAULT 0, currency TEXT, payment_method TEXT, payment_status TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT);
    `;

    const initSqlRes = await cfFetch(`/accounts/${accountId}/d1/database/${dbId}/query`, cfToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: schemaSql }),
    });

    if (!initSqlRes.ok) {
      const errMsg = initSqlRes.data?.errors?.[0]?.message || 'خطا در ساخت جداول دیتابیس D1';
      setResponseStatus(event, 500);
      return { ok: false, error: errMsg };
    }

    await cfFetch(`/accounts/${accountId}/d1/database/${dbId}/query`, cfToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: 'INSERT OR REPLACE INTO store_config (key, value) VALUES (?, ?)',
        params: ['main', JSON.stringify(initialConfig)],
      }),
    });

    // 5. Upload Self-Contained Worker Script + D1 Binding
    const workerCode = buildSellerWorkerScript();
    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob(
        [
          JSON.stringify({
            main_module: 'worker.js',
            compatibility_date: '2024-11-01',
            bindings: [{ type: 'd1', name: 'DB', id: dbId }],
          }),
        ],
        { type: 'application/json' }
      )
    );
    formData.append(
      'worker.js',
      new Blob([workerCode], { type: 'application/javascript+module' }),
      'worker.js'
    );

    const uploadRes = await cfFetch(`/accounts/${accountId}/workers/scripts/${workerName}`, cfToken, {
      method: 'PUT',
      body: formData,
    });

    if (!uploadRes.ok) {
      const errMsg = uploadRes.data?.errors?.[0]?.message || 'خطا در آپلود Worker روی کلودفلر.';
      setResponseStatus(event, 500);
      return { ok: false, error: errMsg };
    }

    // 6. Enable workers.dev Subdomain Route
    await cfFetch(`/accounts/${accountId}/workers/scripts/${workerName}/subdomain`, cfToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    const panelUrl = `https://${workerName}.${subdomain}.workers.dev`;
    const storefrontApiUrl = `${panelUrl}/api/storefront?key=${apiKey}`;

    return {
      ok: true,
      panelUrl,
      storefrontApiUrl,
      storeId,
      pinCode,
      apiKey,
      dbId,
      workerName,
      name: storeName,
      type: storeType,
      currency,
      phone,
      companyNumber,
      email,
      createdAt: initialConfig.createdAt,
    };
  } catch (err) {
    setResponseStatus(event, 500);
    return { ok: false, error: err?.message || 'خطا در دیپلوی خودکار کلودفلر' };
  }
});
