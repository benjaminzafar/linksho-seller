import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { buildSellerWorkerScript } from '@/lib/cloudflareWorkerTemplate';

const CF_API = 'https://api.cloudflare.com/client/v4';

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return out;
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

export async function POST(req) {
  try {
    const body = await req.json();
    const cfToken = String(body.cfToken || '').trim();
    const storeName = String(body.name || '').trim();
    const storeType = body.type === 'restaurant' ? 'restaurant' : 'webshop';
    const currency = ['SEK', 'NOK', 'DKK', 'EUR'].includes(body.currency) ? body.currency : 'SEK';
    const shippingFee = Math.max(0, Number(body.shippingFee) || 0);
    const phone = String(body.phone || '').trim();

    if (!cfToken || !storeName) {
      return NextResponse.json(
        { ok: false, error: 'توکن کلودفلر و نام فروشگاه/رستوران الزامی است.' },
        { status: 400 }
      );
    }

    // 1. Verify Cloudflare Token & Auto-detect Account ID
    const accRes = await cfFetch('/accounts?per_page=5', cfToken);
    if (!accRes.ok || !Array.isArray(accRes.data?.result) || accRes.data.result.length === 0) {
      const msg = accRes.data?.errors?.[0]?.message || 'توکن کلودفلر معتبر نیست یا دسترسی Account ندارد.';
      return NextResponse.json({ ok: false, error: msg }, { status: 401 });
    }
    const accountId = String(body.accountId || '').trim() || accRes.data.result[0].id;

    // 2. Get Workers.dev Subdomain
    const subRes = await cfFetch(`/accounts/${accountId}/workers/subdomain`, cfToken);
    const subdomain = subRes.data?.result?.subdomain;
    if (!subdomain) {
      return NextResponse.json(
        {
          ok: false,
          error: 'ابتدا در پنل کلودفلر (Workers & Pages) یک ساب‌دامین رایگان workers.dev فعال کنید و دوباره تلاش نمایید.',
        },
        { status: 400 }
      );
    }

    // 3. Create Isolated Cloudflare D1 Database on Buyer's Account
    const suffix = crypto.randomBytes(3).toString('hex');
    const dbName = `linksho-seller-${suffix}`;
    const workerName = `linksho-seller-${suffix}`;

    const dbRes = await cfFetch(`/accounts/${accountId}/d1/database`, cfToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dbName }),
    });

    if (!dbRes.ok || !dbRes.data?.result?.uuid) {
      const errMsg = dbRes.data?.errors?.[0]?.message || 'خطا در ساخت دیتابیس D1 روی کلودفلر (دسترسی D1:Edit را بررسی کنید).';
      return NextResponse.json({ ok: false, error: errMsg }, { status: 400 });
    }
    const dbId = dbRes.data.result.uuid;

    // 4. Initialize D1 Schema + Initial Store Config
    const storeId = `ST-${randomCode(5)}`;
    const pinCode = randomCode(6);
    const apiKey = `sk_live_${crypto.randomBytes(12).toString('hex')}`;
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
      return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
    }

    await cfFetch(`/accounts/${accountId}/d1/database/${dbId}/query`, cfToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: 'INSERT OR REPLACE INTO store_config (key, value) VALUES (?, ?)',
        params: ['main', JSON.stringify(initialConfig)],
      }),
    });

    // 5. Upload Self-Contained Worker Script + D1 Binding (Zero Source Code Exposed)
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

    const uploadRes = await cfFetch(
      `/accounts/${accountId}/workers/scripts/${workerName}`,
      cfToken,
      { method: 'PUT', body: formData }
    );

    if (!uploadRes.ok) {
      const errMsg = uploadRes.data?.errors?.[0]?.message || 'خطا در آپلود Worker روی کلودفلر (دسترسی Workers Scripts:Edit را بررسی کنید).';
      return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
    }

    // 6. Enable workers.dev Subdomain Route
    await cfFetch(
      `/accounts/${accountId}/workers/scripts/${workerName}/subdomain`,
      cfToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      }
    );

    const panelUrl = `https://${workerName}.${subdomain}.workers.dev`;
    const storefrontApiUrl = `${panelUrl}/api/storefront?key=${apiKey}`;

    return NextResponse.json({
      ok: true,
      panelUrl,
      storefrontApiUrl,
      storeId,
      pinCode,
      apiKey,
      dbId,
      workerName,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'خطا در دیپلوی خودکار کلودفلر' },
      { status: 500 }
    );
  }
}
