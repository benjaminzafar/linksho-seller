const CF_API = 'https://api.cloudflare.com/client/v4';

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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
  });

  try {
    const query = getQuery(event);
    const workerName = String(query.workerName || '').trim();
    const dbId = String(query.dbId || '').trim();
    const env = event.context.cloudflare?.env || process.env;
    const adminSecret = getHeader(event, 'x-admin-secret') || String(query.secret || '');

    const expectedSecret = String(env.SELLER_ADMIN_SECRET || '').trim();
    if (expectedSecret && adminSecret !== expectedSecret) {
      setResponseStatus(event, 401);
      return { ok: false, error: 'دسترسی غیرمجاز' };
    }

    const cfToken = String(env.CLOUDFLARE_API_TOKEN || '').trim();
    if (!cfToken) {
      setResponseStatus(event, 500);
      return { ok: false, error: 'CLOUDFLARE_API_TOKEN تنظیم نشده است.' };
    }

    let accountId = String(env.CLOUDFLARE_ACCOUNT_ID || '').trim();
    if (!accountId) {
      const accRes = await cfFetch('/accounts?per_page=5', cfToken);
      accountId = accRes.data?.result?.[0]?.id || '';
    }
    if (!accountId) {
      setResponseStatus(event, 400);
      return { ok: false, error: 'Account ID یافت نشد.' };
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

    return { ok: true, deleted: { workerName, dbId } };
  } catch (err) {
    setResponseStatus(event, 500);
    return { ok: false, error: err?.message || 'خطا در حذف سرویس فروشنده' };
  }
});
