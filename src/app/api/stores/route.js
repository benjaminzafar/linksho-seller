import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getStoreById, saveStoreRecord } from '@/lib/supabase';

function generateCode(prefix, len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return prefix ? `${prefix}-${out}` : out;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const mode = body?.mode || 'register';

    if (mode === 'login') {
      const storeId = String(body.storeId || '').trim().toUpperCase();
      const pinCode = String(body.pinCode || '').trim().toUpperCase();
      if (!storeId || !pinCode) {
        return NextResponse.json({ ok: false, error: 'کد فروشگاه و رمز عبور الزامی است.' }, { status: 400 });
      }
      const store = await getStoreById(storeId);
      if (!store || String(store.pinCode).toUpperCase() !== pinCode) {
        return NextResponse.json({ ok: false, error: 'کد فروشگاه یا رمز عبور اشتباه است.' }, { status: 401 });
      }
      return NextResponse.json({ ok: true, store });
    }

    // Register new seller store (Restaurant or Webshop)
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: 'نام فروشگاه یا رستوران را وارد کنید.' }, { status: 400 });
    }

    const storeType = body.type === 'restaurant' ? 'restaurant' : 'webshop';
    const currency = ['SEK', 'NOK', 'DKK', 'EUR'].includes(body.currency) ? body.currency : 'SEK';

    const newStore = {
      id: generateCode('ST', 5),
      pinCode: generateCode('', 6),
      apiKey: `sk_live_${crypto.randomBytes(12).toString('hex')}`,
      name,
      type: storeType,
      currency,
      shippingFee: Math.max(0, Number(body.shippingFee) || 0),
      freeShippingOver: Math.max(0, Number(body.freeShippingOver) || 0),
      stripe: {
        enabled: false,
        mode: 'test',
        publishableKey: '',
      },
      phone: String(body.phone || '').trim(),
      whatsapp: String(body.whatsapp || '').trim(),
      address: String(body.address || '').trim(),
      description: String(body.description || '').trim(),
      products: [],
      orders: [],
      createdAt: new Date().toISOString(),
    };

    await saveStoreRecord(newStore);
    return NextResponse.json({ ok: true, store: newStore }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || 'خطای سرور' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const storeId = String(body.storeId || '').trim().toUpperCase();
    const pinCode = String(body.pinCode || '').trim().toUpperCase();

    if (!storeId || !pinCode) {
      return NextResponse.json({ ok: false, error: 'احراز هویت فروشگاه انجام نشد.' }, { status: 401 });
    }

    const existing = await getStoreById(storeId);
    if (!existing || String(existing.pinCode).toUpperCase() !== pinCode) {
      return NextResponse.json({ ok: false, error: 'دسترسی غیرمجاز.' }, { status: 403 });
    }

    const updated = {
      ...existing,
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing.name,
      type: body.type === 'restaurant' || body.type === 'webshop' ? body.type : existing.type,
      currency: ['SEK', 'NOK', 'DKK', 'EUR'].includes(body.currency) ? body.currency : existing.currency,
      shippingFee: body.shippingFee !== undefined ? Math.max(0, Number(body.shippingFee) || 0) : (Number(existing.shippingFee) || 0),
      freeShippingOver: body.freeShippingOver !== undefined ? Math.max(0, Number(body.freeShippingOver) || 0) : (Number(existing.freeShippingOver) || 0),
      stripe: body.stripe && typeof body.stripe === 'object'
        ? {
            enabled: Boolean(body.stripe.enabled),
            mode: body.stripe.mode === 'live' ? 'live' : 'test',
            publishableKey: String(body.stripe.publishableKey || '').trim(),
          }
        : (existing.stripe || { enabled: false, mode: 'test', publishableKey: '' }),
      phone: typeof body.phone === 'string' ? body.phone.trim() : existing.phone,
      whatsapp: typeof body.whatsapp === 'string' ? body.whatsapp.trim() : existing.whatsapp,
      address: typeof body.address === 'string' ? body.address.trim() : existing.address,
      description: typeof body.description === 'string' ? body.description.trim() : existing.description,
      products: Array.isArray(body.products) ? body.products : existing.products,
      orders: Array.isArray(body.orders) ? body.orders : existing.orders,
      updatedAt: new Date().toISOString(),
    };

    await saveStoreRecord(updated);
    return NextResponse.json({ ok: true, store: updated });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || 'خطای ذخیره‌سازی' }, { status: 500 });
  }
}
