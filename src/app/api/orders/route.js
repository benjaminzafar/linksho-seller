import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getStoreByApiKey, saveStoreRecord } from '@/lib/supabase';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const apiKey = String(body.apiKey || '').trim();
    const customerName = String(body.customerName || '').trim();
    const customerPhone = String(body.customerPhone || '').trim();
    const customerAddress = String(body.customerAddress || '').trim();
    const note = String(body.note || '').trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!apiKey || !customerName || !customerPhone || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'اطلاعات مشتری و حداقل یک محصول برای ثبت سفارش الزامی است.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const store = await getStoreByApiKey(apiKey);
    if (!store) {
      return NextResponse.json(
        { ok: false, error: 'فروشگاه معتبر یافت نشد.' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const storeProducts = Array.isArray(store.products) ? store.products : [];
    let subtotal = 0;
    const normalizedItems = items
      .map((item) => {
        const matched = storeProducts.find((p) => p.id === item.productId);
        const qty = Math.max(1, Math.min(99, Number(item.qty) || 1));
        const unitPrice = matched ? Number(matched.price) || 0 : Number(item.price) || 0;
        subtotal += unitPrice * qty;
        return {
          productId: item.productId,
          title: matched?.title || item.title || 'محصول',
          qty,
          unitPrice,
        };
      })
      .filter((i) => i.qty > 0);

    const deliveryType = body.deliveryType === 'pickup' ? 'pickup' : 'delivery';
    const baseShipping = Number(store.shippingFee) || 0;
    const freeOver = Number(store.freeShippingOver) || 0;
    const shippingFee =
      deliveryType === 'pickup' || (freeOver > 0 && subtotal >= freeOver)
        ? 0
        : baseShipping;
    const totalAmount = subtotal + shippingFee;

    const paymentMethod = body.paymentMethod === 'stripe' ? 'stripe' : 'cash_on_delivery';
    const paymentStatus = paymentMethod === 'stripe' && body.paymentPaid ? 'paid' : 'unpaid';

    const order = {
      id: `ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      customerName,
      customerPhone,
      customerAddress,
      deliveryType,
      note,
      items: normalizedItems,
      subtotal,
      shippingFee,
      totalAmount,
      currency: store.currency || 'SEK',
      paymentMethod,
      paymentStatus,
      status: 'pending',
      source: body.source || 'ad_storefront',
      createdAt: new Date().toISOString(),
    };

    const updatedStore = {
      ...store,
      orders: [order, ...(Array.isArray(store.orders) ? store.orders : [])].slice(0, 200),
      updatedAt: new Date().toISOString(),
    };

    await saveStoreRecord(updatedStore);
    return NextResponse.json({ ok: true, order }, { status: 201, headers: CORS_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'خطا در ثبت سفارش' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
