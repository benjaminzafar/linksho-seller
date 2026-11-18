'use client';

import React, { useState } from 'react';
import {
  Cloud,
  Store,
  Utensils,
  ShoppingBag,
  Rocket,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export default function CloudflareDeployPortal() {
  const [name, setName] = useState('');
  const [type, setType] = useState('restaurant');
  const [currency, setCurrency] = useState('SEK');
  const [shippingFee, setShippingFee] = useState('49');
  const [phone, setPhone] = useState('');
  const [cfToken, setCfToken] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  const copyText = async (val, key) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {}
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setDeploying(true);
    try {
      const res = await fetch('/api/cloudflare/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          currency,
          shippingFee: Number(shippingFee) || 0,
          phone: phone.trim(),
          cfToken: cfToken.trim(),
        }),
      });
      const json = await res.json();
      if (!json?.ok) {
        setErrorMsg(json?.error || 'خطا در نصب روی کلودفلر');
        return;
      }
      setResult(json);
    } catch (err) {
      setErrorMsg(err?.message || 'خطا در ارتباط با سرور');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl rounded-[28px] bg-white border border-[#e5e5ea] shadow-[0_24px_70px_rgba(29,29,31,0.1)] p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#F38020] to-[#E05D00] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Cloud size={24} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-[#1d1d1f]">نصب خودکار پنل فروش روی کلودفلر</h1>
              <p className="text-xs text-[#6e6e73] mt-0.5">
                ساخت دیتابیس اختصاصی D1 + پنل مدیریت محصولات، ارسال و Stripe بدون نیاز به دانش فنی
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold shrink-0 flex items-center gap-1">
            <ShieldCheck size={12} />
            <span>۱۰۰٪ اختصاصی</span>
          </span>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="text-sm font-black">پنل فروش و دیتابیس D1 شما با موفقیت روی کلودفلر ساخته شد!</h2>
                <p className="text-xs text-emerald-800">
                  از این لحظه تمام محصولات، سفارش‌ها و تنظیمات در حساب کلودفلر خودتان ذخیره می‌شوند.
                </p>
              </div>
            </div>

            {/* Panel URL */}
            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] space-y-2">
              <span className="text-xs font-bold text-[#1d1d1f] block">آدرس پنل فروش اختصاصی شما:</span>
              <div className="flex gap-2">
                <input
                  readOnly
                  dir="ltr"
                  value={result.panelUrl}
                  className="flex-1 h-10 rounded-xl bg-white border border-[#d2d2d7] px-3 text-xs font-mono text-left"
                />
                <a
                  href={result.panelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-4 rounded-xl bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                >
                  <span>ورود به پنل</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

            {/* PIN Code */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <KeyRound size={16} className="text-amber-700" />
                <span className="font-bold text-amber-950">رمز ورود به پنل (PIN):</span>
                <strong className="font-mono text-base font-black text-amber-900">{result.pinCode}</strong>
              </div>
              <button
                type="button"
                onClick={() => copyText(result.pinCode, 'pin')}
                className="h-8 px-3 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-900 cursor-pointer"
              >
                {copiedKey === 'pin' ? 'کپی شد!' : 'کپی رمز'}
              </button>
            </div>

            {/* Storefront API URL */}
            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] space-y-2">
              <span className="text-xs font-bold text-[#1d1d1f] block">
                لینک API اتصال به آگهی‌های لینک شو:
              </span>
              <div className="flex gap-2">
                <input
                  readOnly
                  dir="ltr"
                  value={result.storefrontApiUrl}
                  className="flex-1 h-10 rounded-xl bg-white border border-[#d2d2d7] px-3 text-xs font-mono text-left"
                />
                <button
                  type="button"
                  onClick={() => copyText(result.storefrontApiUrl, 'api')}
                  className="h-10 px-4 rounded-xl bg-[#1d1d1f] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedKey === 'api' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === 'api' ? 'کپی شد!' : 'کپی API'}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setResult(null); setCfToken(''); }}
              className="w-full h-10 rounded-full bg-[#f5f5f7] hover:bg-[#e5e5ea] text-xs font-bold text-[#1d1d1f] cursor-pointer"
            >
              نصب یک فروشگاه دیگر
            </button>
          </div>
        ) : (
          <form onSubmit={handleDeploy} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Cloudflare Token */}
            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-black text-[#1d1d1f]">۱. اتصال به حساب کلودفلر شما</span>
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0066CC] hover:underline"
                >
                  <span>دریافت توکن از کلودفلر</span>
                  <ExternalLink size={11} />
                </a>
              </div>
              <input
                type="password"
                required
                dir="ltr"
                value={cfToken}
                onChange={(e) => setCfToken(e.target.value)}
                placeholder="Cloudflare API Token (Workers Scripts:Edit + D1:Edit)"
                className="w-full h-10 rounded-xl bg-white border border-[#d2d2d7] px-3 text-xs font-mono text-left focus:border-[#0066CC] focus:outline-none"
              />
              <p className="text-[10.5px] text-[#6e6e73] leading-relaxed">
                در کلودفلر یک API Token با دسترسی <strong>Workers Scripts: Edit</strong>، <strong>D1: Edit</strong> و <strong>Account Settings: Read</strong> بسازید و اینجا پیست کنید. توکن شما ذخیره نمی‌شود.
              </p>
            </div>

            {/* Step 2: Store Details */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] mb-1">۲. نام رستوران یا فروشگاه *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: رستوران زعفران یا فروشگاه آنلاین پارس"
                  className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs focus:bg-white focus:border-[#0066CC] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setType('restaurant')}
                  className={`p-3 rounded-2xl border text-right flex items-center gap-2 cursor-pointer ${
                    type === 'restaurant'
                      ? 'bg-blue-50/70 border-[#0066CC] text-[#0066CC]'
                      : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#6e6e73]'
                  }`}
                >
                  <Utensils size={16} />
                  <div>
                    <span className="block text-xs font-bold text-[#1d1d1f]">رستوران / کافه</span>
                    <span className="block text-[10px]">منوی غذا و سفارش</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setType('webshop')}
                  className={`p-3 rounded-2xl border text-right flex items-center gap-2 cursor-pointer ${
                    type === 'webshop'
                      ? 'bg-blue-50/70 border-[#0066CC] text-[#0066CC]'
                      : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#6e6e73]'
                  }`}
                >
                  <ShoppingBag size={16} />
                  <div>
                    <span className="block text-xs font-bold text-[#1d1d1f]">فروشگاه / وب‌شاپ</span>
                    <span className="block text-[10px]">فروش محصولات</span>
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1">واحد پول</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-2.5 text-xs"
                  >
                    <option value="SEK">SEK</option>
                    <option value="EUR">EUR</option>
                    <option value="NOK">NOK</option>
                    <option value="DKK">DKK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1">هزینه ارسال ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    dir="ltr"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1d1d1f] mb-1">شماره تماس</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+46 70..."
                    className="w-full h-10 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs font-mono text-left"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={deploying}
              className="w-full h-11 rounded-full bg-gradient-to-l from-[#F38020] to-[#E05D00] hover:opacity-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              <Rocket size={16} />
              <span>{deploying ? 'در حال ساخت دیتابیس D1 و نصب Worker...' : 'نصب خودکار روی کلودفلر با ۱ کلیک'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
