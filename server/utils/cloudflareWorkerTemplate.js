export function buildSellerWorkerScript() {
  return `
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-seller-pin',
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extraHeaders },
  });
}

async function getConfig(env) {
  const row = await env.DB.prepare('SELECT value FROM store_config WHERE key = ?').bind('main').first();
  return row ? JSON.parse(row.value) : null;
}

async function saveConfig(env, cfg) {
  await env.DB.prepare('INSERT OR REPLACE INTO store_config (key, value) VALUES (?, ?)')
    .bind('main', JSON.stringify(cfg))
    .run();
}

function checkPin(req, cfg) {
  const pin = (req.headers.get('x-seller-pin') || '').trim().toUpperCase();
  return Boolean(pin && cfg && pin === String(cfg.pinCode || '').toUpperCase());
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    try {
      // 1. PUBLIC STOREFRONT API (Connected to LinkSho Ads)
      if (path === '/api/storefront' && req.method === 'GET') {
        const cfg = await getConfig(env);
        if (!cfg) return json({ ok: false, error: 'Store not initialized' }, 404);
        const key = (url.searchParams.get('key') || '').trim();
        if (!key || key !== cfg.apiKey) {
          return json({ ok: false, error: 'Invalid API key' }, 401);
        }
        const { results } = await env.DB.prepare(
          'SELECT id, title, category, price, image, description, available FROM products WHERE available = 1 ORDER BY created_at DESC'
        ).all();
        return json({
          ok: true,
          store: {
            id: cfg.id,
            name: cfg.name,
            type: cfg.type,
            currency: cfg.currency || 'SEK',
            shippingFee: Number(cfg.shippingFee) || 0,
            freeShippingOver: Number(cfg.freeShippingOver) || 0,
            stripe: {
              enabled: Boolean(cfg.stripe?.enabled),
              mode: cfg.stripe?.mode === 'live' ? 'live' : 'test',
              publishableKey: cfg.stripe?.publishableKey || '',
            },
            phone: cfg.phone || '',
            address: cfg.address || '',
            description: cfg.description || '',
          },
          products: results || [],
        }, 200, { 'Cache-Control': 'public, max-age=15' });
      }

      // 2. PUBLIC CUSTOMER ORDER API
      if (path === '/api/orders' && req.method === 'POST') {
        const body = await req.json();
        const cfg = await getConfig(env);
        if (!cfg || !body.apiKey || body.apiKey !== cfg.apiKey) {
          return json({ ok: false, error: 'فروشگاه معتبر نیست.' }, 401);
        }
        const customerName = String(body.customerName || '').trim();
        const customerPhone = String(body.customerPhone || '').trim();
        const items = Array.isArray(body.items) ? body.items : [];
        if (!customerName || !customerPhone || items.length === 0) {
          return json({ ok: false, error: 'اطلاعات مشتری و حداقل یک محصول الزامی است.' }, 400);
        }

        const { results: dbProducts } = await env.DB.prepare('SELECT id, title, price FROM products').all();
        let subtotal = 0;
        const normalized = items.map((it) => {
          const matched = (dbProducts || []).find((p) => p.id === it.productId);
          const qty = Math.max(1, Math.min(99, Number(it.qty) || 1));
          const unitPrice = matched ? Number(matched.price) || 0 : Number(it.price) || 0;
          subtotal += unitPrice * qty;
          return { productId: it.productId, title: matched?.title || it.title || 'محصول', qty, unitPrice };
        });

        const deliveryType = body.deliveryType === 'pickup' ? 'pickup' : 'delivery';
        const baseShip = Number(cfg.shippingFee) || 0;
        const freeOver = Number(cfg.freeShippingOver) || 0;
        const shippingFee = deliveryType === 'pickup' || (freeOver > 0 && subtotal >= freeOver) ? 0 : baseShip;
        const totalAmount = subtotal + shippingFee;
        const paymentMethod = body.paymentMethod === 'stripe' ? 'stripe' : 'cash_on_delivery';
        const paymentStatus = paymentMethod === 'stripe' && body.paymentPaid ? 'paid' : 'unpaid';
        const orderId = 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        const createdAt = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO orders (id, customer_name, customer_phone, customer_address, delivery_type, items_json, subtotal, shipping_fee, total_amount, currency, payment_method, payment_status, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          orderId,
          customerName,
          customerPhone,
          String(body.customerAddress || '').trim(),
          deliveryType,
          JSON.stringify(normalized),
          subtotal,
          shippingFee,
          totalAmount,
          cfg.currency || 'SEK',
          paymentMethod,
          paymentStatus,
          'pending',
          createdAt
        ).run();

        return json({
          ok: true,
          order: {
            id: orderId,
            customerName,
            customerPhone,
            totalAmount,
            currency: cfg.currency || 'SEK',
            status: 'pending',
            createdAt,
          },
        }, 201);
      }

      // 3. SELLER ADMIN AUTH
      if (path === '/api/admin/auth' && req.method === 'POST') {
        const body = await req.json();
        const cfg = await getConfig(env);
        if (!cfg || String(body.pinCode || '').trim().toUpperCase() !== String(cfg.pinCode || '').toUpperCase()) {
          return json({ ok: false, error: 'رمز ورود (PIN) اشتباه است.' }, 401);
        }
        return json({ ok: true, store: cfg });
      }

      // 4. PROTECTED SELLER ADMIN ROUTES
      if (path.startsWith('/api/admin/')) {
        const cfg = await getConfig(env);
        if (!checkPin(req, cfg)) {
          return json({ ok: false, error: 'عدم دسترسی' }, 401);
        }

        if (path === '/api/admin/overview' && req.method === 'GET') {
          const [{ results: products }, { results: orders }] = await Promise.all([
            env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all(),
            env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200').all(),
          ]);
          return json({
            ok: true,
            store: cfg,
            products: (products || []).map((p) => ({ ...p, available: p.available === 1 })),
            orders: (orders || []).map((o) => ({
              id: o.id,
              customerName: o.customer_name,
              customerPhone: o.customer_phone,
              customerAddress: o.customer_address,
              deliveryType: o.delivery_type,
              items: JSON.parse(o.items_json || '[]'),
              subtotal: o.subtotal,
              shippingFee: o.shipping_fee,
              totalAmount: o.total_amount,
              currency: o.currency,
              paymentMethod: o.payment_method,
              paymentStatus: o.payment_status,
              status: o.status,
              createdAt: o.created_at,
            })),
          });
        }

        if (path === '/api/admin/products' && req.method === 'POST') {
          const b = await req.json();
          const id = b.id || 'PRD-' + Date.now().toString(36).toUpperCase();
          const now = new Date().toISOString();
          await env.DB.prepare(
            'INSERT OR REPLACE INTO products (id, title, category, price, image, description, available, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            id,
            String(b.title || '').trim(),
            String(b.category || 'محصولات').trim(),
            Number(b.price) || 0,
            String(b.image || '').trim(),
            String(b.description || '').trim(),
            b.available === false ? 0 : 1,
            now
          ).run();
          return json({ ok: true, id });
        }

        if (path === '/api/admin/products' && req.method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (id) await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
          return json({ ok: true });
        }

        if (path === '/api/admin/orders' && req.method === 'PUT') {
          const b = await req.json();
          if (b.id && b.status) {
            await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(b.status, b.id).run();
          }
          return json({ ok: true });
        }

        if (path === '/api/admin/settings' && req.method === 'PUT') {
          const b = await req.json();
          const next = {
            ...cfg,
            name: b.name ? String(b.name).trim() : cfg.name,
            currency: b.currency || cfg.currency,
            shippingFee: Number(b.shippingFee) || 0,
            freeShippingOver: Number(b.freeShippingOver) || 0,
            stripe: {
              enabled: Boolean(b.stripe?.enabled),
              mode: b.stripe?.mode === 'live' ? 'live' : 'test',
              publishableKey: String(b.stripe?.publishableKey || '').trim(),
            },
            phone: String(b.phone || '').trim(),
            address: String(b.address || '').trim(),
            description: String(b.description || '').trim(),
          };
          await saveConfig(env, next);
          return json({ ok: true, store: next });
        }
      }

      // 5. SERVE SELF-CONTAINED SELLER PANEL UI
      if (path === '/' && req.method === 'GET') {
        return new Response(SELLER_HTML, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      return json({ ok: false, error: 'Not Found' }, 404);
    } catch (err) {
      return json({ ok: false, error: err?.message || 'Worker error' }, 500);
    }
  },
};

const SELLER_HTML = ${JSON.stringify(getSellerWorkerHtml())};
`;
}

function getSellerWorkerHtml() {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>پنل فروش اختصاصی | کلودفلر D1</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Vazirmatn', Tahoma, sans-serif; background: #f5f5f7; color: #1d1d1f; }
  </style>
</head>
<body class="min-h-screen">
  <div id="app"></div>
  <script>
    const state = {
      pin: localStorage.getItem('cf_seller_pin') || '',
      store: null,
      products: [],
      orders: [],
      tab: 'overview',
      editingProduct: null,
    };

    async function api(path, opts = {}) {
      const res = await fetch(path, {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          'x-seller-pin': state.pin,
          ...(opts.headers || {}),
        },
      });
      return res.json();
    }

    async function loadAll() {
      if (!state.pin) return render();
      const res = await api('/api/admin/overview');
      if (res.ok) {
        state.store = res.store;
        state.products = res.products || [];
        state.orders = res.orders || [];
      } else {
        state.pin = '';
        localStorage.removeItem('cf_seller_pin');
      }
      render();
    }

    window.doLogin = async (e) => {
      e.preventDefault();
      const pin = document.getElementById('pinInput').value.trim();
      const res = await api('/api/admin/auth', { method: 'POST', body: JSON.stringify({ pinCode: pin }) });
      if (!res.ok) return alert(res.error || 'رمز اشتباه است');
      state.pin = pin.toUpperCase();
      localStorage.setItem('cf_seller_pin', state.pin);
      loadAll();
    };

    window.setTab = (t) => { state.tab = t; render(); };
    window.doLogout = () => { state.pin = ''; state.store = null; localStorage.removeItem('cf_seller_pin'); render(); };

    window.copyApi = async () => {
      const u = location.origin + '/api/storefront?key=' + state.store.apiKey;
      await navigator.clipboard.writeText(u);
      alert('لینک API کپی شد! این لینک را در فرم ثبت آگهی لینک شو وارد کنید.');
    };

    window.saveProduct = async (e) => {
      e.preventDefault();
      const payload = {
        id: state.editingProduct?.id || null,
        title: document.getElementById('pTitle').value,
        category: document.getElementById('pCat').value,
        price: Number(document.getElementById('pPrice').value) || 0,
        image: document.getElementById('pImg').value,
        description: document.getElementById('pDesc').value,
        available: true,
      };
      await api('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
      state.editingProduct = null;
      document.getElementById('prodModal').classList.add('hidden');
      loadAll();
    };

    window.delProduct = async (id) => {
      if (!confirm('محصول حذف شود؟')) return;
      await api('/api/admin/products?id=' + encodeURIComponent(id), { method: 'DELETE' });
      loadAll();
    };

    window.toggleProduct = async (id) => {
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      await api('/api/admin/products', { method: 'POST', body: JSON.stringify({ ...p, available: !p.available }) });
      loadAll();
    };

    window.updateOrderStatus = async (id, status) => {
      await api('/api/admin/orders', { method: 'PUT', body: JSON.stringify({ id, status }) });
      loadAll();
    };

    window.saveSettings = async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('sName').value,
        currency: document.getElementById('sCur').value,
        shippingFee: Number(document.getElementById('sShip').value) || 0,
        freeShippingOver: Number(document.getElementById('sFree').value) || 0,
        phone: document.getElementById('sPhone').value,
        address: document.getElementById('sAddr').value,
        stripe: {
          enabled: document.getElementById('sStripeOn').checked,
          mode: document.getElementById('sStripeMode').value,
          publishableKey: document.getElementById('sStripePk').value,
        },
      };
      const res = await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) });
      if (res.ok) alert('تنظیمات با موفقیت در دیتابیس D1 ذخیره شد!');
      loadAll();
    };

    window.openAddModal = (prod = null) => {
      state.editingProduct = prod;
      document.getElementById('pTitle').value = prod?.title || '';
      document.getElementById('pCat').value = prod?.category || '';
      document.getElementById('pPrice').value = prod?.price || '';
      document.getElementById('pImg').value = prod?.image || '';
      document.getElementById('pDesc').value = prod?.description || '';
      document.getElementById('prodModal').classList.remove('hidden');
    };

    function render() {
      const root = document.getElementById('app');
      if (!state.store) {
        root.innerHTML = \`
          <div class="min-h-screen flex items-center justify-center p-4">
            <form onsubmit="doLogin(event)" class="w-full max-w-sm bg-white rounded-3xl border border-stone-200 p-6 shadow-xl space-y-4">
              <h1 class="text-lg font-black text-center">ورود به پنل فروش کلودفلر</h1>
              <p class="text-xs text-stone-500 text-center">رمز ورود (PIN) فروشگاه خود را وارد کنید</p>
              <input id="pinInput" type="password" dir="ltr" required placeholder="PIN" class="w-full h-11 rounded-2xl bg-stone-100 border px-4 text-center font-mono" />
              <button type="submit" class="w-full h-11 rounded-full bg-blue-600 text-white text-xs font-bold">ورود به پنل</button>
            </form>
          </div>\`;
        return;
      }

      const s = state.store;
      const totalSales = state.orders.filter(o => o.status !== 'cancelled').reduce((a, b) => a + (Number(b.totalAmount) || 0), 0);
      const pending = state.orders.filter(o => o.status === 'pending').length;
      const apiUrl = location.origin + '/api/storefront?key=' + s.apiKey;

      root.innerHTML = \`
        <header class="bg-white border-b px-4 h-16 flex items-center justify-between sticky top-0 z-20">
          <div class="flex items-center gap-2">
            <span class="h-9 w-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center">ف</span>
            <div>
              <h1 class="text-sm font-black">\${s.name}</h1>
              <p class="text-[10px] text-stone-500">Cloudflare Worker + D1 Database</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="openAddModal()" class="h-9 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold">+ افزودن محصول</button>
            <button onclick="doLogout()" class="h-9 px-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">خروج</button>
          </div>
        </header>
        <main class="max-w-5xl mx-auto p-4 space-y-4">
          <div class="flex gap-2 bg-white p-1.5 rounded-2xl border overflow-x-auto">
            <button onclick="setTab('overview')" class="px-4 h-9 rounded-xl text-xs font-bold \${state.tab==='overview'?'bg-zinc-900 text-white':'text-stone-600'}">داشبورد و API</button>
            <button onclick="setTab('products')" class="px-4 h-9 rounded-xl text-xs font-bold \${state.tab==='products'?'bg-zinc-900 text-white':'text-stone-600'}">محصولات (\${state.products.length})</button>
            <button onclick="setTab('orders')" class="px-4 h-9 rounded-xl text-xs font-bold \${state.tab==='orders'?'bg-zinc-900 text-white':'text-stone-600'}">سفارش‌ها (\${state.orders.length})</button>
            <button onclick="setTab('settings')" class="px-4 h-9 rounded-xl text-xs font-bold \${state.tab==='settings'?'bg-zinc-900 text-white':'text-stone-600'}">ارسال و Stripe</button>
          </div>

          \${state.tab === 'overview' ? \`
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="bg-white p-4 rounded-2xl border"><span class="text-xs text-stone-500">فروش کل</span><div class="text-lg font-black mt-1" dir="ltr">\${totalSales} \${s.currency}</div></div>
              <div class="bg-white p-4 rounded-2xl border"><span class="text-xs text-stone-500">سفارش جدید</span><div class="text-lg font-black text-amber-600 mt-1">\${pending}</div></div>
              <div class="bg-white p-4 rounded-2xl border"><span class="text-xs text-stone-500">هزینه ارسال</span><div class="text-lg font-black mt-1" dir="ltr">\${s.shippingFee || 0} \${s.currency}</div></div>
              <div class="bg-white p-4 rounded-2xl border"><span class="text-xs text-stone-500">درگاه Stripe</span><div class="text-sm font-black mt-1">\${s.stripe?.enabled ? 'فعال' : 'غیرفعال'}</div></div>
            </div>
            <div class="bg-white p-5 rounded-3xl border space-y-3">
              <h2 class="text-sm font-black">لینک API اتصال به آگهی‌های لینک شو</h2>
              <div class="flex gap-2">
                <input readonly dir="ltr" value="\${apiUrl}" class="flex-1 h-10 rounded-xl bg-stone-100 border px-3 text-xs font-mono" />
                <button onclick="copyApi()" class="h-10 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold">کپی API</button>
              </div>
            </div>
          \` : ''}

          \${state.tab === 'products' ? \`
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              \${state.products.map(p => \`
                <div class="bg-white p-4 rounded-2xl border space-y-2">
                  <div class="flex gap-3 items-center">
                    \${p.image ? \`<img src="\${p.image}" class="w-14 h-14 rounded-xl object-cover border" />\` : ''}
                    <div class="min-w-0 flex-1">
                      <span class="text-[10px] text-blue-600 font-bold">\${p.category}</span>
                      <h3 class="text-xs font-bold truncate">\${p.title}</h3>
                      <p class="text-xs font-black text-emerald-700" dir="ltr">\${p.price} \${s.currency}</p>
                    </div>
                  </div>
                  <div class="flex justify-between pt-2 border-t">
                    <button onclick="toggleProduct('\${p.id}')" class="text-[11px] font-bold px-2 py-0.5 rounded-full \${p.available?'bg-emerald-50 text-emerald-700':'bg-stone-100 text-stone-500'}">\${p.available?'موجود':'ناموجود'}</button>
                    <div class="flex gap-2">
                      <button onclick='openAddModal(\${JSON.stringify(p)})' class="text-xs text-blue-600 font-bold">ویرایش</button>
                      <button onclick="delProduct('\${p.id}')" class="text-xs text-rose-600 font-bold">حذف</button>
                    </div>
                  </div>
                </div>
              \`).join('')}
            </div>
          \` : ''}

          \${state.tab === 'orders' ? \`
            <div class="space-y-3">
              \${state.orders.map(o => \`
                <div class="bg-white p-4 rounded-2xl border space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="font-mono text-xs font-black">\${o.id} • \${o.customerName} (\${o.customerPhone})</span>
                    <span class="text-sm font-black text-emerald-700" dir="ltr">\${o.totalAmount} \${o.currency}</span>
                  </div>
                  <div class="text-xs text-stone-600">\${(o.items||[]).map(i => i.title + ' × ' + i.qty).join(' | ')}</div>
                  <div class="flex justify-between items-center pt-2 border-t">
                    <span class="text-[11px] font-bold">\${o.paymentMethod === 'stripe' ? 'پرداخت آنلاین Stripe' : 'پرداخت در محل'}</span>
                    <select onchange="updateOrderStatus('\${o.id}', this.value)" class="h-8 rounded-lg border px-2 text-xs font-bold">
                      <option value="pending" \${o.status==='pending'?'selected':''}>در انتظار</option>
                      <option value="preparing" \${o.status==='preparing'?'selected':''}>در حال آماده‌سازی</option>
                      <option value="shipped" \${o.status==='shipped'?'selected':''}>ارسال شد</option>
                      <option value="completed" \${o.status==='completed'?'selected':''}>تکمیل شده</option>
                    </select>
                  </div>
                </div>
              \`).join('')}
            </div>
          \` : ''}

          \${state.tab === 'settings' ? \`
            <form onsubmit="saveSettings(event)" class="bg-white p-5 rounded-3xl border space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label class="text-xs font-bold block mb-1">نام فروشگاه</label><input id="sName" value="\${s.name}" class="w-full h-10 rounded-xl border px-3 text-xs" /></div>
                <div><label class="text-xs font-bold block mb-1">واحد پول</label><input id="sCur" value="\${s.currency}" class="w-full h-10 rounded-xl border px-3 text-xs" /></div>
                <div><label class="text-xs font-bold block mb-1">هزینه ارسال</label><input id="sShip" type="number" value="\${s.shippingFee||0}" class="w-full h-10 rounded-xl border px-3 text-xs" /></div>
                <div><label class="text-xs font-bold block mb-1">ارسال رایگان بالای</label><input id="sFree" type="number" value="\${s.freeShippingOver||0}" class="w-full h-10 rounded-xl border px-3 text-xs" /></div>
                <div><label class="text-xs font-bold block mb-1">تلفن</label><input id="sPhone" value="\${s.phone||''}" class="w-full h-10 rounded-xl border px-3 text-xs" /></div>
                <div><label class="text-xs font-bold block mb-1">آدرس</label><input id="sAddr" value="\${s.address||''}" class="w-full h-10 rounded-xl border px-3 text-xs" /></div>
              </div>
              <div class="p-4 rounded-2xl bg-stone-50 border space-y-3">
                <label class="flex items-center gap-2 text-xs font-bold"><input id="sStripeOn" type="checkbox" \${s.stripe?.enabled?'checked':''} /> فعال‌سازی درگاه Stripe</label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select id="sStripeMode" class="h-10 rounded-xl border px-3 text-xs"><option value="test" \${s.stripe?.mode!=='live'?'selected':''}>Test Mode</option><option value="live" \${s.stripe?.mode==='live'?'selected':''}>Live Mode</option></select>
                  <input id="sStripePk" dir="ltr" value="\${s.stripe?.publishableKey||''}" placeholder="pk_test_... / pk_live_..." class="h-10 rounded-xl border px-3 text-xs font-mono" />
                </div>
              </div>
              <button type="submit" class="h-10 px-6 rounded-full bg-zinc-900 text-white text-xs font-bold">ذخیره تنظیمات</button>
            </form>
          \` : ''}
        </main>

        <div id="prodModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onsubmit="saveProduct(event)" class="w-full max-w-md bg-white rounded-3xl p-5 space-y-3">
            <h3 class="text-sm font-black">ثبت / ویرایش محصول</h3>
            <input id="pTitle" required placeholder="نام محصول" class="w-full h-10 rounded-xl border px-3 text-xs" />
            <div class="grid grid-cols-2 gap-2">
              <input id="pCat" placeholder="دسته‌بندی" class="h-10 rounded-xl border px-3 text-xs" />
              <input id="pPrice" type="number" required placeholder="قیمت" class="h-10 rounded-xl border px-3 text-xs" />
            </div>
            <input id="pImg" dir="ltr" placeholder="لینک تصویر (https://...)" class="w-full h-10 rounded-xl border px-3 text-xs font-mono" />
            <textarea id="pDesc" placeholder="توضیحات" class="w-full rounded-xl border p-2.5 text-xs"></textarea>
            <div class="flex justify-end gap-2">
              <button type="button" onclick="document.getElementById('prodModal').classList.add('hidden')" class="h-9 px-4 rounded-full bg-stone-100 text-xs font-bold">انصراف</button>
              <button type="submit" class="h-9 px-5 rounded-full bg-blue-600 text-white text-xs font-bold">ذخیره</button>
            </div>
          </form>
        </div>\`;
    }

    loadAll();
  </script>
</body>
</html>`;
}
