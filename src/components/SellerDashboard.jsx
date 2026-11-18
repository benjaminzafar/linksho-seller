'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Utensils,
  ShoppingBag,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  KeyRound,
  Package,
  ClipboardList,
  Settings,
  LogOut,
  RefreshCw,
  Code2,
  CheckCircle2,
  AlertCircle,
  Truck,
  CreditCard,
  Search,
  TrendingUp,
} from 'lucide-react';

const STATUS_META = {
  pending: { label: 'در انتظار تایید', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  preparing: { label: 'در حال آماده‌سازی', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
  shipped: { label: 'ارسال شده / آماده تحویل', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  completed: { label: 'تکمیل شده', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'لغو شده', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function SellerDashboard() {
  const [store, setStore] = useState(null);
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'products' | 'orders' | 'settings'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [originUrl, setOriginUrl] = useState('');

  // Auth Forms
  const [regForm, setRegForm] = useState({
    name: '',
    type: 'restaurant',
    currency: 'SEK',
    shippingFee: '49',
    phone: '',
    whatsapp: '',
    address: '',
  });
  const [loginForm, setLoginForm] = useState({ storeId: '', pinCode: '' });

  // Product Form & Filter
  const [productSearch, setProductSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    title: '',
    category: '',
    price: '',
    image: '',
    description: '',
    available: true,
  });

  // Settings Form (including Shipping & Stripe)
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    type: 'restaurant',
    currency: 'SEK',
    shippingFee: '0',
    freeShippingOver: '0',
    stripeEnabled: false,
    stripeMode: 'test',
    stripePublishableKey: '',
    phone: '',
    whatsapp: '',
    address: '',
    description: '',
  });

  useEffect(() => {
    setOriginUrl(window.location.origin);
    try {
      const saved = localStorage.getItem('linksho_seller_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed?.pinCode) {
          refreshStoreSession(parsed.id, parsed.pinCode);
        }
      }
    } catch {}
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const syncSettingsFromStore = (s) => {
    setSettingsForm({
      name: s.name || '',
      type: s.type || 'restaurant',
      currency: s.currency || 'SEK',
      shippingFee: String(s.shippingFee ?? 0),
      freeShippingOver: String(s.freeShippingOver ?? 0),
      stripeEnabled: Boolean(s.stripe?.enabled),
      stripeMode: s.stripe?.mode === 'live' ? 'live' : 'test',
      stripePublishableKey: s.stripe?.publishableKey || '',
      phone: s.phone || '',
      whatsapp: s.whatsapp || '',
      address: s.address || '',
      description: s.description || '',
    });
  };

  const refreshStoreSession = async (storeId, pinCode) => {
    setLoading(true);
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'login', storeId, pinCode }),
      });
      const json = await res.json();
      if (json?.ok && json.store) {
        setStore(json.store);
        syncSettingsFromStore(json.store);
        localStorage.setItem(
          'linksho_seller_session',
          JSON.stringify({ id: json.store.id, pinCode: json.store.pinCode })
        );
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'register', ...regForm }),
      });
      const json = await res.json();
      if (!json?.ok) {
        setErrorMsg(json?.error || 'خطا در ایجاد پنل فروش');
        return;
      }
      setStore(json.store);
      syncSettingsFromStore(json.store);
      localStorage.setItem(
        'linksho_seller_session',
        JSON.stringify({ id: json.store.id, pinCode: json.store.pinCode })
      );
      showToast('پنل فروش شما با موفقیت ساخته شد!');
    } catch (err) {
      setErrorMsg(err?.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'login', ...loginForm }),
      });
      const json = await res.json();
      if (!json?.ok) {
        setErrorMsg(json?.error || 'کد فروشگاه یا رمز عبور اشتباه است.');
        return;
      }
      setStore(json.store);
      syncSettingsFromStore(json.store);
      localStorage.setItem(
        'linksho_seller_session',
        JSON.stringify({ id: json.store.id, pinCode: json.store.pinCode })
      );
      showToast('خوش آمدید!');
    } catch (err) {
      setErrorMsg(err?.message || 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  };

  const persistStoreUpdate = async (patch, successText = 'تغییرات ذخیره شد') => {
    if (!store) return;
    setSaving(true);
    try {
      const res = await fetch('/api/stores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          pinCode: store.pinCode,
          ...patch,
        }),
      });
      const json = await res.json();
      if (!json?.ok) {
        showToast(json?.error || 'خطا در ذخیره‌سازی');
        return;
      }
      setStore(json.store);
      syncSettingsFromStore(json.store);
      showToast(successText);
    } catch {
      showToast('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.title.trim()) return;
    const currentProducts = Array.isArray(store?.products) ? store.products : [];
    const item = {
      id: editingProductId || `PRD-${Date.now().toString(36).toUpperCase()}`,
      title: productForm.title.trim(),
      category: productForm.category.trim() || (store?.type === 'restaurant' ? 'منوی اصلی' : 'محصولات'),
      price: Number(productForm.price) || 0,
      image: productForm.image.trim(),
      description: productForm.description.trim(),
      available: productForm.available !== false,
    };

    const nextProducts = editingProductId
      ? currentProducts.map((p) => (p.id === editingProductId ? item : p))
      : [item, ...currentProducts];

    await persistStoreUpdate(
      { products: nextProducts },
      editingProductId ? 'محصول ویرایش شد' : 'محصول جدید به فروشگاه اضافه شد'
    );
    setProductModalOpen(false);
    setEditingProductId(null);
    setProductForm({ title: '', category: '', price: '', image: '', description: '', available: true });
  };

  const handleDeleteProduct = async (id) => {
    const nextProducts = (store?.products || []).filter((p) => p.id !== id);
    await persistStoreUpdate({ products: nextProducts }, 'محصول حذف شد');
  };

  const handleToggleProductAvailable = async (id) => {
    const nextProducts = (store?.products || []).map((p) =>
      p.id === id ? { ...p, available: p.available === false } : p
    );
    await persistStoreUpdate({ products: nextProducts }, 'وضعیت موجودی بروزرسانی شد');
  };

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    const nextOrders = (store?.orders || []).map((o) =>
      o.id === orderId ? { ...o, status: nextStatus } : o
    );
    await persistStoreUpdate({ orders: nextOrders }, 'وضعیت سفارش بروزرسانی شد');
  };

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(key);
      setTimeout(() => setCopiedField(''), 2000);
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('linksho_seller_session');
    setStore(null);
  };

  const orders = Array.isArray(store?.orders) ? store.orders : [];
  const products = Array.isArray(store?.products) ? store.products : [];

  // 7-day sales chart data
  const last7DaysChart = useMemo(() => {
    const days = [];
    const fmt = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' });
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isoPrefix = d.toISOString().slice(0, 10);
      const dayOrders = orders.filter((o) => o.status !== 'cancelled' && String(o.createdAt || '').startsWith(isoPrefix));
      const amount = dayOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
      days.push({
        key: isoPrefix,
        label: fmt.format(d),
        count: dayOrders.length,
        amount,
      });
    }
    const maxAmount = Math.max(1, ...days.map((d) => d.amount));
    return { days, maxAmount };
  }, [orders]);

  // ========================================================
  // 1. AUTHENTICATION / ONBOARDING SCREEN
  // ========================================================
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f5f5f7]">
        <div className="w-full max-w-lg rounded-[28px] bg-white border border-[#e5e5ea] shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[#0066CC] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Store size={24} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-[#1d1d1f]">پنل فروش لینک شو</h1>
              <p className="text-xs text-[#6e6e73]">مدیریت فروشگاه اینترنتی و منوی آنلاین رستوران با اتصال API و درگاه Stripe</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea]">
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
              className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === 'register' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73]'
              }`}
            >
              ساخت پنل فروش جدید
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
              className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === 'login' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73]'
              }`}
            >
              ورود با کد فروشگاه
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {authMode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">نام رستوران یا فروشگاه *</label>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="مثلاً: رستوران ایرانی زعفران یا فروشگاه پارس"
                  className="w-full h-11 rounded-2xl bg-[#f5f5f7] border border-[#d2d2d7] px-3.5 text-xs focus:bg-white focus:border-[#0066CC] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRegForm((p) => ({ ...p, type: 'restaurant' }))}
                  className={`p-3 rounded-2xl border text-right flex items-center gap-2.5 cursor-pointer transition-all ${
                    regForm.type === 'restaurant'
                      ? 'bg-blue-50/70 border-[#0066CC] text-[#0066CC]'
                      : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#6e6e73]'
                  }`}
                >
                  <Utensils size={18} />
                  <div>
                    <span className="block text-xs font-bold text-[#1d1d1f]">رستوران / کافه</span>
                    <span className="block text-[10px]">منوی غذا و سفارش</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRegForm((p) => ({ ...p, type: 'webshop' }))}
                  className={`p-3 rounded-2xl border text-right flex items-center gap-2.5 cursor-pointer transition-all ${
                    regForm.type === 'webshop'
                      ? 'bg-blue-50/70 border-[#0066CC] text-[#0066CC]'
                      : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#6e6e73]'
                  }`}
                >
                  <ShoppingBag size={18} />
                  <div>
                    <span className="block text-xs font-bold text-[#1d1d1f]">فروشگاه / وب‌شاپ</span>
                    <span className="block text-[10px]">فروش کالا و محصولات</span>
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">واحد پول</label>
                  <select
                    value={regForm.currency}
                    onChange={(e) => setRegForm((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full h-11 rounded-2xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs focus:bg-white focus:border-[#0066CC] focus:outline-none"
                  >
                    <option value="SEK">کرون سوئد (SEK)</option>
                    <option value="EUR">یورو (EUR)</option>
                    <option value="NOK">کرون نروژ (NOK)</option>
                    <option value="DKK">کرون دانمارک (DKK)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">هزینه ارسال ({regForm.currency})</label>
                  <input
                    type="number"
                    min="0"
                    dir="ltr"
                    value={regForm.shippingFee}
                    onChange={(e) => setRegForm((p) => ({ ...p, shippingFee: e.target.value }))}
                    placeholder="49"
                    className="w-full h-11 rounded-2xl bg-[#f5f5f7] border border-[#d2d2d7] px-3.5 text-xs font-mono text-left focus:bg-white focus:border-[#0066CC] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">تلفن / واتساپ</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={regForm.phone}
                    onChange={(e) => setRegForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+46 70..."
                    className="w-full h-11 rounded-2xl bg-[#f5f5f7] border border-[#d2d2d7] px-3.5 text-xs font-mono text-left focus:bg-white focus:border-[#0066CC] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? 'در حال ساخت پنل...' : 'ساخت پنل فروش و دریافت کلید API'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">کد فروشگاه (Store ID)</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={loginForm.storeId}
                  onChange={(e) => setLoginForm((p) => ({ ...p, storeId: e.target.value }))}
                  placeholder="ST-XXXXX"
                  className="w-full h-11 rounded-2xl bg-[#f5f5f7] border border-[#d2d2d7] px-3.5 text-xs font-mono text-left uppercase focus:bg-white focus:border-[#0066CC] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">رمز ورود فروشگاه (PIN)</label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={loginForm.pinCode}
                  onChange={(e) => setLoginForm((p) => ({ ...p, pinCode: e.target.value }))}
                  placeholder="••••••"
                  className="w-full h-11 rounded-2xl bg-[#f5f5f7] border border-[#d2d2d7] px-3.5 text-xs font-mono text-left uppercase focus:bg-white focus:border-[#0066CC] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-[#1d1d1f] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? 'در حال ورود...' : 'ورود به پنل فروش'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ========================================================
  // 2. LOGGED-IN SELLER DASHBOARD
  // ========================================================
  const totalSales = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const storefrontApiUrl = `${originUrl}/api/storefront?key=${store.apiKey}`;
  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (p.title || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-12">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-[#1d1d1f] text-white px-4 py-2.5 text-xs font-bold shadow-xl">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#e5e5ea] px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-[#0066CC] text-white flex items-center justify-center shrink-0">
            {store.type === 'restaurant' ? <Utensils size={18} /> : <ShoppingBag size={18} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-[#1d1d1f] truncate">{store.name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold font-mono">
                {store.id}
              </span>
            </div>
            <p className="text-[11px] text-[#6e6e73]">
              {store.type === 'restaurant' ? 'پنل فروش رستوران و منوی آنلاین' : 'پنل فروش فروشگاه اینترنتی'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingProductId(null);
              setProductForm({ title: '', category: '', price: '', image: '', description: '', available: true });
              setProductModalOpen(true);
            }}
            className="h-9 px-3.5 rounded-xl bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">افزودن محصول</span>
          </button>
          <button
            type="button"
            onClick={() => refreshStoreSession(store.id, store.pinCode)}
            className="h-9 px-3 rounded-xl border border-[#e5e5ea] bg-white hover:bg-[#f5f5f7] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#0066CC]' : ''} />
            <span className="hidden sm:inline">بروزرسانی</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white border border-[#e5e5ea] overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'داشبورد و API', icon: Code2 },
            { id: 'products', label: `محصولات / منو (${products.length})`, icon: Package },
            { id: 'orders', label: `سفارش‌ها (${orders.length})`, icon: ClipboardList, badge: pendingOrders },
            { id: 'settings', label: 'ارسال، درگاه Stripe و تنظیمات', icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 sm:flex-initial h-10 px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                  active ? 'bg-[#1d1d1f] text-white' : 'text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
                }`}
              >
                <Icon size={15} />
                <span>{t.label}</span>
                {t.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: DASHBOARD & API INTEGRATION */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-white border border-[#e5e5ea] p-4">
                <span className="text-xs text-[#6e6e73] font-bold block">کل درآمد فروش</span>
                <span className="text-xl font-black text-[#1d1d1f] mt-1 block tabular-nums" dir="ltr">
                  {totalSales.toLocaleString('en-US')} {store.currency}
                </span>
              </div>
              <div className="rounded-2xl bg-white border border-[#e5e5ea] p-4">
                <span className="text-xs text-[#6e6e73] font-bold block">سفارش‌های جدید</span>
                <span className="text-xl font-black text-amber-600 mt-1 block tabular-nums">{pendingOrders}</span>
              </div>
              <div className="rounded-2xl bg-white border border-[#e5e5ea] p-4">
                <span className="text-xs text-[#6e6e73] font-bold block">هزینه ارسال فعلی</span>
                <span className="text-xl font-black text-[#1d1d1f] mt-1 block tabular-nums" dir="ltr">
                  {Number(store.shippingFee || 0) === 0 ? 'رایگان' : `${store.shippingFee} ${store.currency}`}
                </span>
              </div>
              <div className="rounded-2xl bg-white border border-[#e5e5ea] p-4">
                <span className="text-xs text-[#6e6e73] font-bold block">درگاه پرداخت Stripe</span>
                <span className={`text-sm font-black mt-2 inline-block px-2.5 py-0.5 rounded-full ${
                  store.stripe?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
                }`}>
                  {store.stripe?.enabled ? 'فعال (پرداخت آنلاین)' : 'غیرفعال (پرداخت در محل)'}
                </span>
              </div>
            </div>

            {/* Two-Column Dashboard: Left Chart + Right Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* 7-Day Sales Chart */}
              <div className="lg:col-span-6 rounded-3xl bg-white border border-[#e5e5ea] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#0066CC]" />
                    <h2 className="text-sm font-black text-[#1d1d1f]">نمودار فروش ۷ روز اخیر</h2>
                  </div>
                  <span className="text-[11px] text-[#6e6e73]">{orders.length} سفارش ثبت‌شده</span>
                </div>

                <div className="grid grid-cols-7 gap-2 items-end h-44 pt-2">
                  {last7DaysChart.days.map((d) => {
                    const pct = d.amount > 0 ? Math.max(12, Math.round((d.amount / last7DaysChart.maxAmount) * 100)) : 6;
                    return (
                      <div key={d.key} className="flex flex-col items-center justify-end h-full gap-1.5 bg-[#f5f5f7]/70 rounded-2xl p-1.5">
                        <span className="text-[10px] font-bold text-[#6e6e73] tabular-nums">
                          {d.amount > 0 ? d.amount : '۰'}
                        </span>
                        <div className="w-full flex-1 flex items-end justify-center">
                          <div
                            style={{ height: `${pct}%` }}
                            className={`w-3.5 rounded-full ${
                              d.amount > 0
                                ? 'bg-gradient-to-t from-[#0066CC] to-[#38bdf8]'
                                : 'bg-stone-200'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#1d1d1f] truncate max-w-full">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Orders Preview */}
              <div className="lg:col-span-6 rounded-3xl bg-white border border-[#e5e5ea] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-[#1d1d1f]">آخرین سفارش‌ها</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#0066CC] cursor-pointer"
                  >
                    مشاهده همه ←
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#6e6e73]">
                    هنوز سفارشی ثبت نشده است.
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0f0f2]">
                    {orders.slice(0, 4).map((o) => {
                      const st = STATUS_META[o.status] || STATUS_META.pending;
                      return (
                        <div key={o.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <p className="font-bold text-[#1d1d1f] truncate">{o.customerName}</p>
                            <p className="text-[10.5px] text-[#6e6e73] font-mono">{o.id}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>{st.label}</span>
                            <span className="font-black text-emerald-700 tabular-nums" dir="ltr">
                              {o.totalAmount} {o.currency || store.currency}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* API Key & Ad Connection Box */}
            <div className="rounded-3xl bg-white border border-[#e5e5ea] p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-[#1d1d1f]">
                    لینک API اتصال به آگهی‌های لینک شو
                  </h2>
                  <p className="text-xs text-[#6e6e73] mt-1">
                    این لینک را کپی کرده و هنگام ثبت آگهی در سایت لینک شو (فیلد «لینک API پنل فروش») قرار دهید تا محصولات/منوی شما با هزینه ارسال و درگاه Stripe در آگهی نمایش داده شوند.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  آماده اتصال به آگهی
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  dir="ltr"
                  value={storefrontApiUrl}
                  className="flex-1 h-11 rounded-2xl bg-[#f5f5f7] border border-[#d2d2d7] px-3.5 text-xs font-mono text-[#1d1d1f] text-left"
                />
                <button
                  type="button"
                  onClick={() => copyText(storefrontApiUrl, 'apiUrl')}
                  className="h-11 px-5 rounded-2xl bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {copiedField === 'apiUrl' ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedField === 'apiUrl' ? 'کپی شد!' : 'کپی لینک API'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#f0f0f2]">
                <div className="p-3 rounded-2xl bg-[#f5f5f7] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <KeyRound size={15} className="text-[#6e6e73]" />
                    <span className="text-[#6e6e73]">کد فروشگاه:</span>
                    <strong className="font-mono text-[#1d1d1f]">{store.id}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(store.id, 'storeId')}
                    className="text-[11px] font-bold text-[#0066CC] cursor-pointer"
                  >
                    {copiedField === 'storeId' ? 'کپی شد' : 'کپی'}
                  </button>
                </div>
                <div className="p-3 rounded-2xl bg-[#f5f5f7] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <KeyRound size={15} className="text-[#6e6e73]" />
                    <span className="text-[#6e6e73]">رمز ورود (PIN):</span>
                    <strong className="font-mono text-[#1d1d1f]">{store.pinCode}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(store.pinCode, 'pinCode')}
                    className="text-[11px] font-bold text-[#0066CC] cursor-pointer"
                  >
                    {copiedField === 'pinCode' ? 'کپی شد' : 'کپی'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS / MENU CRUD */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="جستجوی محصول یا دسته‌بندی..."
                  className="w-full h-10 rounded-xl bg-white border border-[#e5e5ea] pr-9 pl-3 text-xs focus:border-[#0066CC] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProductId(null);
                  setProductForm({ title: '', category: '', price: '', image: '', description: '', available: true });
                  setProductModalOpen(true);
                }}
                className="h-10 px-4 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>{store.type === 'restaurant' ? 'افزودن غذا به منو' : 'افزودن محصول جدید'}</span>
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded-3xl bg-white border border-[#e5e5ea] p-12 text-center space-y-2">
                <Package size={28} className="mx-auto text-[#86868b]" />
                <p className="text-sm font-bold text-[#1d1d1f]">محصولی یافت نشد</p>
                <p className="text-xs text-[#6e6e73]">با کلیک روی دکمه بالا اولین محصول یا غذای خود را ثبت کنید.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl bg-white border border-[#e5e5ea] p-3.5 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] overflow-hidden shrink-0 flex items-center justify-center">
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-[#86868b]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10.5px] font-bold text-[#0066CC] block">{p.category}</span>
                        <h3 className="text-xs sm:text-sm font-bold text-[#1d1d1f] truncate">{p.title}</h3>
                        <p className="text-xs font-black text-emerald-700 mt-1 tabular-nums" dir="ltr">
                          {Number(p.price || 0).toLocaleString('en-US')} {store.currency}
                        </p>
                      </div>
                    </div>

                    {p.description && (
                      <p className="text-[11px] text-[#6e6e73] line-clamp-2">{p.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f2]">
                      <button
                        type="button"
                        onClick={() => handleToggleProductAvailable(p.id)}
                        className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold cursor-pointer ${
                          p.available !== false
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {p.available !== false ? 'موجود' : 'ناموجود'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProductId(p.id);
                            setProductForm({
                              title: p.title || '',
                              category: p.category || '',
                              price: String(p.price ?? ''),
                              image: p.image || '',
                              description: p.description || '',
                              available: p.available !== false,
                            });
                            setProductModalOpen(true);
                          }}
                          className="h-8 w-8 rounded-lg bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] flex items-center justify-center cursor-pointer"
                          title="ویرایش"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-3xl bg-white border border-[#e5e5ea] p-12 text-center space-y-2">
                <ClipboardList size={28} className="mx-auto text-[#86868b]" />
                <p className="text-sm font-bold text-[#1d1d1f]">هنوز سفارشی ثبت نشده است</p>
                <p className="text-xs text-[#6e6e73]">
                  پس از اتصال لینک API به آگهی خود، سفارش‌های مشتریان مستقیماً اینجا نمایش داده می‌شوند.
                </p>
              </div>
            ) : (
              orders.map((order) => {
                const st = STATUS_META[order.status] || STATUS_META.pending;
                return (
                  <div key={order.id} className="rounded-2xl bg-white border border-[#e5e5ea] p-4 sm:p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-[#1d1d1f]">{order.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.cls}`}>
                          {st.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                          order.paymentMethod === 'stripe'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-stone-100 text-stone-700'
                        }`}>
                          {order.paymentMethod === 'stripe'
                            ? (order.paymentStatus === 'paid' ? 'پرداخت آنلاین Stripe (تایید شده)' : 'Stripe')
                            : 'پرداخت در محل'}
                        </span>
                      </div>
                      <span className="text-sm font-black text-emerald-700 tabular-nums" dir="ltr">
                        {Number(order.totalAmount || 0).toLocaleString('en-US')} {order.currency || store.currency}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#515154] bg-[#f5f5f7] p-3 rounded-xl">
                      <div>مشتری: <strong className="text-[#1d1d1f]">{order.customerName}</strong></div>
                      <div>تلفن: <strong className="font-mono text-[#1d1d1f]" dir="ltr">{order.customerPhone}</strong></div>
                      <div>
                        تحویل: <strong className="text-[#1d1d1f]">
                          {order.deliveryType === 'pickup' ? 'تحویل حضوری' : (order.customerAddress || 'ارسال با پیک')}
                        </strong>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {(order.items || []).map((it, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-[#f0f0f2] last:border-0">
                          <span>{it.title} × {it.qty}</span>
                          <span className="font-bold tabular-nums" dir="ltr">
                            {(Number(it.unitPrice || 0) * Number(it.qty || 1)).toLocaleString('en-US')} {store.currency}
                          </span>
                        </div>
                      ))}
                      {Number(order.shippingFee || 0) > 0 && (
                        <div className="flex items-center justify-between text-xs py-1 text-[#6e6e73]">
                          <span>هزینه ارسال</span>
                          <span className="font-bold tabular-nums" dir="ltr">{order.shippingFee} {store.currency}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="h-9 rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3 text-xs font-bold cursor-pointer"
                      >
                        <option value="pending">در انتظار تایید</option>
                        <option value="preparing">در حال آماده‌سازی</option>
                        <option value="shipped">ارسال شده / آماده تحویل</option>
                        <option value="completed">تکمیل شده</option>
                        <option value="cancelled">لغو شده</option>
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 4: SETTINGS (STORE + SHIPPING + STRIPE) */}
        {activeTab === 'settings' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              persistStoreUpdate(
                {
                  name: settingsForm.name,
                  type: settingsForm.type,
                  currency: settingsForm.currency,
                  shippingFee: Number(settingsForm.shippingFee) || 0,
                  freeShippingOver: Number(settingsForm.freeShippingOver) || 0,
                  stripe: {
                    enabled: settingsForm.stripeEnabled,
                    mode: settingsForm.stripeMode,
                    publishableKey: settingsForm.stripePublishableKey,
                  },
                  phone: settingsForm.phone,
                  whatsapp: settingsForm.whatsapp,
                  address: settingsForm.address,
                  description: settingsForm.description,
                },
                'تنظیمات فروشگاه، هزینه ارسال و درگاه Stripe ذخیره شد'
              );
            }}
            className="space-y-5"
          >
            {/* General Store Info */}
            <div className="rounded-3xl bg-white border border-[#e5e5ea] p-5 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-black text-[#1d1d1f]">مشخصات فروشگاه</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">نام فروشگاه / رستوران</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">واحد پول</label>
                  <select
                    value={settingsForm.currency}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs"
                  >
                    <option value="SEK">SEK</option>
                    <option value="EUR">EUR</option>
                    <option value="NOK">NOK</option>
                    <option value="DKK">DKK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">شماره تماس</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">آدرس</label>
                  <input
                    type="text"
                    value={settingsForm.address}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, address: e.target.value }))}
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">توضیحات فروشگاه</label>
                <textarea
                  rows={2}
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] p-3 text-xs"
                />
              </div>
            </div>

            {/* Shipping Price Settings */}
            <div className="rounded-3xl bg-white border border-[#e5e5ea] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-[#0066CC]" />
                <h2 className="text-sm sm:text-base font-black text-[#1d1d1f]">تنظیمات هزینه ارسال (Shipping)</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">
                    هزینه ارسال ثابت ({settingsForm.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    dir="ltr"
                    value={settingsForm.shippingFee}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, shippingFee: e.target.value }))}
                    placeholder="49"
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs font-mono text-left"
                  />
                  <p className="text-[10.5px] text-[#6e6e73] mt-1">عدد ۰ یعنی ارسال رایگان است.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">
                    ارسال رایگان برای خرید بالای ({settingsForm.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    dir="ltr"
                    value={settingsForm.freeShippingOver}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, freeShippingOver: e.target.value }))}
                    placeholder="500"
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs font-mono text-left"
                  />
                  <p className="text-[10.5px] text-[#6e6e73] mt-1">عدد ۰ یعنی شرط ارسال رایگان غیرفعال است.</p>
                </div>
              </div>
            </div>

            {/* Stripe Payment Method Settings */}
            <div className="rounded-3xl bg-white border border-[#e5e5ea] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-indigo-600" />
                  <h2 className="text-sm sm:text-base font-black text-[#1d1d1f]">درگاه پرداخت آنلاین Stripe</h2>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  settingsForm.stripeEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
                }`}>
                  {settingsForm.stripeEnabled ? 'فعال' : 'غیرفعال'}
                </span>
              </div>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-[#1d1d1f] block">فعال‌سازی پرداخت آنلاین با کارت بانکی (Stripe)</span>
                  <span className="text-[11px] text-[#6e6e73]">مشتریان می‌توانند هنگام ثبت سفارش در آگهی، هزینه را آنلاین با Stripe پرداخت کنند</span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.stripeEnabled}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, stripeEnabled: e.target.checked }))}
                  className="h-4 w-4 rounded cursor-pointer"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">حالت درگاه (Mode)</label>
                  <select
                    value={settingsForm.stripeMode}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, stripeMode: e.target.value }))}
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs"
                  >
                    <option value="test">آزمایشی (Test Mode)</option>
                    <option value="live">عملیاتی (Live Mode)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">کلید عمومی Stripe (Publishable Key)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={settingsForm.stripePublishableKey}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, stripePublishableKey: e.target.value }))}
                    placeholder="pk_test_... / pk_live_..."
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs font-mono text-left"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="h-11 px-7 rounded-full bg-[#1d1d1f] hover:bg-black text-white text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'در حال ذخیره...' : 'ذخیره تمام تنظیمات'}
            </button>
          </form>
        )}
      </main>

      {/* Add / Edit Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <form
            onSubmit={handleSaveProduct}
            className="w-full max-w-md rounded-3xl bg-white border border-[#e5e5ea] p-5 sm:p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-black text-[#1d1d1f]">
              {editingProductId ? 'ویرایش محصول' : 'افزودن محصول / آیتم منو'}
            </h3>
            <div>
              <label className="block text-xs font-bold mb-1">نام محصول / غذا *</label>
              <input
                type="text"
                required
                value={productForm.title}
                onChange={(e) => setProductForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="مثلاً: چلوکباب کوبیده یا پیتزا مخصوص"
                className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">دسته‌بندی</label>
                <input
                  type="text"
                  value={productForm.category}
                  onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="مثلاً: غذای اصلی"
                  className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">قیمت ({store.currency}) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  dir="ltr"
                  value={productForm.price}
                  onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="149"
                  className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs font-mono text-left"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">لینک تصویر (اختیاری)</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  dir="ltr"
                  value={productForm.image}
                  onChange={(e) => setProductForm((p) => ({ ...p, image: e.target.value }))}
                  placeholder="https://..."
                  className="flex-1 h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs font-mono text-left"
                />
                {productForm.image && (
                  <img
                    src={productForm.image}
                    alt=""
                    className="h-10 w-10 rounded-xl object-cover border border-[#e5e5ea] shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">توضیحات</label>
              <textarea
                rows={2}
                value={productForm.description}
                onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] p-2.5 text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="h-10 px-4 rounded-full bg-[#f5f5f7] text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-5 rounded-full bg-[#0066CC] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {saving ? 'در حال ذخیره...' : 'ذخیره محصول'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
