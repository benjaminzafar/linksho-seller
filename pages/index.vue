<script setup>
import { ref } from 'vue';
import {
  Cloud,
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
} from 'lucide-vue-next';

const name = ref('');
const type = ref('restaurant');
const currency = ref('SEK');
const shippingFee = ref('49');
const phone = ref('');
const deploying = ref(false);
const errorMsg = ref('');
const result = ref(null);
const copiedKey = ref('');

const copyText = async (val, key) => {
  try {
    await navigator.clipboard.writeText(val);
    copiedKey.value = key;
    setTimeout(() => {
      copiedKey.value = '';
    }, 2000);
  } catch {}
};

const handleDeploy = async () => {
  errorMsg.value = '';
  deploying.value = true;
  try {
    const json = await $fetch('/api/cloudflare/deploy', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        type: type.value,
        currency: currency.value,
        shippingFee: Number(shippingFee.value) || 0,
        phone: phone.value.trim(),
      },
    });
    if (!json?.ok) {
      errorMsg.value = json?.error || 'خطا در ساخت پنل فروش';
      return;
    }
    result.value = json;
  } catch (err) {
    errorMsg.value = err?.data?.error || err?.message || 'خطا در ارتباط با سرور';
  } finally {
    deploying.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4 sm:p-6" dir="rtl">
    <div class="w-full max-w-xl rounded-[28px] bg-white border border-[#e5e5ea] shadow-[0_24px_70px_rgba(29,29,31,0.08)] p-6 sm:p-8 space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#F38020] to-[#E05D00] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Cloud :size="24" />
          </div>
          <div>
            <h1 class="text-lg sm:text-xl font-black text-[#1d1d1f]">Seller pannel • پنل فروش لینک شو</h1>
            <p class="text-xs text-[#6e6e73] mt-0.5">
              راه‌اندازی فروشگاه اینترنتی یا منوی رستوران با دیتابیس اختصاصی در کمتر از ۱۰ ثانیه
            </p>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold shrink-0 flex items-center gap-1">
          <ShieldCheck :size="12" />
          <span>امن و مدیریت‌شده</span>
        </span>
      </div>

      <!-- Success Result -->
      <div v-if="result" class="space-y-4">
        <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
          <CheckCircle2 :size="20" class="text-emerald-600 shrink-0 mt-0.5" />
          <div class="space-y-1">
            <h2 class="text-sm font-black">پنل فروش شما با موفقیت ساخته شد!</h2>
            <p class="text-xs text-emerald-800">
              فروشگاه شما آماده است و می‌توانید محصولات، هزینه ارسال و درگاه Stripe را مدیریت کنید.
            </p>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] space-y-2">
          <span class="text-xs font-bold text-[#1d1d1f] block">آدرس پنل فروش اختصاصی شما:</span>
          <div class="flex gap-2">
            <input
              readonly
              dir="ltr"
              :value="result.panelUrl"
              class="flex-1 h-10 rounded-xl bg-white border border-[#d2d2d7] px-3 text-xs font-mono text-left"
            />
            <a
              :href="result.panelUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="h-10 px-4 rounded-xl bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
            >
              <span>ورود به پنل</span>
              <ExternalLink :size="13" />
            </a>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs">
            <KeyRound :size="16" class="text-amber-700" />
            <span class="font-bold text-amber-950">رمز ورود به پنل (PIN):</span>
            <strong class="font-mono text-base font-black text-amber-900">{{ result.pinCode }}</strong>
          </div>
          <button
            type="button"
            class="h-8 px-3 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-900 cursor-pointer"
            @click="copyText(result.pinCode, 'pin')"
          >
            {{ copiedKey === 'pin' ? 'کپی شد!' : 'کپی رمز' }}
          </button>
        </div>

        <div class="p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] space-y-2">
          <span class="text-xs font-bold text-[#1d1d1f] block">لینک API فروشگاه:</span>
          <div class="flex gap-2">
            <input
              readonly
              dir="ltr"
              :value="result.storefrontApiUrl"
              class="flex-1 h-10 rounded-xl bg-white border border-[#d2d2d7] px-3 text-xs font-mono text-left"
            />
            <button
              type="button"
              class="h-10 px-4 rounded-xl bg-[#1d1d1f] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              @click="copyText(result.storefrontApiUrl, 'api')"
            >
              <Check v-if="copiedKey === 'api'" :size="14" />
              <Copy v-else :size="14" />
              <span>{{ copiedKey === 'api' ? 'کپی شد!' : 'کپی API' }}</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          class="w-full h-11 rounded-full bg-[#f5f5f7] hover:bg-[#ececef] border border-[#e5e5ea] text-xs font-bold text-[#1d1d1f] cursor-pointer transition-colors"
          @click="result = null"
        >
          ساخت یک فروشگاه جدید دیگر
        </button>
      </div>

      <!-- Create Store Form -->
      <form v-else class="space-y-4" @submit.prevent="handleDeploy">
        <div
          v-if="errorMsg"
          class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2"
        >
          <AlertCircle :size="15" class="shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#1d1d1f] mb-1.5">نام فروشگاه یا رستوران *</label>
          <input
            v-model="name"
            type="text"
            required
            placeholder="مثلاً: رستوران زعفران استکهلم"
            class="w-full h-11 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3.5 text-xs focus:bg-white focus:border-[#0066CC] focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-[#1d1d1f] mb-1.5">نوع کسب‌وکار *</label>
          <div class="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              :class="[
                'p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors',
                type === 'restaurant'
                  ? 'bg-[#0066CC] text-white border-[#0066CC]'
                  : 'bg-[#f5f5f7] text-[#1d1d1f] border-[#e5e5ea]'
              ]"
              @click="type = 'restaurant'"
            >
              <Utensils :size="15" />
              <span>رستوران / کافه</span>
            </button>
            <button
              type="button"
              :class="[
                'p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors',
                type === 'webshop'
                  ? 'bg-[#0066CC] text-white border-[#0066CC]'
                  : 'bg-[#f5f5f7] text-[#1d1d1f] border-[#e5e5ea]'
              ]"
              @click="type = 'webshop'"
            >
              <ShoppingBag :size="15" />
              <span>فروشگاه آنلاین</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#1d1d1f] mb-1.5">واحد پول</label>
            <select
              v-model="currency"
              class="w-full h-11 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3 text-xs focus:bg-white focus:border-[#0066CC] focus:outline-none"
            >
              <option value="SEK">کرون سوئد (SEK)</option>
              <option value="NOK">کرون نروژ (NOK)</option>
              <option value="DKK">کرون دانمارک (DKK)</option>
              <option value="EUR">یورو (EUR)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-[#1d1d1f] mb-1.5">هزینه ارسال پیش‌فرض</label>
            <input
              v-model="shippingFee"
              type="number"
              min="0"
              dir="ltr"
              class="w-full h-11 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3.5 text-xs font-mono text-left focus:bg-white focus:border-[#0066CC] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#1d1d1f] mb-1.5">شماره تماس پشتیبانی</label>
          <input
            v-model="phone"
            type="text"
            dir="ltr"
            placeholder="+46 70 000 00 00"
            class="w-full h-11 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] px-3.5 text-xs font-mono text-left focus:bg-white focus:border-[#0066CC] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          :disabled="deploying"
          class="w-full h-12 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
        >
          <Rocket :size="16" />
          <span>{{ deploying ? 'در حال ساخت پنل...' : 'ساخت فوری پنل فروش' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
