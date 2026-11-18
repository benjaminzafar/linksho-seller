import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { buildSellerWorkerScript } from '@/lib/cloudflareWorkerTemplate';

const CF_API = 'https://api.cloudflare.com/client/v4';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function jsonRes(data, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

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
    // Always prefer owner's server-side Cloudflare Token & Account ID for security and billing control
    const cfToken = String(process.env.CLOUDFLARE_API_TOKEN || body.cfToken || '').trim();
    const envAccountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
    const storeName = String(body.name || '').trim();
    const storeType = body.type === 'restaurant' ? 'restaurant' : 'webshop';
    const currency = ['SEK', 'NOK', 'DKK', 'EUR'].includes(body.currency) ? body.currency : 'SEK';
    const shippingFee = Math.max(0, Number(body.shippingFee) || 0);
    const phone = String(body.phone || '').trim();
    const companyNumber = String(body.companyNumber || '').trim();
    const email = String(body.email || '').trim();

    if (!storeName) {
      return jsonRes({ ok: false, error: 'نام فروشگاه یا رستوران الزامی است.' }, 400);
    }

    if (!cfToken) {
      return jsonRes(
        { ok: false, error: 'توکن کلودفلر روی سرور تنظیم نشده است (CLOUDFLARE_API_TOKEN).' },
        500
      );
    }

    // 1. Resolve Cloudflare Account ID
    let accountId = envAccountId || String(body.accountId || '').trim();
    if (!accountId) {
      const accRes = await cfFetch('/accounts?per_page=5', cfToken);
      if (!accRes.ok || !Array.isArray(accRes.data?.result) || accRes.data.result.length === 0) {
        const msg = accRes.data?.errors?.[0]?.message || 'توکن کلودفلر معتبر نیست یا دسترسی Account ندارد.';
        return jsonRes({ ok: false, error: msg }, 401);
      }
      accountId = accRes.data.result[0].id;
    }

    // 2. Get Workers.dev Subdomain
    const subRes = await cfFetch(`/accounts/${accountId}/workers/subdomain`, cfToken);
    const subdomain = subRes.data?.result?.subdomain;
    if (!subdomain) {
      return jsonRes(
        {
          ok: false,
          error: 'ساب‌دامین workers.dev در حساب کلودفلر فعال نیست.',
        },
        400
      );
    }

    // 3. Create Isolated Cloudflare D1 Database on Owner's Account
    const suffix = crypto.randomBytes(3).toString('hex');
    const dbName = `linksho-seller-${suffix}`;
    const workerName = `linksho-seller-${suffix}`;

    const dbRes = await cfFetch(`/accounts/${accountId}/d1/database`, cfToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dbName }),
    });

    if (!dbRes.ok || !dbRes.data?.result?.uuid) {
      const errMsg = dbRes.data?.errors?.[0]?.message || 'خطا در ساخت دیتابیس D1 روی کلودفلر.';
      return jsonRes({ ok: false, error: errMsg }, 400);
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
      return jsonRes({ ok: false, error: errMsg }, 500);
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

    const uploadRes = await cfFetch(
      `/accounts/${accountId}/workers/scripts/${workerName}`,
      cfToken,
      { method: 'PUT', body: formData }
    );

    if (!uploadRes.ok) {
      const errMsg = uploadRes.data?.errors?.[0]?.message || 'خطا در آپلود Worker روی کلودفلر.';
      return jsonRes({ ok: false, error: errMsg }, 500);
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

    return jsonRes({
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
    });
  } catch (err) {
    return jsonRes({ ok: false, error: err?.message || 'خطا در دیپلوی خودکار کلودفلر' }, 500);
  }
}

// Admin Delete / Terminate a Seller Worker & D1 Database (e.g., if subscription unpaid)
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const workerName = String(searchParams.get('workerName') || '').trim();
    const dbId = String(searchParams.get('dbId') || '').trim();
    const adminSecret = req.headers.get('x-admin-secret') || searchParams.get('secret') || '';

    const expectedSecret = process.env.SELLER_ADMIN_SECRET || '';
    if (expectedSecret && adminSecret !== expectedSecret) {
      return jsonRes({ ok: false, error: 'دسترسی غیرمجاز' }, 401);
    }

    const cfToken = String(process.env.CLOUDFLARE_API_TOKEN || '').trim();
    if (!cfToken) {
      return jsonRes({ ok: false, error: 'CLOUDFLARE_API_TOKEN تنظیم نشده است.' }, 500);
    }

    let accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
    if (!accountId) {
      const accRes = await cfFetch('/accounts?per_page=5', cfToken);
      accountId = accRes.data?.result?.[0]?.id || '';
    }
    if (!accountId) {
      return jsonRes({ ok: false, error: 'Account ID یافت نشد.' }, 400);
    }

    if (workerName) {
      await cfFetch(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}`, cfToken, {
        method: 'DELETE',
      });
    }
    if (dbId) {
      await cfFetch(`/accounts/${accountId}/d1/database/${encodeURIComponent(dbId)}`, cfToken, {
        method: 'DELETE',
      });
    }

    return jsonRes({ ok: true, deleted: { workerName, dbId } });
  } catch (err) {
    return jsonRes({ ok: false, error: err?.message || 'خطا در حذف سرویس فروشنده' }, 500);
  }
}
