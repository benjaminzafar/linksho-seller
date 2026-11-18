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

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInPolygon(point, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function checkDeliveryEligibility(cfg, lat, lng) {
  const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const maxKm = Math.max(1, Number(cfg.maxDeliveryKm) || 10);
  const baseFee = Number(cfg.shippingFee) || 0;
  if (!hasCoords) {
    return { deliverable: true, distanceKm: null, matchedZone: null, shippingFee: baseFee };
  }
  const pt = [Number(lat), Number(lng)];
  const zones = Array.isArray(cfg.deliveryZones) ? cfg.deliveryZones : [];
  for (const z of zones) {
    if (pointInPolygon(pt, z.points)) {
      return {
        deliverable: true,
        distanceKm: null,
        matchedZone: { id: z.id, name: z.name, price: Number(z.price) || 0, estTime: z.estTime || '' },
        shippingFee: Number(z.price) ?? baseFee,
      };
    }
  }
  const center = Array.isArray(cfg.centerCoords) && cfg.centerCoords.length === 2
    ? cfg.centerCoords
    : [59.3293, 18.0686];
  const distanceKm = Number(haversineKm(center[0], center[1], pt[0], pt[1]).toFixed(2));
  return {
    deliverable: distanceKm <= maxKm,
    distanceKm,
    matchedZone: null,
    shippingFee: baseFee,
  };
}

async function sendTelegramMessage(cfg, text) {
  const botToken = String(cfg?.telegram?.botToken || '').trim();
  const chatId = String(cfg?.telegram?.chatId || '').trim();
  if (!botToken || !chatId) return { ok: false, skipped: true, reason: 'Telegram not configured' };
  try {
    const res = await fetch(\`https://api.telegram.org/bot\${botToken}/sendMessage\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: Boolean(res.ok && data.ok), data };
  } catch (err) {
    return { ok: false, error: err?.message || 'Telegram request failed' };
  }
}

async function sendEmailNotification(cfg, subject, textBody) {
  const smtp = cfg?.smtp || {};
  const webhookUrl = String(smtp.webhookUrl || '').trim();
  const resendKey = String(smtp.resendApiKey || '').trim();
  const toEmail = String(cfg?.email || smtp.fromEmail || '').trim();
  if (!toEmail) return { ok: false, skipped: true };

  try {
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: \`Bearer \${resendKey}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: smtp.fromEmail || toEmail,
          to: [toEmail],
          subject,
          text: textBody,
        }),
      });
      return { ok: res.ok };
    }
    if (webhookUrl) {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          from: smtp.fromEmail || toEmail,
          smtp: { host: smtp.host, port: smtp.port, security: smtp.security, username: smtp.username },
          subject,
          text: textBody,
        }),
      });
      return { ok: res.ok };
    }
    return { ok: false, skipped: true };
  } catch {
    return { ok: false };
  }
}

function formatOrderTelegramHtml(cfg, order, title = 'New Order') {
  const lines = (order.items || [])
    .map((i) => \`• \${i.qty}x \${i.title} — \${i.qty * i.unitPrice} \${order.currency}\`)
    .join('\\n');
  const typeLabel = order.deliveryType === 'pickup' ? 'Takeaway / Pickup' : 'Delivery';
  return [
    \`🍽 <b>\${title} — \${cfg.name}</b>\`,
    \`🆔 <b>\${order.id}</b> (\${typeLabel})\`,
    \`👤 \${order.customerName} | 📞 \${order.customerPhone}\`,
    order.customerAddress ? \`📍 \${order.customerAddress}\` : '',
    lines,
    \`💳 <b>Total: \${order.totalAmount} \${order.currency}</b> (\${order.paymentMethod === 'stripe' ? 'Stripe: ' + order.paymentStatus : 'Pay on delivery/pickup'})\`,
  ].filter(Boolean).join('\\n');
}

function encodeFormParams(obj, prefix = '') {
  const pairs = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? \`\${prefix}[\${k}]\` : k;
    if (Array.isArray(v)) {
      v.forEach((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          pairs.push(...encodeFormParams(item, \`\${key}[\${idx}]\`));
        } else {
          pairs.push([\`\${key}[\${idx}]\`, String(item)]);
        }
      });
    } else if (typeof v === 'object') {
      pairs.push(...encodeFormParams(v, key));
    } else {
      pairs.push([key, String(v)]);
    }
  }
  return pairs;
}

async function stripeRequest(secretKey, endpoint, method = 'POST', payload = null) {
  const headers = { Authorization: \`Bearer \${secretKey}\` };
  let body;
  if (payload && method !== 'GET') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const params = new URLSearchParams();
    for (const [k, v] of encodeFormParams(payload)) {
      params.append(k, v);
    }
    body = params.toString();
  }
  const res = await fetch(\`https://api.stripe.com/v1\${endpoint}\`, { method, headers, body });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && !data.error, status: res.status, data };
}

async function buildAuthoritativeOrder(env, cfg, body) {
  const customerName = String(body.customerName || '').trim();
  const customerPhone = String(body.customerPhone || '').trim();
  const items = Array.isArray(body.items) ? body.items : [];
  if (!customerName || !customerPhone || items.length === 0) {
    return { error: 'Customer name, phone, and at least one item are required.', status: 400 };
  }

  const deliveryType = body.deliveryType === 'pickup' ? 'pickup' : 'delivery';
  if (deliveryType === 'delivery' && cfg.deliveryEnabled === false) {
    return { error: 'Delivery is currently disabled for this restaurant.', status: 400 };
  }
  if (deliveryType === 'pickup' && cfg.pickupEnabled === false) {
    return { error: 'Takeaway is currently disabled for this restaurant.', status: 400 };
  }

  const { results: dbProducts } = await env.DB.prepare('SELECT id, title, price FROM products').all();
  let subtotal = 0;
  const normalized = items.map((it) => {
    const matched = (dbProducts || []).find((p) => p.id === it.productId || p.title === it.title);
    const qty = Math.max(1, Math.min(99, Number(it.qty) || 1));
    const unitPrice = matched ? Number(matched.price) || 0 : Number(it.price) || 0;
    subtotal += unitPrice * qty;
    return { productId: it.productId || matched?.id || '', title: matched?.title || it.title || 'Item', qty, unitPrice };
  });

  let discountAmount = 0;
  const code = String(body.discountCode || '').trim().toUpperCase();
  if (code && Array.isArray(cfg.coupons)) {
    const coupon = cfg.coupons.find((c) => c.active && String(c.code || '').toUpperCase() === code);
    if (coupon && Number(coupon.percent) > 0) {
      discountAmount = Math.round((subtotal * Number(coupon.percent)) / 100);
    }
  }

  let shippingFee = 0;
  if (deliveryType === 'delivery') {
    const elig = checkDeliveryEligibility(cfg, body.lat, body.lng);
    if (!elig.deliverable) {
      return {
        error: \`Address is outside the restaurant delivery area (\${elig.distanceKm} km > \${cfg.maxDeliveryKm || 10} km max).\`,
        status: 400,
      };
    }
    const freeOver = Number(cfg.freeShippingOver) || 0;
    shippingFee = freeOver > 0 && subtotal >= freeOver ? 0 : elig.shippingFee;
  }

  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);
  return {
    orderId: 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    customerName,
    customerPhone,
    customerAddress: String(body.customerAddress || (deliveryType === 'pickup' ? 'Takeaway at restaurant' : '')).trim(),
    deliveryType,
    items: normalized,
    subtotal,
    discountAmount,
    shippingFee,
    totalAmount,
    currency: cfg.currency || 'SEK',
    createdAt: new Date().toISOString(),
  };
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    try {
      // 1. PUBLIC STOREFRONT REST API (Menu, Categories, Delivery Zones, Stripe Publishable Key)
      if (path === '/api/storefront' && req.method === 'GET') {
        const cfg = await getConfig(env);
        if (!cfg) return json({ ok: false, error: 'Restaurant not initialized' }, 404);
        const key = (url.searchParams.get('key') || '').trim();
        if (!key || key !== cfg.apiKey) {
          return json({ ok: false, error: 'Invalid API key' }, 401);
        }
        const { results } = await env.DB.prepare(
          'SELECT id, title, category, price, image, description, available FROM products WHERE available = 1 ORDER BY created_at DESC'
        ).all();
        const productsList = results || [];
        const cats = Array.isArray(cfg.categories) && cfg.categories.length
          ? cfg.categories
          : Array.from(new Set(productsList.map((p) => p.category).filter(Boolean)));
        return json({
          ok: true,
          store: {
            id: cfg.id,
            name: cfg.name,
            type: 'restaurant',
            isOpen: cfg.isOpen !== false,
            logoUrl: cfg.logoUrl || '',
            bannerUrl: cfg.bannerUrl || '',
            brandColor: cfg.brandColor || '#0066CC',
            currency: cfg.currency || 'SEK',
            shippingFee: Number(cfg.shippingFee) || 0,
            freeShippingOver: Number(cfg.freeShippingOver) || 0,
            minOrder: Number(cfg.minOrder) || 0,
            maxDeliveryKm: Number(cfg.maxDeliveryKm) || 10,
            centerCoords: cfg.centerCoords || [59.3293, 18.0686],
            deliveryEnabled: cfg.deliveryEnabled !== false,
            pickupEnabled: cfg.pickupEnabled !== false,
            openingHours: cfg.openingHours || '',
            deliveryZones: cfg.deliveryZones || [],
            stripe: {
              enabled: Boolean(cfg.stripe?.enabled),
              mode: cfg.stripe?.mode === 'live' ? 'live' : 'test',
              publishableKey: cfg.stripe?.publishableKey || '',
            },
            phone: cfg.phone || '',
            address: cfg.address || '',
            instagram: cfg.instagram || '',
            receiptNote: cfg.receiptNote || '',
          },
          categories: cats,
          products: productsList,
        }, 200, { 'Cache-Control': 'public, max-age=15' });
      }

      // 1b. PUBLIC DELIVERY ELIGIBILITY CHECK
      if (path === '/api/delivery/check' && req.method === 'POST') {
        const body = await req.json();
        const cfg = await getConfig(env);
        if (!cfg || !body.apiKey || body.apiKey !== cfg.apiKey) {
          return json({ ok: false, error: 'Invalid API key' }, 401);
        }
        const elig = checkDeliveryEligibility(cfg, body.lat, body.lng);
        return json({ ok: true, ...elig, maxDeliveryKm: Number(cfg.maxDeliveryKm) || 10 });
      }

      // 2. PUBLIC CUSTOMER ORDER API (Cash / Pre-paid Order)
      if (path === '/api/orders' && req.method === 'POST') {
        const body = await req.json();
        const cfg = await getConfig(env);
        if (!cfg || !body.apiKey || body.apiKey !== cfg.apiKey) {
          return json({ ok: false, error: 'Invalid API key' }, 401);
        }
        const built = await buildAuthoritativeOrder(env, cfg, body);
        if (built.error) return json({ ok: false, error: built.error }, built.status || 400);

        const paymentMethod = body.paymentMethod === 'stripe' ? 'stripe' : 'cash_on_delivery';
        const paymentStatus = paymentMethod === 'stripe' && body.paymentPaid ? 'paid' : 'unpaid';

        await env.DB.prepare(
          'INSERT INTO orders (id, customer_name, customer_phone, customer_address, delivery_type, items_json, subtotal, shipping_fee, total_amount, currency, payment_method, payment_status, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          built.orderId,
          built.customerName,
          built.customerPhone,
          built.customerAddress,
          built.deliveryType,
          JSON.stringify(built.items),
          built.subtotal,
          built.shippingFee,
          built.totalAmount,
          built.currency,
          paymentMethod,
          paymentStatus,
          'pending',
          built.createdAt
        ).run();

        const notifyObj = { ...built, id: built.orderId, paymentMethod, paymentStatus };
        const tgMsg = formatOrderTelegramHtml(cfg, notifyObj, 'New Order');
        const notifyPromise = Promise.all([
          sendTelegramMessage(cfg, tgMsg),
          sendEmailNotification(cfg, \`New Order \${built.orderId} - \${cfg.name}\`, tgMsg.replace(/<[^>]+>/g, '')),
        ]);
        if (ctx?.waitUntil) ctx.waitUntil(notifyPromise);
        else await notifyPromise;

        return json({
          ok: true,
          order: {
            id: built.orderId,
            customerName: built.customerName,
            customerPhone: built.customerPhone,
            deliveryType: built.deliveryType,
            subtotal: built.subtotal,
            discountAmount: built.discountAmount,
            shippingFee: built.shippingFee,
            totalAmount: built.totalAmount,
            currency: built.currency,
            paymentMethod,
            paymentStatus,
            status: 'pending',
            prepMinutes: null,
            estimatedReadyAt: null,
            createdAt: built.createdAt,
          },
        }, 201);
      }

      // 2b. STRIPE CHECKOUT SESSION API (Creates pending order + Stripe hosted checkout URL)
      if (path === '/api/stripe/checkout' && req.method === 'POST') {
        const body = await req.json();
        const cfg = await getConfig(env);
        if (!cfg || !body.apiKey || body.apiKey !== cfg.apiKey) {
          return json({ ok: false, error: 'Invalid API key' }, 401);
        }
        const secretKey = String(cfg.stripe?.secretKey || '').trim();
        if (!cfg.stripe?.enabled || !secretKey) {
          return json({ ok: false, error: 'Stripe is not configured for this restaurant.' }, 400);
        }

        const built = await buildAuthoritativeOrder(env, cfg, body);
        if (built.error) return json({ ok: false, error: built.error }, built.status || 400);

        const successUrl = String(body.successUrl || url.origin + '/?paid=1&order=' + built.orderId).trim();
        const cancelUrl = String(body.cancelUrl || url.origin + '/?cancelled=1').trim();
        const sep = successUrl.includes('?') ? '&' : '?';
        const finalSuccessUrl = \`\${successUrl}\${sep}session_id={CHECKOUT_SESSION_ID}&order_id=\${built.orderId}\`;

        const currencyLower = String(built.currency || 'SEK').toLowerCase();
        const lineItems = built.items.map((item) => ({
          price_data: {
            currency: currencyLower,
            product_data: { name: item.title },
            unit_amount: Math.max(100, Math.round(item.unitPrice * 100)),
          },
          quantity: item.qty,
        }));
        if (built.shippingFee > 0) {
          lineItems.push({
            price_data: {
              currency: currencyLower,
              product_data: { name: 'Delivery Fee' },
              unit_amount: Math.round(built.shippingFee * 100),
            },
            quantity: 1,
          });
        }

        const stripeRes = await stripeRequest(secretKey, '/checkout/sessions', 'POST', {
          mode: 'payment',
          success_url: finalSuccessUrl,
          cancel_url: cancelUrl,
          line_items: lineItems,
          metadata: { orderId: built.orderId, storeId: cfg.id },
        });

        if (!stripeRes.ok || !stripeRes.data?.url) {
          return json({
            ok: false,
            error: stripeRes.data?.error?.message || 'Failed to create Stripe Checkout session.',
          }, 400);
        }

        await env.DB.prepare(
          'INSERT INTO orders (id, customer_name, customer_phone, customer_address, delivery_type, items_json, subtotal, shipping_fee, total_amount, currency, payment_method, payment_status, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          built.orderId,
          built.customerName,
          built.customerPhone,
          built.customerAddress,
          built.deliveryType,
          JSON.stringify(built.items),
          built.subtotal,
          built.shippingFee,
          built.totalAmount,
          built.currency,
          'stripe',
          'unpaid',
          'pending',
          built.createdAt
        ).run();

        return json({
          ok: true,
          orderId: built.orderId,
          sessionId: stripeRes.data.id,
          checkoutUrl: stripeRes.data.url,
          totalAmount: built.totalAmount,
          currency: built.currency,
        });
      }

      // 2c. STRIPE PAYMENT INTENT API (For custom Stripe Elements frontends)
      if (path === '/api/stripe/payment-intent' && req.method === 'POST') {
        const body = await req.json();
        const cfg = await getConfig(env);
        if (!cfg || !body.apiKey || body.apiKey !== cfg.apiKey) {
          return json({ ok: false, error: 'Invalid API key' }, 401);
        }
        const secretKey = String(cfg.stripe?.secretKey || '').trim();
        if (!cfg.stripe?.enabled || !secretKey) {
          return json({ ok: false, error: 'Stripe is not configured for this restaurant.' }, 400);
        }
        const built = await buildAuthoritativeOrder(env, cfg, body);
        if (built.error) return json({ ok: false, error: built.error }, built.status || 400);

        const stripeRes = await stripeRequest(secretKey, '/payment_intents', 'POST', {
          amount: Math.max(100, Math.round(built.totalAmount * 100)),
          currency: String(built.currency || 'SEK').toLowerCase(),
          'automatic_payment_methods[enabled]': 'true',
          metadata: { orderId: built.orderId, storeId: cfg.id },
        });

        if (!stripeRes.ok || !stripeRes.data?.client_secret) {
          return json({
            ok: false,
            error: stripeRes.data?.error?.message || 'Failed to create Stripe PaymentIntent.',
          }, 400);
        }

        await env.DB.prepare(
          'INSERT INTO orders (id, customer_name, customer_phone, customer_address, delivery_type, items_json, subtotal, shipping_fee, total_amount, currency, payment_method, payment_status, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          built.orderId,
          built.customerName,
          built.customerPhone,
          built.customerAddress,
          built.deliveryType,
          JSON.stringify(built.items),
          built.subtotal,
          built.shippingFee,
          built.totalAmount,
          built.currency,
          'stripe',
          'unpaid',
          'pending',
          built.createdAt
        ).run();

        return json({
          ok: true,
          orderId: built.orderId,
          paymentIntentId: stripeRes.data.id,
          clientSecret: stripeRes.data.client_secret,
          publishableKey: cfg.stripe?.publishableKey || '',
          totalAmount: built.totalAmount,
          currency: built.currency,
        });
      }

      // 2d. STRIPE PAYMENT VERIFICATION API
      if (path === '/api/stripe/verify' && req.method === 'POST') {
        const body = await req.json();
        const cfg = await getConfig(env);
        if (!cfg || !body.apiKey || body.apiKey !== cfg.apiKey) {
          return json({ ok: false, error: 'Invalid API key' }, 401);
        }
        const secretKey = String(cfg.stripe?.secretKey || '').trim();
        if (!secretKey) return json({ ok: false, error: 'Stripe secret key missing' }, 400);

        let paid = false;
        let orderId = String(body.orderId || '').trim();
        if (body.sessionId) {
          const sRes = await stripeRequest(secretKey, \`/checkout/sessions/\${encodeURIComponent(body.sessionId)}\`, 'GET');
          paid = sRes.ok && sRes.data?.payment_status === 'paid';
          orderId = orderId || sRes.data?.metadata?.orderId || '';
        } else if (body.paymentIntentId) {
          const pRes = await stripeRequest(secretKey, \`/payment_intents/\${encodeURIComponent(body.paymentIntentId)}\`, 'GET');
          paid = pRes.ok && pRes.data?.status === 'succeeded';
          orderId = orderId || pRes.data?.metadata?.orderId || '';
        }

        if (!paid || !orderId) {
          return json({ ok: false, paid: false, error: 'Payment not completed yet.' }, 400);
        }

        await env.DB.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').bind('paid', orderId).run();
        const row = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
        if (row) {
          const notifyObj = {
            id: row.id,
            customerName: row.customer_name,
            customerPhone: row.customer_phone,
            customerAddress: row.customer_address,
            deliveryType: row.delivery_type,
            items: JSON.parse(row.items_json || '[]'),
            totalAmount: row.total_amount,
            currency: row.currency,
            paymentMethod: row.payment_method,
            paymentStatus: 'paid',
          };
          const tgMsg = formatOrderTelegramHtml(cfg, notifyObj, 'Paid Stripe Order');
          const p = sendTelegramMessage(cfg, tgMsg);
          if (ctx?.waitUntil) ctx.waitUntil(p);
          else await p;
        }
        return json({ ok: true, paid: true, orderId });
      }

      // 2e. PUBLIC ORDER STATUS & ESTIMATED PREP TIME (For customer-facing website)
      if (path === '/api/orders/status' && req.method === 'GET') {
        const cfg = await getConfig(env);
        const key = (url.searchParams.get('key') || '').trim();
        const id = (url.searchParams.get('id') || '').trim();
        if (!cfg || !key || key !== cfg.apiKey) {
          return json({ ok: false, error: 'Invalid API key' }, 401);
        }
        if (!id) return json({ ok: false, error: 'Order ID required' }, 400);
        const row = await env.DB.prepare('SELECT id, status, delivery_type, total_amount, currency, payment_status, created_at FROM orders WHERE id = ?').bind(id).first();
        if (!row) return json({ ok: false, error: 'Order not found' }, 404);
        const prepRow = await env.DB.prepare('SELECT value FROM store_config WHERE key = ?').bind('order_prep_' + id).first();
        const prepInfo = prepRow ? JSON.parse(prepRow.value) : {};
        return json({
          ok: true,
          order: {
            id: row.id,
            status: row.status,
            deliveryType: row.delivery_type,
            totalAmount: row.total_amount,
            currency: row.currency,
            paymentStatus: row.payment_status,
            prepMinutes: prepInfo.prepMinutes || null,
            estimatedReadyAt: prepInfo.estimatedReadyAt || null,
            createdAt: row.created_at,
          },
        });
      }

      // 3. SELLER ADMIN AUTH
      if (path === '/api/admin/auth' && req.method === 'POST') {
        const body = await req.json();
        const cfg = await getConfig(env);
        if (!cfg || String(body.pinCode || '').trim().toUpperCase() !== String(cfg.pinCode || '').toUpperCase()) {
          return json({ ok: false, error: 'Invalid PIN code.' }, 401);
        }
        return json({ ok: true, store: { ...cfg, stripe: { ...cfg.stripe, secretKey: cfg.stripe?.secretKey ? 'configured' : '' } } });
      }

      // 4. PROTECTED SELLER ADMIN ROUTES
      if (path.startsWith('/api/admin/')) {
        const cfg = await getConfig(env);
        if (!checkPin(req, cfg)) {
          return json({ ok: false, error: 'Unauthorized' }, 401);
        }

        if (path === '/api/admin/overview' && req.method === 'GET') {
          const [{ results: products }, { results: orders }, { results: prepRows }] = await Promise.all([
            env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all(),
            env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200').all(),
            env.DB.prepare("SELECT key, value FROM store_config WHERE key LIKE 'order_prep_%'").all(),
          ]);
          const prepMap = new Map();
          for (const pr of prepRows || []) {
            try { prepMap.set(pr.key.replace('order_prep_', ''), JSON.parse(pr.value)); } catch {}
          }
          return json({
            ok: true,
            store: {
              ...cfg,
              stripe: {
                enabled: Boolean(cfg.stripe?.enabled),
                mode: cfg.stripe?.mode === 'live' ? 'live' : 'test',
                publishableKey: cfg.stripe?.publishableKey || '',
                hasSecretKey: Boolean(cfg.stripe?.secretKey),
              },
            },
            products: (products || []).map((p) => ({ ...p, available: p.available === 1 })),
            orders: (orders || []).map((o) => {
              const pInfo = prepMap.get(o.id) || {};
              return {
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
                prepMinutes: pInfo.prepMinutes || null,
                estimatedReadyAt: pInfo.estimatedReadyAt || '',
                createdAt: o.created_at,
              };
            }),
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
            String(b.title || b.name || '').trim(),
            String(b.category || 'Main Course').trim(),
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
            if (b.prepMinutes !== undefined || b.estimatedReadyAt !== undefined) {
              await env.DB.prepare('INSERT OR REPLACE INTO store_config (key, value) VALUES (?, ?)')
                .bind('order_prep_' + b.id, JSON.stringify({
                  prepMinutes: Number(b.prepMinutes) || null,
                  estimatedReadyAt: b.estimatedReadyAt || null,
                }))
                .run();
            }
            const statusText = b.status === 'preparing'
              ? \`✅ Order <b>\${b.id}</b> ACCEPTED\${b.prepMinutes ? \` (Ready in \${b.prepMinutes} min\${b.estimatedReadyAt ? ', est. ' + b.estimatedReadyAt : ''})\` : ''}\`
              : b.status === 'cancelled'
                ? \`❌ Order <b>\${b.id}</b> REJECTED\`
                : \`📦 Order <b>\${b.id}</b> status: \${b.status}\`;
            const p = sendTelegramMessage(cfg, statusText);
            if (ctx?.waitUntil) ctx.waitUntil(p);
            else await p;
          }
          return json({ ok: true });
        }

        if (path === '/api/admin/test-telegram' && req.method === 'POST') {
          const b = (await req.json().catch(() => ({}))) || {};
          const testCfg = {
            ...cfg,
            telegram: {
              botToken: String(b.botToken || cfg.telegram?.botToken || '').trim(),
              chatId: String(b.chatId || cfg.telegram?.chatId || '').trim(),
            },
          };
          if (!testCfg.telegram.botToken || !testCfg.telegram.chatId) {
            return json({ ok: false, error: 'Bot Token and Chat ID are required.' }, 400);
          }
          const result = await sendTelegramMessage(testCfg, \`✅ Test notification from <b>\${cfg.name}</b> Worker! Notifications are active.\`);
          if (!result.ok) {
            return json({ ok: false, error: result.data?.description || result.error || 'Telegram API rejected request.' }, 400);
          }
          return json({ ok: true, message: 'Telegram test sent successfully!' });
        }

        if (path === '/api/admin/settings' && req.method === 'PUT') {
          const b = await req.json();
          const next = {
            ...cfg,
            name: b.name ? String(b.name).trim() : cfg.name,
            isOpen: b.isOpen !== undefined ? Boolean(b.isOpen) : cfg.isOpen,
            logoUrl: b.logoUrl !== undefined ? String(b.logoUrl || '') : cfg.logoUrl,
            bannerUrl: b.bannerUrl !== undefined ? String(b.bannerUrl || '') : cfg.bannerUrl,
            brandColor: b.brandColor || cfg.brandColor || '#0066CC',
            currency: b.currency || cfg.currency,
            shippingFee: b.shippingFee !== undefined ? Number(b.shippingFee) || 0 : cfg.shippingFee,
            freeShippingOver: b.freeShippingOver !== undefined ? Number(b.freeShippingOver) || 0 : cfg.freeShippingOver,
            minOrder: b.minOrder !== undefined ? Number(b.minOrder) || 0 : cfg.minOrder,
            maxDeliveryKm: b.maxDeliveryKm !== undefined ? Number(b.maxDeliveryKm) || 10 : cfg.maxDeliveryKm,
            openingHours: b.openingHours !== undefined ? String(b.openingHours || '') : cfg.openingHours,
            deliveryEnabled: b.deliveryEnabled !== undefined ? Boolean(b.deliveryEnabled) : cfg.deliveryEnabled,
            pickupEnabled: b.pickupEnabled !== undefined ? Boolean(b.pickupEnabled) : cfg.pickupEnabled,
            deliveryZones: Array.isArray(b.deliveryZones) ? b.deliveryZones : cfg.deliveryZones,
            categories: Array.isArray(b.categories) ? b.categories : cfg.categories,
            coupons: Array.isArray(b.coupons) ? b.coupons : cfg.coupons,
            telegram: b.telegram ? {
              botToken: String(b.telegram.botToken || '').trim(),
              chatId: String(b.telegram.chatId || '').trim(),
            } : cfg.telegram,
            smtp: b.smtp ? {
              ...cfg.smtp,
              host: String(b.smtp.host || '').trim(),
              port: Number(b.smtp.port) || 587,
              security: String(b.smtp.security || 'TLS'),
              username: String(b.smtp.username || '').trim(),
              fromEmail: String(b.smtp.fromEmail || '').trim(),
              resendApiKey: b.smtp.resendApiKey !== undefined ? String(b.smtp.resendApiKey || '').trim() : cfg.smtp?.resendApiKey,
              webhookUrl: b.smtp.webhookUrl !== undefined ? String(b.smtp.webhookUrl || '').trim() : cfg.smtp?.webhookUrl,
            } : cfg.smtp,
            stripe: {
              enabled: b.stripe?.enabled !== undefined ? Boolean(b.stripe.enabled) : Boolean(cfg.stripe?.enabled),
              mode: b.stripe?.mode === 'live' ? 'live' : 'test',
              publishableKey: b.stripe?.publishableKey !== undefined ? String(b.stripe.publishableKey || '').trim() : (cfg.stripe?.publishableKey || ''),
              secretKey: b.stripe?.secretKey ? String(b.stripe.secretKey).trim() : (cfg.stripe?.secretKey || ''),
            },
            phone: b.phone !== undefined ? String(b.phone || '').trim() : cfg.phone,
            address: b.address !== undefined ? String(b.address || '').trim() : cfg.address,
            instagram: b.instagram !== undefined ? String(b.instagram || '').trim() : cfg.instagram,
            receiptNote: b.receiptNote !== undefined ? String(b.receiptNote || '').trim() : cfg.receiptNote,
          };
          await saveConfig(env, next);
          return json({
            ok: true,
            store: {
              ...next,
              stripe: {
                enabled: next.stripe.enabled,
                mode: next.stripe.mode,
                publishableKey: next.stripe.publishableKey,
                hasSecretKey: Boolean(next.stripe.secretKey),
              },
            },
          });
        }
      }

      // 5. SERVE SELF-CONTAINED WORKER STATUS / ADMIN UI
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
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restaurant Worker API & Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans">
  <div id="app"></div>
  <script>
    const state = {
      pin: localStorage.getItem('cf_seller_pin') || '',
      store: null,
      products: [],
      orders: [],
      tab: 'orders',
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
      if (!res.ok) return alert(res.error || 'Invalid PIN');
      state.pin = pin.toUpperCase();
      localStorage.setItem('cf_seller_pin', state.pin);
      loadAll();
    };

    window.acceptOrder = async (id, mins) => {
      const readyAt = new Date(Date.now() + mins * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await api('/api/admin/orders', { method: 'PUT', body: JSON.stringify({ id, status: 'preparing', prepMinutes: mins, estimatedReadyAt: readyAt }) });
      loadAll();
    };

    window.rejectOrder = async (id) => {
      await api('/api/admin/orders', { method: 'PUT', body: JSON.stringify({ id, status: 'cancelled' }) });
      loadAll();
    };

    window.copyApi = async () => {
      const u = location.origin + '/api/storefront?key=' + state.store.apiKey;
      await navigator.clipboard.writeText(u);
      alert('Storefront REST API URL copied!');
    };

    function render() {
      const root = document.getElementById('app');
      if (!state.store) {
        root.innerHTML = \`
          <div class="min-h-screen flex items-center justify-center p-4">
            <form onsubmit="doLogin(event)" class="w-full max-w-sm bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
              <h1 class="text-lg font-extrabold text-center">Restaurant Worker Panel</h1>
              <p class="text-xs text-stone-500 text-center">Enter your Seller PIN code</p>
              <input id="pinInput" type="password" required placeholder="PIN" class="w-full h-11 rounded-2xl bg-stone-100 border px-4 text-center font-mono" />
              <button type="submit" class="w-full h-11 rounded-full bg-blue-600 text-white text-xs font-bold">Sign In</button>
            </form>
          </div>\`;
        return;
      }
      const s = state.store;
      const apiUrl = location.origin + '/api/storefront?key=' + s.apiKey;
      root.innerHTML = \`
        <header class="bg-white border-b px-4 h-14 flex items-center justify-between">
          <strong class="text-sm">\${s.name}</strong>
          <button onclick="copyApi()" class="h-8 px-3 rounded-full bg-blue-600 text-white text-xs font-bold">Copy Storefront REST API</button>
        </header>
        <main class="max-w-4xl mx-auto p-4 space-y-4">
          <div class="bg-white p-4 rounded-2xl border text-xs font-mono break-all">\${apiUrl}</div>
          <div class="space-y-2">
            \${state.orders.map(o => \`
              <div class="bg-white p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div class="font-bold text-xs">\${o.id} • \${o.customerName} (\${o.deliveryType})</div>
                  <div class="text-xs text-stone-500">\${(o.items||[]).map(i => i.qty + 'x ' + i.title).join(', ')} — \${o.totalAmount} \${o.currency}</div>
                  \${o.prepMinutes ? \`<div class="text-[11px] text-blue-600 font-bold">Ready in \${o.prepMinutes} min (\${o.estimatedReadyAt})</div>\` : ''}
                </div>
                <div class="flex items-center gap-1.5">
                  \${o.status === 'pending' ? \`
                    <button onclick="acceptOrder('\${o.id}', 30)" class="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">Accept 30m</button>
                    <button onclick="acceptOrder('\${o.id}', 40)" class="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">40m</button>
                    <button onclick="acceptOrder('\${o.id}', 60)" class="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">1h</button>
                    <button onclick="rejectOrder('\${o.id}')" class="h-8 px-2.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold">Reject</button>
                  \` : \`<span class="px-2.5 py-1 rounded-full bg-stone-100 text-xs font-bold">\${o.status}</span>\`}
                </div>
              </div>
            \`).join('')}
          </div>
        </main>\`;
    }
    loadAll();
  </script>
</body>
</html>`;
}
