import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://bezbnymjcnmazdonfzky.supabase.co';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlemJueW1qY25tYXpkb25memt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2OTM1NjksImV4cCI6MjExMDI2OTU2OX0.ylsHBAZ1zo1z_aKpHx7hgl-yZu2yt2puFNhR8jBm6S4';

export const supabase = createClient(supabaseUrl, supabaseKey);

const STORE_KEY_PREFIX = 'seller_store_';
const API_KEY_INDEX_PREFIX = 'seller_apikey_';

export async function getStoreById(storeId) {
  const cleanId = String(storeId || '').trim().toUpperCase();
  if (!cleanId) return null;
  const { data } = await supabase
    .from('swedpersiska_settings')
    .select('value')
    .eq('key', `${STORE_KEY_PREFIX}${cleanId}`)
    .maybeSingle();
  return data?.value || null;
}

export async function getStoreByApiKey(apiKey) {
  const cleanKey = String(apiKey || '').trim();
  if (!cleanKey) return null;

  const { data: idxRow } = await supabase
    .from('swedpersiska_settings')
    .select('value')
    .eq('key', `${API_KEY_INDEX_PREFIX}${cleanKey}`)
    .maybeSingle();

  const storeId = idxRow?.value?.storeId;
  if (!storeId) return null;
  return getStoreById(storeId);
}

export async function saveStoreRecord(store) {
  const cleanId = String(store.id || '').trim().toUpperCase();
  const cleanApiKey = String(store.apiKey || '').trim();

  const { error: storeErr } = await supabase
    .from('swedpersiska_settings')
    .upsert({
      key: `${STORE_KEY_PREFIX}${cleanId}`,
      value: store,
      updated_at: new Date().toISOString(),
    });
  if (storeErr) throw storeErr;

  if (cleanApiKey) {
    const { error: idxErr } = await supabase
      .from('swedpersiska_settings')
      .upsert({
        key: `${API_KEY_INDEX_PREFIX}${cleanApiKey}`,
        value: { storeId: cleanId },
        updated_at: new Date().toISOString(),
      });
    if (idxErr) throw idxErr;
  }

  return store;
}
