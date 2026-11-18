<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Send,
  CreditCard,
  Settings,
  Search,
  Menu,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Store,
  TrendingUp,
  Clock,
  Lock,
} from 'lucide-vue-next';
import { SELLER_LANGUAGES, TRANSLATIONS } from '~/utils/i18n';

const STORAGE_KEY = 'seller_pannel_state_v1';

const lang = ref('en');
const activeTab = ref('overview'); // 'overview' | 'orders' | 'products' | 'telegram' | 'payments' | 'settings'
const mobileNavOpen = ref(false);
const searchQuery = ref('');
const orderFilter = ref('all');
const toastMsg = ref('');

const store = ref({
  name: 'Nordic Kitchen & Market',
  type: 'restaurant',
  isOpen: true,
  currency: 'SEK',
  shippingFee: 49,
  phone: '+46 70 123 45 67',
  address: 'Sveavägen 42, Stockholm',
  customDomain: 'order.nordickitchen.se',
});

const stripeConfig = ref({
  mode: 'test',
  publishableKey: 'pk_test_51ExampleKey000000',
  enabled: true,
});

const telegramConfig = ref({
  botToken: '',
  chatId: '',
  enabled: true,
});

const products = ref([
  { id: 'PRD-101', name: 'Saffron Kebab Plate', category: 'Main Course', price: 169, available: true },
  { id: 'PRD-102', name: 'Ghormeh Sabzi Bowl', category: 'Main Course', price: 159, available: true },
  { id: 'PRD-103', name: 'Crispy Tahdig & Stew', category: 'Specials', price: 179, available: true },
  { id: 'PRD-104', name: 'Cardamom Baklava (4 pcs)', category: 'Desserts', price: 65, available: true },
  { id: 'PRD-105', name: 'Mint Doogh 500ml', category: 'Drinks', price: 35, available: false },
]);

const orders = ref([
  {
    id: 'ORD-4821',
    customer: 'Emma Lindqvist',
    phone: '+46 70 441 12 90',
    items: '2x Saffron Kebab Plate, 1x Mint Doogh',
    total: 373,
    payment: 'Stripe • Paid',
    status: 'pending',
    time: '4 min ago',
  },
  {
    id: 'ORD-4820',
    customer: 'Oskar Bergström',
    phone: '+46 73 882 10 44',
    items: '1x Crispy Tahdig & Stew, 1x Baklava',
    total: 244,
    payment: 'Stripe • Paid',
    status: 'preparing',
    time: '18 min ago',
  },
  {
    id: 'ORD-4819',
    customer: 'Sofia Holm',
    phone: '+46 76 210 99 31',
    items: '3x Ghormeh Sabzi Bowl',
    total: 477,
    payment: 'Stripe • Paid',
    status: 'ready',
    time: '32 min ago',
  },
  {
    id: 'ORD-4818',
    customer: 'Lukas Nyström',
    phone: '+46 72 904 55 18',
    items: '2x Saffron Kebab Plate',
    total: 338,
    payment: 'Stripe • Paid',
    status: 'delivered',
    time: '1 hr ago',
  },
]);

const showAddProduct = ref(false);
const newProduct = ref({ name: '', category: 'Main Course', price: '' });

const t = computed(() => TRANSLATIONS[lang.value] || TRANSLATIONS.en);

const showToast = (msg) => {
  toastMsg.value = msg;
  setTimeout(() => {
    toastMsg.value = '';
  }, 2600);
};

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.lang && TRANSLATIONS[parsed.lang]) lang.value = parsed.lang;
      if (parsed.store) store.value = { ...store.value, ...parsed.store };
      if (parsed.stripeConfig) stripeConfig.value = { ...stripeConfig.value, ...parsed.stripeConfig };
      if (parsed.telegramConfig) telegramConfig.value = { ...telegramConfig.value, ...parsed.telegramConfig };
      if (Array.isArray(parsed.products)) products.value = parsed.products;
      if (Array.isArray(parsed.orders)) orders.value = parsed.orders;
    }
  } catch {}
});

watch(
  [lang, store, stripeConfig, telegramConfig, products, orders],
  () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lang: lang.value,
          store: store.value,
          stripeConfig: stripeConfig.value,
          telegramConfig: telegramConfig.value,
          products: products.value,
          orders: orders.value,
        })
      );
    } catch {}
  },
  { deep: true }
);

const totalRevenue = computed(() =>
  orders.value
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total || 0), 0)
);

const activeOrdersCount = computed(() =>
  orders.value.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)).length
);

const avgOrderValue = computed(() => {
  const valid = orders.value.filter((o) => o.status !== 'cancelled');
  if (!valid.length) return 0;
  return Math.round(totalRevenue.value / valid.length);
});

const filteredOrders = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return orders.value.filter((o) => {
    if (orderFilter.value !== 'all' && o.status !== orderFilter.value) return false;
    if (!q) return true;
    return (
      o.id.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      o.items.toLowerCase().includes(q)
    );
  });
});

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return products.value.filter((p) => {
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });
});

const statusBadgeClass = (status) => {
  if (status === 'pending') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (status === 'preparing') return 'bg-blue-50 text-[#0066CC] border-blue-200';
  if (status === 'ready') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'delivered') return 'bg-stone-100 text-stone-700 border-stone-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

const statusLabel = (status) => {
  const map = {
    pending: t.value.statusPending,
    preparing: t.value.statusPreparing,
    ready: t.value.statusReady,
    delivered: t.value.statusDelivered,
    cancelled: t.value.statusCancelled,
  };
  return map[status] || status;
};

const updateOrderStatus = (orderId, nextStatus) => {
  orders.value = orders.value.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o));
  showToast(t.value.savedToast);
};

const addProductItem = () => {
  const cleanName = newProduct.value.name.trim();
  const numPrice = Number(newProduct.value.price);
  if (!cleanName || Number.isNaN(numPrice) || numPrice <= 0) return;
  products.value = [
    {
      id: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      name: cleanName,
      category: newProduct.value.category || 'General',
      price: numPrice,
      available: true,
    },
    ...products.value,
  ];
  newProduct.value = { name: '', category: 'Main Course', price: '' };
  showAddProduct.value = false;
  showToast(t.value.savedToast);
};

const toggleProductAvailability = (id) => {
  products.value = products.value.map((p) => (p.id === id ? { ...p, available: !p.available } : p));
  showToast(t.value.savedToast);
};

const deleteProduct = (id) => {
  products.value = products.value.filter((p) => p.id !== id);
  showToast(t.value.savedToast);
};

const navItems = computed(() => [
  { id: 'overview', label: t.value.navOverview, icon: LayoutDashboard },
  { id: 'orders', label: t.value.navOrders, icon: ShoppingBag, badge: activeOrdersCount.value },
  { id: 'products', label: t.value.navProducts, icon: Package, badge: products.value.length },
  { id: 'telegram', label: t.value.navTelegram, icon: Send },
  { id: 'payments', label: t.value.navPayments, icon: CreditCard },
  { id: 'settings', label: t.value.navSettings, icon: Settings },
]);

const selectTab = (id) => {
  activeTab.value = id;
  mobileNavOpen.value = false;
};
</script>

<template>
  <div class="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex" dir="ltr">
    <!-- Toast Notification -->
    <div
      v-if="toastMsg"
      class="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#1D1D1F] text-white px-4 py-2.5 shadow-lg text-xs font-semibold"
    >
      <CheckCircle2 :size="15" class="text-emerald-400 shrink-0" />
      <span>{{ toastMsg }}</span>
    </div>

    <!-- Mobile Drawer Backdrop -->
    <div
      v-if="mobileNavOpen"
      class="fixed inset-0 z-40 bg-black/40 lg:hidden"
      @click="mobileNavOpen = false"
    />

    <!-- Persistent Left Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 bg-[#111214] text-white flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0',
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="p-5 space-y-6">
        <!-- Brand Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-[#0066CC] flex items-center justify-center font-black text-sm shadow-sm">
              SP
            </div>
            <div>
              <div class="text-sm font-extrabold tracking-tight">Seller pannel</div>
              <div class="text-[11px] text-white/55">{{ t.brandSub }}</div>
            </div>
          </div>
          <button
            type="button"
            class="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white"
            @click="mobileNavOpen = false"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- Store Live Status Toggle -->
        <button
          type="button"
          class="w-full rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer"
          @click="store.isOpen = !store.isOpen; showToast(t.savedToast)"
        >
          <span class="flex items-center gap-2">
            <span :class="['h-2 w-2 rounded-full', store.isOpen ? 'bg-emerald-400' : 'bg-rose-400']" />
            <span>{{ store.isOpen ? t.storeOpen : t.storeClosed }}</span>
          </span>
          <Store :size="14" class="text-white/60" />
        </button>

        <!-- Navigation Menu -->
        <nav class="space-y-1">
          <button
            v-for="item in navItems"
            :key="item.id"
            type="button"
            :class="[
              'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer',
              activeTab === item.id
                ? 'bg-white text-[#1D1D1F]'
                : 'text-white/70 hover:text-white hover:bg-white/[0.07]'
            ]"
            @click="selectTab(item.id)"
          >
            <span class="flex items-center gap-2.5">
              <component :is="item.icon" :size="16" />
              <span>{{ item.label }}</span>
            </span>
            <span
              v-if="item.badge !== undefined"
              :class="[
                'px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                activeTab === item.id ? 'bg-[#0066CC] text-white' : 'bg-white/10 text-white/80'
              ]"
            >
              {{ item.badge }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Footer SSL & Domain Info -->
      <div class="p-5 border-t border-white/10 space-y-2 text-[11px] text-white/60">
        <div class="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <Lock :size="13" />
          <span>{{ t.sslActive }}</span>
        </div>
        <div class="truncate font-mono text-white/80">{{ store.customDomain }}</div>
      </div>
    </aside>

    <!-- Main Workspace -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Top Bar -->
      <header class="sticky top-0 z-30 h-16 bg-[#FBFBFC]/90 backdrop-blur-md border-b border-[#E5E5EA] px-4 sm:px-6 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            class="lg:hidden h-9 w-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#1D1D1F]"
            @click="mobileNavOpen = true"
          >
            <Menu :size="18" />
          </button>

          <div class="relative w-full max-w-sm">
            <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t.searchPlaceholder"
              class="w-full h-9 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] pl-9 pr-4 text-xs focus:bg-white focus:border-[#0066CC] focus:outline-none"
            />
          </div>
        </div>

        <!-- Country Language Switcher + Security Badge -->
        <div class="flex items-center gap-2.5 shrink-0">
          <span class="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            <ShieldCheck :size="13" />
            <span>Stripe SSL</span>
          </span>

          <div class="relative flex items-center">
            <Globe :size="14" class="absolute left-3 text-[#6E6E73] pointer-events-none" />
            <select
              v-model="lang"
              class="h-9 rounded-full bg-white border border-[#E5E5EA] pl-8 pr-3 text-xs font-semibold text-[#1D1D1F] focus:border-[#0066CC] focus:outline-none cursor-pointer"
            >
              <option v-for="l in SELLER_LANGUAGES" :key="l.code" :value="l.code">
                {{ l.flag }} {{ l.label }}
              </option>
            </select>
          </div>
        </div>
      </header>

      <!-- Tab Content Area -->
      <main class="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        <!-- OVERVIEW TAB -->
        <template v-if="activeTab === 'overview'">
          <!-- KPI Grid -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-[#6E6E73]">
                <span>{{ t.kpiRevenue }}</span>
                <TrendingUp :size="15" class="text-[#0066CC]" />
              </div>
              <div class="text-2xl font-extrabold text-[#1D1D1F] tabular-nums">
                {{ totalRevenue.toLocaleString('en-US') }} {{ store.currency }}
              </div>
            </div>

            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-[#6E6E73]">
                <span>{{ t.kpiOrders }}</span>
                <Clock :size="15" class="text-amber-600" />
              </div>
              <div class="text-2xl font-extrabold text-[#1D1D1F] tabular-nums">
                {{ activeOrdersCount }}
              </div>
            </div>

            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-[#6E6E73]">
                <span>{{ t.kpiProducts }}</span>
                <Package :size="15" class="text-emerald-600" />
              </div>
              <div class="text-2xl font-extrabold text-[#1D1D1F] tabular-nums">
                {{ products.length }}
              </div>
            </div>

            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-[#6E6E73]">
                <span>{{ t.kpiAvgOrder }}</span>
                <CreditCard :size="15" class="text-[#0066CC]" />
              </div>
              <div class="text-2xl font-extrabold text-[#1D1D1F] tabular-nums">
                {{ avgOrderValue }} {{ store.currency }}
              </div>
            </div>
          </div>

          <!-- Recent Orders Card -->
          <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] overflow-hidden">
            <div class="px-5 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
              <h2 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.recentOrders }}</h2>
              <button
                type="button"
                class="text-xs font-bold text-[#0066CC] hover:underline cursor-pointer"
                @click="activeTab = 'orders'"
              >
                {{ t.viewAll }} →
              </button>
            </div>
            <div class="divide-y divide-[#E5E5EA]">
              <div
                v-for="ord in orders.slice(0, 4)"
                :key="ord.id"
                class="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-[#1D1D1F]">{{ ord.id }}</span>
                    <span class="text-xs font-semibold text-[#1D1D1F]">{{ ord.customer }}</span>
                    <span class="text-[11px] text-[#86868B]">• {{ ord.time }}</span>
                  </div>
                  <p class="text-xs text-[#6E6E73]">{{ ord.items }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xs font-extrabold tabular-nums">{{ ord.total }} {{ store.currency }}</span>
                  <span :class="['px-2.5 py-0.5 rounded-full text-[11px] font-bold border', statusBadgeClass(ord.status)]">
                    {{ statusLabel(ord.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ORDERS TAB -->
        <template v-else-if="activeTab === 'orders'">
          <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navOrders }} ({{ filteredOrders.length }})</h2>
              <div class="flex items-center gap-1.5 flex-wrap">
                <button
                  v-for="st in ['all', 'pending', 'preparing', 'ready', 'delivered', 'cancelled']"
                  :key="st"
                  type="button"
                  :class="[
                    'h-8 px-3 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                    orderFilter === st ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                  ]"
                  @click="orderFilter = st"
                >
                  {{ st === 'all' ? t.filterAll : statusLabel(st) }}
                </button>
              </div>
            </div>

            <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
              <div
                v-for="ord in filteredOrders"
                :key="ord.id"
                class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div class="space-y-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-xs font-bold">{{ ord.id }}</span>
                    <span class="text-xs font-bold text-[#1D1D1F]">{{ ord.customer }}</span>
                    <span class="text-xs font-mono text-[#6E6E73]">{{ ord.phone }}</span>
                    <span :class="['px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border', statusBadgeClass(ord.status)]">
                      {{ statusLabel(ord.status) }}
                    </span>
                  </div>
                  <p class="text-xs text-[#515154]">{{ ord.items }}</p>
                  <p class="text-[11px] text-[#86868B]">{{ ord.payment }} • {{ ord.time }}</p>
                </div>

                <div class="flex items-center gap-2.5 shrink-0">
                  <span class="text-sm font-extrabold tabular-nums">{{ ord.total }} {{ store.currency }}</span>
                  <select
                    :value="ord.status"
                    class="h-9 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] px-2.5 text-xs font-semibold cursor-pointer"
                    @change="updateOrderStatus(ord.id, $event.target.value)"
                  >
                    <option value="pending">{{ t.statusPending }}</option>
                    <option value="preparing">{{ t.statusPreparing }}</option>
                    <option value="ready">{{ t.statusReady }}</option>
                    <option value="delivered">{{ t.statusDelivered }}</option>
                    <option value="cancelled">{{ t.statusCancelled }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- PRODUCTS & MENU TAB -->
        <template v-else-if="activeTab === 'products'">
          <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navProducts }} ({{ filteredProducts.length }})</h2>
              <button
                type="button"
                class="h-9 px-4 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                @click="showAddProduct = !showAddProduct"
              >
                <Plus :size="14" />
                <span>{{ t.addProduct }}</span>
              </button>
            </div>

            <form
              v-if="showAddProduct"
              class="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] grid grid-cols-1 sm:grid-cols-4 gap-3"
              @submit.prevent="addProductItem"
            >
              <input
                v-model="newProduct.name"
                type="text"
                required
                :placeholder="t.productName"
                class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs sm:col-span-2"
              />
              <input
                v-model="newProduct.category"
                type="text"
                :placeholder="t.category"
                class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs"
              />
              <div class="flex gap-2">
                <input
                  v-model="newProduct.price"
                  type="number"
                  min="1"
                  required
                  :placeholder="t.price"
                  class="flex-1 h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs"
                />
                <button
                  type="submit"
                  class="h-10 px-4 rounded-xl bg-[#0066CC] text-white text-xs font-bold cursor-pointer"
                >
                  {{ t.save }}
                </button>
              </div>
            </form>

            <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
              <div
                v-for="p in filteredProducts"
                :key="p.id"
                class="p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <div class="text-xs font-bold text-[#1D1D1F]">{{ p.name }}</div>
                  <div class="text-[11px] text-[#6E6E73]">{{ p.category }} • <span class="font-mono">{{ p.id }}</span></div>
                </div>
                <div class="flex items-center gap-2.5">
                  <span class="text-xs font-extrabold tabular-nums">{{ p.price }} {{ store.currency }}</span>
                  <button
                    type="button"
                    :class="[
                      'h-8 px-3 rounded-full text-[11px] font-bold border cursor-pointer',
                      p.available ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'
                    ]"
                    @click="toggleProductAvailability(p.id)"
                  >
                    {{ p.available ? t.available : t.unavailable }}
                  </button>
                  <button
                    type="button"
                    class="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                    @click="deleteProduct(p.id)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- TELEGRAM BOT TAB -->
        <template v-else-if="activeTab === 'telegram'">
          <div class="max-w-2xl rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
            <div class="space-y-1">
              <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.telegramTitle }}</h2>
              <p class="text-xs text-[#6E6E73]">{{ t.telegramDesc }}</p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.botToken }}</label>
                <input
                  v-model="telegramConfig.botToken"
                  type="text"
                  placeholder="123456789:AAH..."
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.chatId }}</label>
                <input
                  v-model="telegramConfig.chatId"
                  type="text"
                  placeholder="-1001234567890"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              class="h-11 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
              @click="showToast(t.savedToast)"
            >
              {{ t.testBot }}
            </button>
          </div>
        </template>

        <!-- STRIPE PAYMENTS TAB -->
        <template v-else-if="activeTab === 'payments'">
          <div class="max-w-2xl rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
            <div class="space-y-1">
              <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.stripeTitle }}</h2>
              <p class="text-xs text-[#6E6E73]">{{ t.stripeDesc }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.stripeMode }}</label>
                <select
                  v-model="stripeConfig.mode"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-semibold"
                >
                  <option value="test">{{ t.testMode }}</option>
                  <option value="live">{{ t.liveMode }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.currency }}</label>
                <select
                  v-model="store.currency"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-semibold"
                >
                  <option value="SEK">SEK</option>
                  <option value="NOK">NOK</option>
                  <option value="DKK">DKK</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.publishableKey }}</label>
                <input
                  v-model="stripeConfig.publishableKey"
                  type="text"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.shippingFee }}</label>
                <input
                  v-model="store.shippingFee"
                  type="number"
                  min="0"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              class="h-11 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
              @click="showToast(t.savedToast)"
            >
              {{ t.save }}
            </button>
          </div>
        </template>

        <!-- SETTINGS & DOMAIN TAB -->
        <template v-else-if="activeTab === 'settings'">
          <div class="max-w-2xl rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
            <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.settingsTitle }}</h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.storeName }}</label>
                <input
                  v-model="store.name"
                  type="text"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.storeType }}</label>
                <select
                  v-model="store.type"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-semibold"
                >
                  <option value="restaurant">{{ t.typeRestaurant }}</option>
                  <option value="webshop">{{ t.typeWebshop }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.phone }}</label>
                <input
                  v-model="store.phone"
                  type="text"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.customDomain }}</label>
                <input
                  v-model="store.customDomain"
                  type="text"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.address }}</label>
                <input
                  v-model="store.address"
                  type="text"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              class="h-11 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
              @click="showToast(t.savedToast)"
            >
              {{ t.save }}
            </button>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>
