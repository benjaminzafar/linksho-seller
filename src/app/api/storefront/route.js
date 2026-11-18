import { NextResponse } from 'next/server';
import { getStoreByApiKey } from '@/lib/supabase';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { ok: false, error: 'کلید API فروشگاه (key) ارسال نشده است.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const store = await getStoreByApiKey(key);
    if (!store) {
      return NextResponse.json(
        { ok: false, error: 'فروشگاهی با این کلید API یافت نشد.' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const availableProducts = (Array.isArray(store.products) ? store.products : []).filter(
      (p) => p && p.available !== false
    );

    return NextResponse.json(
      {
        ok: true,
        store: {
          id: store.id,
          name: store.name,
          type: store.type,
          currency: store.currency || 'SEK',
          shippingFee: Number(store.shippingFee) || 0,
          freeShippingOver: Number(store.freeShippingOver) || 0,
          stripe: {
            enabled: Boolean(store.stripe?.enabled),
            mode: store.stripe?.mode === 'live' ? 'live' : 'test',
            publishableKey: store.stripe?.publishableKey || '',
          },
          phone: store.phone || '',
          whatsapp: store.whatsapp || '',
          address: store.address || '',
          description: store.description || '',
        },
        products: availableProducts,
      },
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'خطا در دریافت اطلاعات فروشگاه' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
