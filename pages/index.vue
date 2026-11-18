<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Send,
  CreditCard,
  Settings,
  Search,
  Menu,
  X,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Globe,
  TrendingUp,
  Clock,
  Lock,
  Phone,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  Truck,
  Mail,
  Eye,
  EyeOff,
  Upload,
  Tag,
  Utensils,
} from 'lucide-vue-next';
import { SELLER_LANGUAGES, TRANSLATIONS } from '~/utils/i18n';

const STORAGE_KEY = 'seller_pannel_v2';

const lang = ref('en');
const activeTab = ref('overview'); // 'overview' | 'orders' | 'products' | 'customers' | 'telegram' | 'payments' | 'settings'
const mobileNavOpen = ref(false);
const sidebarCollapsed = ref(false);
const settingsSubTab = ref('general'); // 'general' | 'locale' | 'business' | 'smtp'
const searchQuery = ref('');
const orderFilter = ref('all');
const categoryFilter = ref('all');
const selectedOrderId = ref('');
const toastMsg = ref('');

const STORE_COUNTRIES = [
  { id: 'se', name: 'Sweden', currency: 'SEK', lang: 'sv' },
  { id: 'no', name: 'Norway', currency: 'NOK', lang: 'no' },
  { id: 'dk', name: 'Denmark', currency: 'DKK', lang: 'da' },
  { id: 'fi', name: 'Finland', currency: 'EUR', lang: 'fi' },
  { id: 'de', name: 'Germany', currency: 'EUR', lang: 'de' },
  { id: 'at', name: 'Austria', currency: 'EUR', lang: 'de' },
  { id: 'nl', name: 'Netherlands', currency: 'EUR', lang: 'nl' },
  { id: 'fr', name: 'France', currency: 'EUR', lang: 'fr' },
];

const store = ref({
  name: 'Stockholm Bistro',
  type: 'restaurant',
  country: 'se',
  storefrontLangs: ['en', 'sv'],
  logoUrl: '',
  bannerUrl: '',
  brandColor: '#0066CC',
  isOpen: true,
  currency: 'SEK',
  shippingFee: 49,
  freeShippingOver: 500,
  phone: '+46 70 123 45 67',
  address: 'Sveavägen 42, Stockholm',
  customDomain: 'order.stockholmbistro.se',
  orgNumber: '559000-0000',
  instagram: '@stockholmbistro',
  receiptNote: 'Thank you for your order!',
});

const coupons = ref([
  { id: 'CPN-1', code: 'WELCOME10', percent: 10, active: true },
]);
const showCouponForm = ref(false);
const couponForm = ref({ code: '', percent: '' });

const stripeConfig = ref({
  mode: 'live',
  publishableKey: '',
});

const telegramConfig = ref({
  botToken: '',
  chatId: '',
});

const smtpConfig = ref({
  host: 'smtp.gmail.com',
  port: 587,
  security: 'TLS',
  username: '',
  password: '',
  fromEmail: 'orders@stockholmbistro.se',
});
const showSmtpPass = ref(false);

const shippingZones = ref([
  {
    id: 'ZN-1',
    name: 'City Center',
    range: '0 - 5 km',
    price: 49,
    estTime: '25-35 min',
    color: '#0066CC',
    points: [
      [59.341, 18.042],
      [59.342, 18.088],
      [59.318, 18.091],
      [59.316, 18.041],
    ],
  },
  {
    id: 'ZN-2',
    name: 'Greater Area',
    range: '5 - 12 km',
    price: 89,
    estTime: '40-55 min',
    color: '#059669',
    points: [
      [59.365, 18.012],
      [59.367, 18.122],
      [59.295, 18.125],
      [59.292, 18.010],
    ],
  },
]);
const showZoneForm = ref(false);
const zoneForm = ref({ name: '', range: '', price: '', estTime: '30 min', color: '#0066CC' });
const mapContainer = ref(null);
const draftPoints = ref([]);
let leafletMap = null;
let zoneLayerGroup = null;
let draftLayerGroup = null;

const countryRates = ref([
  { id: 'se', name: 'Sweden', price: 49, estDays: '1-2 days', enabled: true },
  { id: 'no', name: 'Norway', price: 99, estDays: '2-4 days', enabled: true },
  { id: 'dk', name: 'Denmark', price: 89, estDays: '2-3 days', enabled: true },
]);
const countryRateForm = ref({ id: 'fi', price: '119', estDays: '2-4 days' });

const restaurantConfig = ref({
  prepTime: 25,
  minOrder: 150,
  openingHours: 'Mon-Sun 11:00 - 22:00',
  pickupEnabled: true,
  deliveryEnabled: true,
  dineInEnabled: false,
});

const webshopConfig = ref({
  vatRate: 25,
  returnDays: 14,
  carrier: 'PostNord',
  trackStock: true,
  lowStockThreshold: 5,
});

const products = ref([
  { id: 'PRD-101', name: 'Grilled Lamb Plate', category: 'Main Course', price: 169, available: true, description: 'Served with rice and grilled tomato', image: '' },
  { id: 'PRD-102', name: 'Herb Stew Bowl', category: 'Main Course', price: 159, available: true, description: 'Slow-cooked herbs, kidney beans and rice', image: '' },
  { id: 'PRD-103', name: 'Chicken Skewers', category: 'Main Course', price: 149, available: true, description: 'Marinated chicken fillet with saffron', image: '' },
  { id: 'PRD-104', name: 'Pistachio Baklava', category: 'Desserts', price: 65, available: true, description: '4 pieces', image: '' },
  { id: 'PRD-105', name: 'Sparkling Mint Drink', category: 'Drinks', price: 35, available: false, description: '500ml bottle', image: '' },
]);

const orders = ref([
  {
    id: 'ORD-4821',
    customer: 'Emma Lindqvist',
    phone: '+46 70 441 12 90',
    address: 'Kungsgatan 18, Stockholm',
    deliveryType: 'Delivery',
    lines: [
      { name: 'Grilled Lamb Plate', qty: 2, price: 169 },
      { name: 'Sparkling Mint Drink', qty: 1, price: 35 },
    ],
    subtotal: 373,
    shipping: 49,
    total: 422,
    payment: 'Stripe',
    status: 'pending',
    time: '4m ago',
  },
  {
    id: 'ORD-4820',
    customer: 'Oskar Bergström',
    phone: '+46 73 882 10 44',
    address: 'Pickup at store',
    deliveryType: 'Pickup',
    lines: [
      { name: 'Chicken Skewers', qty: 1, price: 149 },
      { name: 'Pistachio Baklava', qty: 1, price: 65 },
    ],
    subtotal: 214,
    shipping: 0,
    total: 214,
    payment: 'Stripe',
    status: 'preparing',
    time: '18m ago',
  },
  {
    id: 'ORD-4819',
    customer: 'Sofia Holm',
    phone: '+46 76 210 99 31',
    address: 'Odengatan 64, Stockholm',
    deliveryType: 'Delivery',
    lines: [{ name: 'Herb Stew Bowl', qty: 3, price: 159 }],
    subtotal: 477,
    shipping: 49,
    total: 526,
    payment: 'Stripe',
    status: 'ready',
    time: '32m ago',
  },
  {
    id: 'ORD-4818',
    customer: 'Lukas Nyström',
    phone: '+46 72 904 55 18',
    address: 'Pickup at store',
    deliveryType: 'Pickup',
    lines: [{ name: 'Grilled Lamb Plate', qty: 2, price: 169 }],
    subtotal: 338,
    shipping: 0,
    total: 338,
    payment: 'Stripe',
    status: 'delivered',
    time: '1h ago',
  },
]);

const weeklyRevenue = [
  { day: 'Mon', amount: 1850 },
  { day: 'Tue', amount: 2340 },
  { day: 'Wed', amount: 1920 },
  { day: 'Thu', amount: 2890 },
  { day: 'Fri', amount: 3640 },
  { day: 'Sat', amount: 4120 },
  { day: 'Sun', amount: 3180 },
];

const showProductForm = ref(false);
const editingProductId = ref('');
const productForm = ref({ name: '', category: 'Main Course', price: '', description: '', image: '' });

const t = computed(() => TRANSLATIONS[lang.value] || TRANSLATIONS.en);

const showToast = (msg) => {
  toastMsg.value = msg;
  setTimeout(() => {
    toastMsg.value = '';
  }, 2200);
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
      if (parsed.smtpConfig) smtpConfig.value = { ...smtpConfig.value, ...parsed.smtpConfig };
      if (Array.isArray(parsed.shippingZones)) shippingZones.value = parsed.shippingZones;
      if (Array.isArray(parsed.countryRates)) countryRates.value = parsed.countryRates;
      if (Array.isArray(parsed.coupons)) coupons.value = parsed.coupons;
      if (parsed.restaurantConfig) restaurantConfig.value = { ...restaurantConfig.value, ...parsed.restaurantConfig };
      if (parsed.webshopConfig) webshopConfig.value = { ...webshopConfig.value, ...parsed.webshopConfig };
      if (Array.isArray(parsed.products)) products.value = parsed.products;
      if (Array.isArray(parsed.orders)) orders.value = parsed.orders;
    }
  } catch {}
});

watch(
  [lang, store, stripeConfig, telegramConfig, smtpConfig, shippingZones, countryRates, coupons, restaurantConfig, webshopConfig, products, orders],
  () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lang: lang.value,
          store: store.value,
          stripeConfig: stripeConfig.value,
          telegramConfig: telegramConfig.value,
          smtpConfig: smtpConfig.value,
          shippingZones: shippingZones.value,
          countryRates: countryRates.value,
          coupons: coupons.value,
          restaurantConfig: restaurantConfig.value,
          webshopConfig: webshopConfig.value,
          products: products.value,
          orders: orders.value,
        })
      );
    } catch {}
  },
  { deep: true }
);

const totalRevenue = computed(() =>
  weeklyRevenue.reduce((s, d) => s + d.amount, 0)
);

const maxChartAmount = computed(() =>
  Math.max(...weeklyRevenue.map((d) => d.amount), 1)
);

const activeOrdersCount = computed(() =>
  orders.value.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)).length
);

const avgOrderValue = computed(() => {
  const valid = orders.value.filter((o) => o.status !== 'cancelled');
  if (!valid.length) return 0;
  const sum = valid.reduce((s, o) => s + Number(o.total || 0), 0);
  return Math.round(sum / valid.length);
});

const orderCountsByStatus = computed(() => ({
  all: orders.value.length,
  pending: orders.value.filter((o) => o.status === 'pending').length,
  preparing: orders.value.filter((o) => o.status === 'preparing').length,
  ready: orders.value.filter((o) => o.status === 'ready').length,
  delivered: orders.value.filter((o) => o.status === 'delivered').length,
  cancelled: orders.value.filter((o) => o.status === 'cancelled').length,
}));

const filteredOrders = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return orders.value.filter((o) => {
    if (orderFilter.value !== 'all' && o.status !== orderFilter.value) return false;
    if (!q) return true;
    return (
      o.id.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      o.phone.toLowerCase().includes(q) ||
      o.lines.some((l) => l.name.toLowerCase().includes(q))
    );
  });
});

const selectedOrder = computed(() =>
  orders.value.find((o) => o.id === selectedOrderId.value) || null
);

const productCategories = computed(() => {
  const set = new Set(products.value.map((p) => p.category).filter(Boolean));
  return ['all', ...Array.from(set)];
});

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return products.value.filter((p) => {
    if (categoryFilter.value !== 'all' && p.category !== categoryFilter.value) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });
});

const customersList = computed(() => {
  const map = new Map();
  for (const o of orders.value) {
    const key = o.phone || o.customer;
    const existing = map.get(key) || {
      name: o.customer,
      phone: o.phone,
      address: o.address,
      ordersCount: 0,
      totalSpent: 0,
      lastOrder: o.time,
    };
    existing.ordersCount += 1;
    if (o.status !== 'cancelled') existing.totalSpent += Number(o.total || 0);
    map.set(key, existing);
  }
  const q = searchQuery.value.trim().toLowerCase();
  return Array.from(map.values()).filter((c) => {
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
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

const openNewProductForm = () => {
  editingProductId.value = '';
  productForm.value = { name: '', category: 'Main Course', price: '', description: '', image: '' };
  showProductForm.value = true;
};

const openEditProductForm = (p) => {
  editingProductId.value = p.id;
  productForm.value = {
    name: p.name,
    category: p.category,
    price: String(p.price),
    description: p.description || '',
    image: p.image || '',
  };
  showProductForm.value = true;
};

const saveProductForm = () => {
  const cleanName = productForm.value.name.trim();
  const numPrice = Number(productForm.value.price);
  if (!cleanName || Number.isNaN(numPrice) || numPrice <= 0) return;

  if (editingProductId.value) {
    products.value = products.value.map((p) =>
      p.id === editingProductId.value
        ? {
            ...p,
            name: cleanName,
            category: productForm.value.category.trim() || 'General',
            price: numPrice,
            description: productForm.value.description.trim(),
            image: productForm.value.image.trim(),
          }
        : p
    );
  } else {
    products.value = [
      {
        id: `PRD-${Math.floor(100 + Math.random() * 900)}`,
        name: cleanName,
        category: productForm.value.category.trim() || 'General',
        price: numPrice,
        description: productForm.value.description.trim(),
        image: productForm.value.image.trim(),
        available: true,
      },
      ...products.value,
    ];
  }

  showProductForm.value = false;
  editingProductId.value = '';
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

const renderMapZones = () => {
  const L = typeof window !== 'undefined' ? window.L : null;
  if (!L || !leafletMap || !zoneLayerGroup || !draftLayerGroup) return;

  zoneLayerGroup.clearLayers();
  for (const z of shippingZones.value) {
    if (Array.isArray(z.points) && z.points.length >= 3) {
      const poly = L.polygon(z.points, {
        color: z.color || '#0066CC',
        fillColor: z.color || '#0066CC',
        fillOpacity: 0.22,
        weight: 2,
      }).addTo(zoneLayerGroup);
      poly.bindTooltip(`${z.name} • ${z.price} ${store.value.currency}`, { sticky: true });
    }
  }

  draftLayerGroup.clearLayers();
  for (const pt of draftPoints.value) {
    L.circleMarker(pt, {
      radius: 5,
      color: '#1D1D1F',
      fillColor: zoneForm.value.color || '#0066CC',
      fillOpacity: 1,
      weight: 2,
    }).addTo(draftLayerGroup);
  }
  if (draftPoints.value.length >= 2) {
    L.polygon(draftPoints.value, {
      color: zoneForm.value.color || '#0066CC',
      dashArray: '6, 6',
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(draftLayerGroup);
  }
};

const initDeliveryMap = async () => {
  await nextTick();
  const L = typeof window !== 'undefined' ? window.L : null;
  if (!L || !mapContainer.value) return;

  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  leafletMap = L.map(mapContainer.value).setView([59.3293, 18.0686], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18,
  }).addTo(leafletMap);

  zoneLayerGroup = L.layerGroup().addTo(leafletMap);
  draftLayerGroup = L.layerGroup().addTo(leafletMap);

  leafletMap.on('click', (e) => {
    draftPoints.value = [...draftPoints.value, [Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))]];
    showZoneForm.value = true;
    renderMapZones();
  });

  renderMapZones();
};

watch([activeTab, () => store.value.type], ([tab, stType]) => {
  if (tab === 'shipping' && stType === 'restaurant') {
    setTimeout(initDeliveryMap, 80);
  }
});

const clearDraftPoints = () => {
  draftPoints.value = [];
  renderMapZones();
};

const addShippingZone = () => {
  const cleanName = zoneForm.value.name.trim();
  const numPrice = Number(zoneForm.value.price);
  if (!cleanName || Number.isNaN(numPrice) || numPrice < 0) return;
  shippingZones.value = [
    ...shippingZones.value,
    {
      id: `ZN-${Math.floor(10 + Math.random() * 90)}`,
      name: cleanName,
      range: zoneForm.value.range.trim() || `${draftPoints.value.length} map points`,
      price: numPrice,
      estTime: zoneForm.value.estTime.trim() || '30 min',
      color: zoneForm.value.color || '#0066CC',
      points: draftPoints.value.length >= 3 ? [...draftPoints.value] : [],
    },
  ];
  zoneForm.value = { name: '', range: '', price: '', estTime: '30 min', color: '#0066CC' };
  draftPoints.value = [];
  showZoneForm.value = false;
  renderMapZones();
  showToast(t.value.savedToast);
};

const deleteShippingZone = (id) => {
  shippingZones.value = shippingZones.value.filter((z) => z.id !== id);
  renderMapZones();
  showToast(t.value.savedToast);
};

const addCountryRate = () => {
  const countryObj = STORE_COUNTRIES.find((c) => c.id === countryRateForm.value.id);
  const priceNum = Number(countryRateForm.value.price);
  if (!countryObj || Number.isNaN(priceNum) || priceNum < 0) return;
  const existingIdx = countryRates.value.findIndex((c) => c.id === countryObj.id);
  const entry = {
    id: countryObj.id,
    name: countryObj.name,
    price: priceNum,
    estDays: countryRateForm.value.estDays.trim() || '2-4 days',
    enabled: true,
  };
  if (existingIdx >= 0) {
    countryRates.value = countryRates.value.map((c, i) => (i === existingIdx ? entry : c));
  } else {
    countryRates.value = [...countryRates.value, entry];
  }
  showToast(t.value.savedToast);
};

const toggleCountryRate = (id) => {
  countryRates.value = countryRates.value.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
  showToast(t.value.savedToast);
};

const deleteCountryRate = (id) => {
  countryRates.value = countryRates.value.filter((c) => c.id !== id);
  showToast(t.value.savedToast);
};

const handleImageUpload = (event, target) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || '');
    if (target === 'logo') store.value.logoUrl = dataUrl;
    else if (target === 'banner') store.value.bannerUrl = dataUrl;
    else if (target === 'product') productForm.value.image = dataUrl;
    showToast(t.value.savedToast);
  };
  reader.readAsDataURL(file);
};

const onCountryChange = (countryId) => {
  store.value.country = countryId;
  const match = STORE_COUNTRIES.find((c) => c.id === countryId);
  if (match) {
    store.value.currency = match.currency;
    if (!store.value.storefrontLangs.includes(match.lang)) {
      store.value.storefrontLangs = [...store.value.storefrontLangs, match.lang];
    }
  }
};

const toggleStorefrontLang = (code) => {
  if (store.value.storefrontLangs.includes(code)) {
    if (store.value.storefrontLangs.length <= 1) return;
    store.value.storefrontLangs = store.value.storefrontLangs.filter((c) => c !== code);
  } else {
    store.value.storefrontLangs = [...store.value.storefrontLangs, code];
  }
};

const addCouponItem = () => {
  const code = couponForm.value.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const percent = Number(couponForm.value.percent);
  if (!code || Number.isNaN(percent) || percent <= 0 || percent > 90) return;
  coupons.value = [{ id: `CPN-${Date.now()}`, code, percent, active: true }, ...coupons.value];
  couponForm.value = { code: '', percent: '' };
  showCouponForm.value = false;
  showToast(t.value.savedToast);
};

const toggleCoupon = (id) => {
  coupons.value = coupons.value.map((c) => (c.id === id ? { ...c, active: !c.active } : c));
  showToast(t.value.savedToast);
};

const deleteCoupon = (id) => {
  coupons.value = coupons.value.filter((c) => c.id !== id);
  showToast(t.value.savedToast);
};

const primaryNav = computed(() => [
  { id: 'overview', label: t.value.navOverview, icon: LayoutDashboard },
  { id: 'orders', label: t.value.navOrders, icon: ShoppingBag, badge: activeOrdersCount.value },
  { id: 'products', label: t.value.navProducts, icon: Package, badge: products.value.length },
  { id: 'customers', label: t.value.navCustomers, icon: Users, badge: customersList.value.length },
  { id: 'coupons', label: t.value.navCoupons, icon: Tag, badge: coupons.value.length },
]);

const setupNav = computed(() => [
  { id: 'shipping', label: t.value.navShipping, icon: Truck },
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
  <div class="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex lg:p-4 lg:gap-4" dir="ltr">
    <!-- Toast -->
    <div
      v-if="toastMsg"
      class="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-[#1D1D1F] text-white px-4 py-2.5 shadow-lg text-xs font-semibold"
    >
      <CheckCircle2 :size="15" class="text-emerald-400 shrink-0" />
      <span>{{ toastMsg }}</span>
    </div>

    <!-- Mobile Backdrop -->
    <div
      v-if="mobileNavOpen"
      class="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden"
      @click="mobileNavOpen = false"
    />

    <!-- Apple Floating Rounded Sidebar -->
    <aside
      :class="[
        'fixed inset-y-3 left-3 z-50 rounded-[28px] bg-[#FBFBFC]/95 backdrop-blur-xl border border-[#E5E5EA] shadow-[0_12px_36px_rgba(29,29,31,0.06)] text-[#1D1D1F] flex flex-col justify-between transition-all duration-200 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:translate-x-0 shrink-0',
        sidebarCollapsed ? 'lg:w-[76px] w-64' : 'w-64',
        mobileNavOpen ? 'translate-x-0' : '-translate-x-[115%]'
      ]"
    >
      <div :class="['space-y-4', sidebarCollapsed ? 'lg:px-3 lg:py-4 p-4' : 'p-4']">
        <!-- Brand & Collapse Toggle -->
        <div :class="['flex items-center px-1', sidebarCollapsed ? 'lg:justify-center justify-between' : 'justify-between']">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="h-9 w-9 rounded-2xl text-white flex items-center justify-center font-extrabold text-xs shrink-0 overflow-hidden shadow-[0_4px_12px_rgba(0,102,204,0.25)]"
              :style="{ backgroundColor: store.brandColor || '#0066CC' }"
            >
              <img v-if="store.logoUrl" :src="store.logoUrl" :alt="store.name" class="h-full w-full object-cover" />
              <span v-else>SP</span>
            </div>
            <div v-if="!sidebarCollapsed" class="min-w-0">
              <div class="text-sm font-extrabold tracking-tight text-[#1D1D1F] truncate">Seller pannel</div>
              <div class="text-[11px] text-[#86868B] truncate">{{ t.brandSub }}</div>
            </div>
          </div>

          <button
            type="button"
            class="hidden lg:flex h-8 w-8 rounded-full items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors cursor-pointer shrink-0"
            :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="sidebarCollapsed = !sidebarCollapsed"
          >
            <PanelLeftOpen v-if="sidebarCollapsed" :size="16" />
            <PanelLeftClose v-else :size="16" />
          </button>

          <button
            type="button"
            class="lg:hidden h-8 w-8 rounded-full flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7]"
            @click="mobileNavOpen = false"
          >
            <X :size="17" />
          </button>
        </div>

        <!-- Store Open / Closed Switch -->
        <button
          type="button"
          :title="store.isOpen ? t.storeOpen : t.storeClosed"
          :class="[
            'w-full rounded-2xl bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] py-2.5 flex items-center text-xs font-semibold transition-colors cursor-pointer',
            sidebarCollapsed ? 'lg:justify-center lg:px-0 px-3.5 justify-between' : 'px-3.5 justify-between'
          ]"
          @click="store.isOpen = !store.isOpen; showToast(t.savedToast)"
        >
          <span class="flex items-center gap-2">
            <span :class="['h-2 w-2 rounded-full shrink-0', store.isOpen ? 'bg-emerald-500' : 'bg-rose-500']" />
            <span v-if="!sidebarCollapsed" class="text-[#1D1D1F]">{{ store.isOpen ? t.storeOpen : t.storeClosed }}</span>
          </span>
          <span
            v-if="!sidebarCollapsed"
            :class="[
              'w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center',
              store.isOpen ? 'bg-emerald-500 justify-end' : 'bg-[#D2D2D7] justify-start'
            ]"
          >
            <span class="h-3.5 w-3.5 rounded-full bg-white shadow-xs block" />
          </span>
        </button>

        <!-- Primary Navigation Group -->
        <nav class="space-y-1">
          <button
            v-for="item in primaryNav"
            :key="item.id"
            type="button"
            :title="sidebarCollapsed ? item.label : undefined"
            :class="[
              'w-full flex items-center rounded-2xl text-xs font-semibold transition-all cursor-pointer',
              sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2.5 px-3.5 py-2.5 justify-between' : 'px-3.5 py-2.5 justify-between',
              activeTab === item.id
                ? 'bg-[#0066CC] text-white shadow-[0_4px_12px_rgba(0,102,204,0.22)]'
                : 'text-[#515154] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
            ]"
            @click="selectTab(item.id)"
          >
            <span class="flex items-center gap-2.5">
              <component :is="item.icon" :size="16" class="shrink-0" />
              <span v-if="!sidebarCollapsed">{{ item.label }}</span>
            </span>
            <span
              v-if="item.badge !== undefined && !sidebarCollapsed"
              :class="[
                'px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                activeTab === item.id ? 'bg-white/20 text-white' : 'bg-[#ECECEF] text-[#1D1D1F]'
              ]"
            >
              {{ item.badge }}
            </span>
          </button>
        </nav>

        <!-- Divider -->
        <div class="border-t border-[#E5E5EA] pt-3">
          <nav class="space-y-1">
            <button
              v-for="item in setupNav"
              :key="item.id"
              type="button"
              :title="sidebarCollapsed ? item.label : undefined"
              :class="[
                'w-full flex items-center rounded-2xl text-xs font-semibold transition-all cursor-pointer',
                sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2.5 px-3.5 py-2.5 justify-between' : 'px-3.5 py-2.5 justify-between',
                activeTab === item.id
                  ? 'bg-[#0066CC] text-white shadow-[0_4px_12px_rgba(0,102,204,0.22)]'
                  : 'text-[#515154] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
              ]"
              @click="selectTab(item.id)"
            >
              <span class="flex items-center gap-2.5">
                <component :is="item.icon" :size="16" class="shrink-0" />
                <span v-if="!sidebarCollapsed">{{ item.label }}</span>
              </span>
            </button>
          </nav>
        </div>
      </div>

      <!-- Footer Domain & SSL -->
      <div :class="['border-t border-[#E5E5EA] text-[11px] text-[#6E6E73]', sidebarCollapsed ? 'lg:p-3 p-4 flex justify-center' : 'p-4 space-y-1.5']">
        <a
          :href="`https://${store.customDomain}`"
          target="_blank"
          rel="noopener noreferrer"
          :title="store.customDomain"
          class="flex items-center justify-between gap-2 text-[#1D1D1F] hover:text-[#0066CC] font-semibold transition-colors"
        >
          <span v-if="!sidebarCollapsed" class="truncate font-mono">{{ store.customDomain }}</span>
          <ExternalLink :size="13" class="shrink-0 text-[#86868B]" />
        </a>
        <div v-if="!sidebarCollapsed" class="flex items-center gap-1.5 text-emerald-600 font-semibold">
          <Lock :size="12" />
          <span>{{ t.sslActive }}</span>
        </div>
      </div>
    </aside>

    <!-- Main Workspace -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Apple Floating Rounded Top Navbar -->
      <header class="sticky top-3 lg:top-4 z-30 mx-3 mt-3 lg:mx-0 lg:mt-0 h-14 rounded-[22px] bg-[#FBFBFC]/90 backdrop-blur-xl border border-[#E5E5EA] shadow-[0_6px_24px_rgba(29,29,31,0.04)] px-3.5 sm:px-5 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            class="lg:hidden h-9 w-9 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#1D1D1F]"
            @click="mobileNavOpen = true"
          >
            <Menu :size="17" />
          </button>

          <div class="relative w-full max-w-sm">
            <Search :size="14" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t.searchPlaceholder"
              class="w-full h-9 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] pl-9 pr-4 text-xs focus:bg-white focus:border-[#0066CC] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <!-- Dedicated Mode Switcher: Restaurant vs Online Shop -->
          <div class="hidden sm:inline-flex items-center p-1 rounded-full bg-[#F5F5F7] border border-[#E5E5EA]">
            <button
              type="button"
              :class="[
                'h-7 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all',
                store.type === 'restaurant' ? 'bg-[#0066CC] text-white shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              ]"
              @click="store.type = 'restaurant'; showToast(t.savedToast)"
            >
              <Utensils :size="12" />
              <span>{{ t.typeRestaurant }}</span>
            </button>
            <button
              type="button"
              :class="[
                'h-7 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all',
                store.type === 'webshop' ? 'bg-[#0066CC] text-white shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              ]"
              @click="store.type = 'webshop'; showToast(t.savedToast)"
            >
              <ShoppingBag :size="12" />
              <span>{{ t.typeWebshop }}</span>
            </button>
          </div>

          <div class="relative flex items-center">
            <Globe :size="14" class="absolute left-3 text-[#6E6E73] pointer-events-none" />
            <select
              v-model="lang"
              class="h-9 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] pl-8 pr-3 text-xs font-semibold text-[#1D1D1F] focus:border-[#0066CC] focus:outline-none cursor-pointer transition-colors"
            >
              <option v-for="l in SELLER_LANGUAGES" :key="l.code" :value="l.code">
                {{ l.flag }} {{ l.label }}
              </option>
            </select>
          </div>
        </div>
      </header>

      <main class="p-3 sm:p-4 lg:px-1 lg:pt-5 lg:pb-8 max-w-7xl w-full mx-auto space-y-5">
        <!-- OVERVIEW TAB -->
        <template v-if="activeTab === 'overview'">
          <!-- Page Title Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-xl font-extrabold text-[#1D1D1F]">{{ store.name }}</h1>
              <p class="text-xs text-[#6E6E73]">{{ store.address }}</p>
            </div>
            <button
              type="button"
              class="h-9 px-4 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              @click="activeTab = 'products'; openNewProductForm()"
            >
              <Plus :size="14" />
              <span>{{ t.addProduct }}</span>
            </button>
          </div>

          <!-- KPI Grid -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-[#6E6E73]">
                <span>{{ t.kpiRevenue }}</span>
                <TrendingUp :size="15" class="text-[#0066CC]" />
              </div>
              <div class="text-2xl font-extrabold tabular-nums">
                {{ totalRevenue.toLocaleString('en-US') }} {{ store.currency }}
              </div>
            </div>

            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-[#6E6E73]">
                <span>{{ t.kpiOrders }}</span>
                <Clock :size="15" class="text-amber-600" />
              </div>
              <div class="text-2xl font-extrabold tabular-nums">
                {{ activeOrdersCount }}
              </div>
            </div>

            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-[#6E6E73]">
                <span>{{ t.kpiProducts }}</span>
                <Package :size="15" class="text-emerald-600" />
              </div>
              <div class="text-2xl font-extrabold tabular-nums">
                {{ products.length }}
              </div>
            </div>

            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1.5">
              <div class="flex items-center justify-between text-xs font-semibold text-[#6E6E73]">
                <span>{{ t.kpiAvgOrder }}</span>
                <CreditCard :size="15" class="text-[#0066CC]" />
              </div>
              <div class="text-2xl font-extrabold tabular-nums">
                {{ avgOrderValue }} {{ store.currency }}
              </div>
            </div>
          </div>

          <!-- 7-Day Revenue Chart + Order Status Summary -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div class="lg:col-span-8 rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.revenueChart }}</h2>
                <span class="text-xs font-bold text-[#0066CC] tabular-nums">
                  {{ totalRevenue.toLocaleString('en-US') }} {{ store.currency }}
                </span>
              </div>

              <div class="h-44 flex items-end justify-between gap-2 sm:gap-3 pt-4">
                <div
                  v-for="d in weeklyRevenue"
                  :key="d.day"
                  class="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                >
                  <span class="text-[10px] font-bold text-[#6E6E73] opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                    {{ d.amount }}
                  </span>
                  <div class="w-full max-w-[38px] bg-[#F0F0F2] rounded-t-lg overflow-hidden flex items-end h-32">
                    <div
                      class="w-full bg-[#0066CC] group-hover:bg-[#0055AA] rounded-t-lg transition-all duration-300"
                      :style="{ height: `${Math.max(10, Math.round((d.amount / maxChartAmount) * 100))}%` }"
                    />
                  </div>
                  <span class="text-[11px] font-semibold text-[#6E6E73]">{{ d.day }}</span>
                </div>
              </div>
            </div>

            <div class="lg:col-span-4 rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-3">
              <h2 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.orderSummary }}</h2>
              <div class="divide-y divide-[#E5E5EA] text-xs">
                <div
                  v-for="st in ['pending', 'preparing', 'ready', 'delivered']"
                  :key="st"
                  class="py-2.5 flex items-center justify-between"
                >
                  <span :class="['px-2.5 py-0.5 rounded-full text-[11px] font-bold border', statusBadgeClass(st)]">
                    {{ statusLabel(st) }}
                  </span>
                  <span class="font-extrabold tabular-nums text-[#1D1D1F]">{{ orderCountsByStatus[st] }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Orders -->
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
              <button
                v-for="ord in orders.slice(0, 4)"
                :key="ord.id"
                type="button"
                class="w-full px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-[#F5F5F7]/70 transition-colors cursor-pointer"
                @click="selectedOrderId = ord.id; activeTab = 'orders'"
              >
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-[#1D1D1F]">{{ ord.id }}</span>
                    <span class="text-xs font-semibold text-[#1D1D1F]">{{ ord.customer }}</span>
                    <span class="text-[11px] text-[#86868B]">• {{ ord.time }}</span>
                  </div>
                  <p class="text-xs text-[#6E6E73]">{{ ord.lines.map((l) => `${l.qty}x ${l.name}`).join(', ') }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xs font-extrabold tabular-nums">{{ ord.total }} {{ store.currency }}</span>
                  <span :class="['px-2.5 py-0.5 rounded-full text-[11px] font-bold border', statusBadgeClass(ord.status)]">
                    {{ statusLabel(ord.status) }}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </template>

        <!-- ORDERS TAB -->
        <template v-else-if="activeTab === 'orders'">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div :class="[selectedOrder ? 'lg:col-span-7' : 'lg:col-span-12', 'rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4']">
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
                    {{ st === 'all' ? `${t.filterAll} (${orderCountsByStatus.all})` : `${statusLabel(st)} (${orderCountsByStatus[st]})` }}
                  </button>
                </div>
              </div>

              <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
                <div
                  v-for="ord in filteredOrders"
                  :key="ord.id"
                  :class="[
                    'p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors',
                    selectedOrderId === ord.id ? 'bg-[#0066CC]/[0.05]' : 'hover:bg-[#F5F5F7]/70'
                  ]"
                  @click="selectedOrderId = ord.id"
                >
                  <div class="space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-mono text-xs font-bold">{{ ord.id }}</span>
                      <span class="text-xs font-bold text-[#1D1D1F]">{{ ord.customer }}</span>
                      <span :class="['px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border', statusBadgeClass(ord.status)]">
                        {{ statusLabel(ord.status) }}
                      </span>
                    </div>
                    <p class="text-xs text-[#515154]">{{ ord.lines.map((l) => `${l.qty}x ${l.name}`).join(', ') }}</p>
                    <p class="text-[11px] text-[#86868B]">{{ ord.deliveryType }} • {{ ord.payment }} • {{ ord.time }}</p>
                  </div>

                  <div class="flex items-center gap-2.5 shrink-0" @click.stop>
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

            <!-- Order Detail Inspector -->
            <aside v-if="selectedOrder" class="lg:col-span-5 rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4 lg:sticky lg:top-20">
              <div class="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
                <div>
                  <div class="text-[11px] font-bold text-[#86868B]">{{ t.orderDetails }}</div>
                  <div class="text-base font-extrabold font-mono text-[#1D1D1F]">{{ selectedOrder.id }}</div>
                </div>
                <button
                  type="button"
                  class="h-8 w-8 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] flex items-center justify-center cursor-pointer"
                  @click="selectedOrderId = ''"
                >
                  <X :size="15" />
                </button>
              </div>

              <div class="space-y-2 text-xs">
                <div class="flex items-center gap-2 font-bold text-[#1D1D1F]">
                  <Users :size="14" class="text-[#6E6E73]" />
                  <span>{{ selectedOrder.customer }}</span>
                </div>
                <div class="flex items-center gap-2 text-[#515154] font-mono">
                  <Phone :size="14" class="text-[#6E6E73]" />
                  <a :href="`tel:${selectedOrder.phone}`" class="hover:text-[#0066CC]">{{ selectedOrder.phone }}</a>
                </div>
                <div class="flex items-center gap-2 text-[#515154]">
                  <MapPin :size="14" class="text-[#6E6E73]" />
                  <span>{{ selectedOrder.address }}</span>
                </div>
              </div>

              <div class="border-t border-[#E5E5EA] pt-3 space-y-2 text-xs">
                <div v-for="(line, i) in selectedOrder.lines" :key="i" class="flex justify-between">
                  <span>{{ line.qty }}x {{ line.name }}</span>
                  <span class="font-bold tabular-nums">{{ line.qty * line.price }} {{ store.currency }}</span>
                </div>
                <div class="pt-2 border-t border-[#E5E5EA] flex justify-between text-[#6E6E73]">
                  <span>{{ t.subtotal }}</span>
                  <span class="tabular-nums">{{ selectedOrder.subtotal }} {{ store.currency }}</span>
                </div>
                <div class="flex justify-between text-[#6E6E73]">
                  <span>{{ t.shippingFee }}</span>
                  <span class="tabular-nums">{{ selectedOrder.shipping }} {{ store.currency }}</span>
                </div>
                <div class="flex justify-between text-sm font-extrabold text-[#1D1D1F]">
                  <span>{{ t.total }}</span>
                  <span class="tabular-nums">{{ selectedOrder.total }} {{ store.currency }}</span>
                </div>
              </div>

              <div class="pt-2 flex flex-wrap gap-2">
                <button
                  v-if="selectedOrder.status === 'pending'"
                  type="button"
                  class="flex-1 h-10 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                  @click="updateOrderStatus(selectedOrder.id, 'preparing')"
                >
                  {{ t.markPreparing }}
                </button>
                <button
                  v-if="selectedOrder.status === 'preparing'"
                  type="button"
                  class="flex-1 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  @click="updateOrderStatus(selectedOrder.id, 'ready')"
                >
                  {{ t.markReady }}
                </button>
                <button
                  v-if="selectedOrder.status === 'ready'"
                  type="button"
                  class="flex-1 h-10 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold cursor-pointer"
                  @click="updateOrderStatus(selectedOrder.id, 'delivered')"
                >
                  {{ t.markDelivered }}
                </button>
              </div>
            </aside>
          </div>
        </template>

        <!-- PRODUCTS TAB -->
        <template v-else-if="activeTab === 'products'">
          <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-base font-extrabold text-[#1D1D1F] mr-2">{{ t.navProducts }} ({{ filteredProducts.length }})</h2>
                <button
                  v-for="cat in productCategories"
                  :key="cat"
                  type="button"
                  :class="[
                    'h-8 px-3 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                    categoryFilter === cat ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                  ]"
                  @click="categoryFilter = cat"
                >
                  {{ cat === 'all' ? t.filterAll : cat }}
                </button>
              </div>
              <button
                type="button"
                class="h-9 px-4 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                @click="openNewProductForm()"
              >
                <Plus :size="14" />
                <span>{{ t.addProduct }}</span>
              </button>
            </div>

            <!-- Add / Edit Product Form -->
            <form
              v-if="showProductForm"
              class="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              @submit.prevent="saveProductForm"
            >
              <div class="sm:col-span-2">
                <label class="block text-[11px] font-bold text-[#6E6E73] mb-1">{{ t.productName }} *</label>
                <input
                  v-model="productForm.name"
                  type="text"
                  required
                  class="w-full h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs"
                />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-[#6E6E73] mb-1">{{ t.category }}</label>
                <input
                  v-model="productForm.category"
                  type="text"
                  class="w-full h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs"
                />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-[#6E6E73] mb-1">{{ t.price }} ({{ store.currency }}) *</label>
                <input
                  v-model="productForm.price"
                  type="number"
                  min="1"
                  required
                  class="w-full h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs font-mono"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-[11px] font-bold text-[#6E6E73] mb-1">{{ t.description }}</label>
                <input
                  v-model="productForm.description"
                  type="text"
                  class="w-full h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-[11px] font-bold text-[#6E6E73] mb-1">{{ t.imageUrl }}</label>
                <div class="flex gap-2">
                  <input
                    v-model="productForm.image"
                    type="text"
                    placeholder="https://..."
                    class="flex-1 h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs font-mono"
                  />
                  <label class="h-10 px-3.5 rounded-xl bg-white hover:bg-[#ECECEF] border border-[#D2D2D7] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload :size="13" />
                    <span>{{ t.uploadImage }}</span>
                    <input type="file" accept="image/*" class="hidden" @change="handleImageUpload($event, 'product')" />
                  </label>
                </div>
              </div>
              <div class="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
                <button
                  type="button"
                  class="h-9 px-4 rounded-full bg-white border border-[#E5E5EA] text-xs font-bold cursor-pointer"
                  @click="showProductForm = false"
                >
                  {{ t.cancel }}
                </button>
                <button
                  type="submit"
                  class="h-9 px-5 rounded-full bg-[#0066CC] text-white text-xs font-bold cursor-pointer"
                >
                  {{ t.save }}
                </button>
              </div>
            </form>

            <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
              <div
                v-for="p in filteredProducts"
                :key="p.id"
                class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="h-11 w-11 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] overflow-hidden shrink-0 flex items-center justify-center text-[#86868B]">
                    <img v-if="p.image" :src="p.image" :alt="p.name" class="h-full w-full object-cover" />
                    <Package v-else :size="18" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-[#1D1D1F] truncate">{{ p.name }}</div>
                    <div class="text-[11px] text-[#6E6E73] truncate">
                      {{ p.category }} <span v-if="p.description">• {{ p.description }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-xs font-extrabold tabular-nums mr-1">{{ p.price }} {{ store.currency }}</span>
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
                    class="h-8 w-8 rounded-lg bg-[#F5F5F7] hover:bg-[#ECECEF] text-[#1D1D1F] flex items-center justify-center cursor-pointer"
                    @click="openEditProductForm(p)"
                  >
                    <Pencil :size="13" />
                  </button>
                  <button
                    type="button"
                    class="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                    @click="deleteProduct(p.id)"
                  >
                    <Trash2 :size="13" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- CUSTOMERS TAB -->
        <template v-else-if="activeTab === 'customers'">
          <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4">
            <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navCustomers }} ({{ customersList.length }})</h2>
            <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
              <div
                v-for="c in customersList"
                :key="c.phone || c.name"
                class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div class="text-xs font-bold text-[#1D1D1F]">{{ c.name }}</div>
                  <div class="text-[11px] text-[#6E6E73] font-mono">{{ c.phone }} • {{ c.address }}</div>
                </div>
                <div class="flex items-center gap-4 text-xs">
                  <span class="text-[#6E6E73]">{{ t.ordersCount }}: <strong class="text-[#1D1D1F] tabular-nums">{{ c.ordersCount }}</strong></span>
                  <span class="font-extrabold tabular-nums text-[#0066CC]">{{ c.totalSpent }} {{ store.currency }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- COUPONS TAB -->
        <template v-else-if="activeTab === 'coupons'">
          <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4 max-w-3xl">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navCoupons }} ({{ coupons.length }})</h2>
              <button
                type="button"
                class="h-9 px-4 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                @click="showCouponForm = !showCouponForm"
              >
                <Plus :size="14" />
                <span>{{ t.addCoupon }}</span>
              </button>
            </div>

            <form
              v-if="showCouponForm"
              class="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] grid grid-cols-1 sm:grid-cols-3 gap-3"
              @submit.prevent="addCouponItem"
            >
              <input
                v-model="couponForm.code"
                type="text"
                required
                :placeholder="t.couponCode"
                class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs font-mono uppercase"
              />
              <input
                v-model="couponForm.percent"
                type="number"
                min="1"
                max="90"
                required
                :placeholder="t.discountPercent"
                class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs font-mono"
              />
              <button type="submit" class="h-10 rounded-xl bg-[#0066CC] text-white text-xs font-bold cursor-pointer">
                {{ t.save }}
              </button>
            </form>

            <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
              <div
                v-for="c in coupons"
                :key="c.id"
                class="p-4 flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-3">
                  <span class="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#F5F5F7] border border-[#E5E5EA]">{{ c.code }}</span>
                  <span class="text-xs font-bold text-[#0066CC]">-{{ c.percent }}%</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    :class="[
                      'h-8 px-3 rounded-full text-[11px] font-bold border cursor-pointer',
                      c.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'
                    ]"
                    @click="toggleCoupon(c.id)"
                  >
                    {{ c.active ? t.available : t.unavailable }}
                  </button>
                  <button
                    type="button"
                    class="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                    @click="deleteCoupon(c.id)"
                  >
                    <Trash2 :size="13" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- SHIPPING & ZONES TAB -->
        <template v-else-if="activeTab === 'shipping'">
          <div class="space-y-5">
            <!-- Base Shipping Price & Free Threshold -->
            <div class="max-w-2xl rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-4">
              <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navShipping }}</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.shippingFee }} ({{ store.currency }})</label>
                  <input
                    v-model="store.shippingFee"
                    type="number"
                    min="0"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.freeShippingOver }} ({{ store.currency }})</label>
                  <input
                    v-model="store.freeShippingOver"
                    type="number"
                    min="0"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                @click="showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
            </div>

            <!-- RESTAURANT: Free OpenStreetMap Interactive Delivery Zone Drawer -->
            <div v-if="store.type === 'restaurant'" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4">
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.drawZoneMap }}</h3>
                  <p class="text-xs text-[#6E6E73] mt-0.5">{{ t.clickMapPoints }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    v-if="draftPoints.length > 0"
                    type="button"
                    class="h-9 px-3.5 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-xs font-semibold cursor-pointer"
                    @click="clearDraftPoints"
                  >
                    {{ t.clearPoints }} ({{ draftPoints.length }})
                  </button>
                  <button
                    type="button"
                    class="h-9 px-4 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    @click="showZoneForm = !showZoneForm"
                  >
                    <Plus :size="14" />
                    <span>{{ t.addZone }}</span>
                  </button>
                </div>
              </div>

              <!-- OpenStreetMap Canvas -->
              <div ref="mapContainer" class="w-full h-72 sm:h-80 rounded-2xl border border-[#E5E5EA] overflow-hidden z-10 bg-[#ECECEF]" />

              <form
                v-if="showZoneForm"
                class="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
                @submit.prevent="addShippingZone"
              >
                <input
                  v-model="zoneForm.name"
                  type="text"
                  required
                  :placeholder="t.zoneName"
                  class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs"
                />
                <input
                  v-model="zoneForm.price"
                  type="number"
                  min="0"
                  required
                  :placeholder="`${t.zonePrice} (${store.currency})`"
                  class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs font-mono"
                />
                <input
                  v-model="zoneForm.estTime"
                  type="text"
                  :placeholder="t.estTime"
                  class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs"
                />
                <input
                  v-model="zoneForm.color"
                  type="color"
                  class="h-10 w-full rounded-xl border border-[#D2D2D7] bg-white px-1 cursor-pointer"
                />
                <button type="submit" class="h-10 px-4 rounded-xl bg-[#0066CC] text-white text-xs font-bold cursor-pointer">
                  {{ t.save }}
                </button>
              </form>

              <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
                <div
                  v-for="z in shippingZones"
                  :key="z.id"
                  class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div class="flex items-center gap-3">
                    <span class="h-3.5 w-3.5 rounded-full shrink-0" :style="{ backgroundColor: z.color || '#0066CC' }" />
                    <div>
                      <div class="text-xs font-bold text-[#1D1D1F]">{{ z.name }}</div>
                      <div class="text-[11px] text-[#6E6E73]">
                        {{ z.points?.length ? `${z.points.length} pts` : z.range }} • {{ z.estTime }}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-extrabold tabular-nums text-[#0066CC]">{{ z.price }} {{ store.currency }}</span>
                    <button
                      type="button"
                      class="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                      @click="deleteShippingZone(z.id)"
                    >
                      <Trash2 :size="13" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- ONLINE SHOP: Country-Based Shipping & Pricing -->
            <div v-else class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4">
              <h3 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.countryShipping }} ({{ countryRates.length }})</h3>

              <form
                class="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] grid grid-cols-1 sm:grid-cols-4 gap-3"
                @submit.prevent="addCountryRate"
              >
                <select
                  v-model="countryRateForm.id"
                  class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs font-semibold"
                >
                  <option v-for="c in STORE_COUNTRIES" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <input
                  v-model="countryRateForm.price"
                  type="number"
                  min="0"
                  required
                  :placeholder="`${t.zonePrice} (${store.currency})`"
                  class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs font-mono"
                />
                <input
                  v-model="countryRateForm.estDays"
                  type="text"
                  :placeholder="t.estDays"
                  class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs"
                />
                <button type="submit" class="h-10 px-4 rounded-xl bg-[#0066CC] text-white text-xs font-bold cursor-pointer">
                  {{ t.addCountryRate }}
                </button>
              </form>

              <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
                <div
                  v-for="cr in countryRates"
                  :key="cr.id"
                  class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div class="text-xs font-bold text-[#1D1D1F]">{{ cr.name }}</div>
                    <div class="text-[11px] text-[#6E6E73]">{{ cr.estDays }}</div>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="text-xs font-extrabold tabular-nums text-[#0066CC]">{{ cr.price }} {{ store.currency }}</span>
                    <button
                      type="button"
                      :class="[
                        'h-8 px-3 rounded-full text-[11px] font-bold border cursor-pointer',
                        cr.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'
                      ]"
                      @click="toggleCountryRate(cr.id)"
                    >
                      {{ cr.enabled ? t.available : t.unavailable }}
                    </button>
                    <button
                      type="button"
                      class="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                      @click="deleteCountryRate(cr.id)"
                    >
                      <Trash2 :size="13" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- TELEGRAM TAB -->
        <template v-else-if="activeTab === 'telegram'">
          <div class="max-w-xl rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
            <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navTelegram }}</h2>
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
              class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
              @click="showToast(t.savedToast)"
            >
              {{ t.save }}
            </button>
          </div>
        </template>

        <!-- STRIPE PAYMENTS TAB -->
        <template v-else-if="activeTab === 'payments'">
          <div class="max-w-xl rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
            <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navPayments }}</h2>
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
                  placeholder="pk_live_..."
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
              <div>
                <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.freeShippingOver }}</label>
                <input
                  v-model="store.freeShippingOver"
                  type="number"
                  min="0"
                  class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                />
              </div>
            </div>
            <button
              type="button"
              class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
              @click="showToast(t.savedToast)"
            >
              {{ t.save }}
            </button>
          </div>
        </template>

        <!-- SETTINGS TAB -->
        <template v-else-if="activeTab === 'settings'">
          <div class="space-y-5 max-w-3xl">
            <!-- Clean Apple Segmented Sub-Navigation (Prevents Mixing Settings) -->
            <div class="inline-flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA]">
              <button
                type="button"
                :class="[
                  'h-9 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all',
                  settingsSubTab === 'general' ? 'bg-[#0066CC] text-white shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'general'"
              >
                {{ t.brandingTitle }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all',
                  settingsSubTab === 'locale' ? 'bg-[#0066CC] text-white shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'locale'"
              >
                {{ t.countryCurrencyTitle }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all',
                  settingsSubTab === 'business' ? 'bg-[#0066CC] text-white shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'business'"
              >
                {{ store.type === 'restaurant' ? t.restaurantSettings : t.webshopSettings }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all',
                  settingsSubTab === 'smtp' ? 'bg-[#0066CC] text-white shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'smtp'"
              >
                {{ t.smtpSettings }}
              </button>
            </div>

            <!-- SUB-TAB 1: LOGO, BRANDING & STORE PROFILE -->
            <div v-if="settingsSubTab === 'general'" class="space-y-5">
            <!-- Logo & Branding Upload -->
            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
              <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.brandingTitle }}</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <!-- Logo Upload -->
                <div class="space-y-2.5">
                  <label class="block text-xs font-bold text-[#1D1D1F]">{{ t.uploadLogo }}</label>
                  <div class="flex items-center gap-3">
                    <div
                      class="h-16 w-16 rounded-2xl border border-[#E5E5EA] bg-[#F5F5F7] overflow-hidden flex items-center justify-center shrink-0 font-extrabold text-sm text-white"
                      :style="{ backgroundColor: store.logoUrl ? '#F5F5F7' : (store.brandColor || '#0066CC') }"
                    >
                      <img v-if="store.logoUrl" :src="store.logoUrl" :alt="store.name" class="h-full w-full object-cover" />
                      <span v-else>SP</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <label class="h-9 px-3.5 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                        <Upload :size="13" />
                        <span>{{ t.uploadLogo }}</span>
                        <input type="file" accept="image/*" class="hidden" @change="handleImageUpload($event, 'logo')" />
                      </label>
                      <button
                        v-if="store.logoUrl"
                        type="button"
                        class="h-9 px-3 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold cursor-pointer"
                        @click="store.logoUrl = ''; showToast(t.savedToast)"
                      >
                        {{ t.remove }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Brand Color -->
                <div class="space-y-2.5">
                  <label class="block text-xs font-bold text-[#1D1D1F]">{{ t.brandColor }}</label>
                  <div class="flex items-center gap-2 flex-wrap">
                    <button
                      v-for="clr in ['#0066CC', '#1D1D1F', '#059669', '#DC2626', '#D97706']"
                      :key="clr"
                      type="button"
                      class="h-8 w-8 rounded-full border-2 cursor-pointer transition-transform"
                      :class="store.brandColor === clr ? 'border-[#1D1D1F] scale-110' : 'border-white'"
                      :style="{ backgroundColor: clr }"
                      @click="store.brandColor = clr; showToast(t.savedToast)"
                    />
                    <input
                      v-model="store.brandColor"
                      type="color"
                      class="h-8 w-10 rounded-lg border border-[#E5E5EA] bg-white cursor-pointer"
                    />
                  </div>
                </div>

                <!-- Cover Banner Upload -->
                <div class="sm:col-span-2 space-y-2.5">
                  <label class="block text-xs font-bold text-[#1D1D1F]">{{ t.uploadBanner }}</label>
                  <div v-if="store.bannerUrl" class="relative h-32 w-full rounded-2xl overflow-hidden border border-[#E5E5EA] bg-[#F5F5F7]">
                    <img :src="store.bannerUrl" :alt="store.name" class="h-full w-full object-cover" />
                    <button
                      type="button"
                      class="absolute top-2 right-2 h-8 px-3 rounded-full bg-black/70 text-white text-xs font-semibold cursor-pointer"
                      @click="store.bannerUrl = ''; showToast(t.savedToast)"
                    >
                      {{ t.remove }}
                    </button>
                  </div>
                  <label class="h-10 px-4 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload :size="14" />
                    <span>{{ t.uploadBanner }}</span>
                    <input type="file" accept="image/*" class="hidden" @change="handleImageUpload($event, 'banner')" />
                  </label>
                </div>
              </div>
            </div>

            <!-- SUB-TAB 2: Country, Storefront Languages & Currency -->
            <div v-if="settingsSubTab === 'locale'" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
              <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.countryCurrencyTitle }}</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.country }}</label>
                  <select
                    :value="store.country"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-semibold"
                    @change="onCountryChange($event.target.value)"
                  >
                    <option v-for="c in STORE_COUNTRIES" :key="c.id" :value="c.id">{{ c.name }}</option>
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
                <div class="sm:col-span-2 space-y-2">
                  <label class="block text-xs font-bold text-[#1D1D1F]">{{ t.storefrontLangs }}</label>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="l in SELLER_LANGUAGES"
                      :key="l.code"
                      type="button"
                      :class="[
                        'h-9 px-3.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors',
                        store.storefrontLangs.includes(l.code)
                          ? 'bg-[#0066CC] text-white border-[#0066CC]'
                          : 'bg-[#F5F5F7] text-[#515154] border-[#E5E5EA]'
                      ]"
                      @click="toggleStorefrontLang(l.code)"
                    >
                      {{ l.flag }} {{ l.label }}
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                @click="showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
            </div>

            <!-- General Store & Business Type Selector -->
            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
              <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navSettings }}</h2>
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
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.orgNumber }}</label>
                  <input
                    v-model="store.orgNumber"
                    type="text"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.instagram }}</label>
                  <input
                    v-model="store.instagram"
                    type="text"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs"
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
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.receiptNote }}</label>
                  <input
                    v-model="store.receiptNote"
                    type="text"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs"
                  />
                </div>
              </div>
              <button
                type="button"
                class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                @click="showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
            </div>
            </div>

            <!-- SUB-TAB 3: Conditional Business-Specific Settings (Restaurant OR Online Shop ONLY) -->
            <div v-if="settingsSubTab === 'business'">
            <div v-if="store.type === 'restaurant'" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
              <h3 class="text-base font-extrabold text-[#1D1D1F]">{{ t.restaurantSettings }}</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.prepTime }}</label>
                  <input
                    v-model="restaurantConfig.prepTime"
                    type="number"
                    min="5"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.minOrder }} ({{ store.currency }})</label>
                  <input
                    v-model="restaurantConfig.minOrder"
                    type="number"
                    min="0"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.openingHours }}</label>
                  <input
                    v-model="restaurantConfig.openingHours"
                    type="text"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs"
                  />
                </div>
              </div>
              <div class="flex flex-wrap gap-3 pt-1">
                <label class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-semibold cursor-pointer">
                  <input v-model="restaurantConfig.pickupEnabled" type="checkbox" class="accent-[#0066CC]" />
                  <span>{{ t.pickupEnabled }}</span>
                </label>
                <label class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-semibold cursor-pointer">
                  <input v-model="restaurantConfig.deliveryEnabled" type="checkbox" class="accent-[#0066CC]" />
                  <span>{{ t.deliveryEnabled }}</span>
                </label>
                <label class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-semibold cursor-pointer">
                  <input v-model="restaurantConfig.dineInEnabled" type="checkbox" class="accent-[#0066CC]" />
                  <span>{{ t.dineInEnabled }}</span>
                </label>
              </div>
              <button
                type="button"
                class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                @click="showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
            </div>

            <div v-else class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
              <h3 class="text-base font-extrabold text-[#1D1D1F]">{{ t.webshopSettings }}</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.vatRate }}</label>
                  <input
                    v-model="webshopConfig.vatRate"
                    type="number"
                    min="0"
                    max="100"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.returnDays }}</label>
                  <input
                    v-model="webshopConfig.returnDays"
                    type="number"
                    min="0"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.carrier }}</label>
                  <select
                    v-model="webshopConfig.carrier"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-semibold"
                  >
                    <option value="PostNord">PostNord</option>
                    <option value="DHL">DHL</option>
                    <option value="Bring">Bring</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.lowStockThreshold }}</label>
                  <input
                    v-model="webshopConfig.lowStockThreshold"
                    type="number"
                    min="0"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
              </div>
              <label class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-semibold cursor-pointer">
                <input v-model="webshopConfig.trackStock" type="checkbox" class="accent-[#0066CC]" />
                <span>{{ t.trackStock }}</span>
              </label>
              <div>
                <button
                  type="button"
                  class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                  @click="showToast(t.savedToast)"
                >
                  {{ t.save }}
                </button>
              </div>
            </div>
            </div>

            <!-- SUB-TAB 4: SMTP Email Settings -->
            <div v-if="settingsSubTab === 'smtp'" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
              <div class="flex items-center gap-2">
                <Mail :size="17" class="text-[#0066CC]" />
                <h3 class="text-base font-extrabold text-[#1D1D1F]">{{ t.smtpSettings }}</h3>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.smtpHost }}</label>
                  <input
                    v-model="smtpConfig.host"
                    type="text"
                    placeholder="smtp.gmail.com"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.smtpPort }}</label>
                  <input
                    v-model="smtpConfig.port"
                    type="number"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.smtpSecurity }}</label>
                  <select
                    v-model="smtpConfig.security"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-semibold"
                  >
                    <option value="TLS">TLS / STARTTLS</option>
                    <option value="SSL">SSL</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.smtpUser }}</label>
                  <input
                    v-model="smtpConfig.username"
                    type="text"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.smtpPass }}</label>
                  <div class="relative">
                    <input
                      v-model="smtpConfig.password"
                      :type="showSmtpPass ? 'text' : 'password'"
                      class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] pl-3.5 pr-9 text-xs font-mono"
                    />
                    <button
                      type="button"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                      @click="showSmtpPass = !showSmtpPass"
                    >
                      <EyeOff v-if="showSmtpPass" :size="15" />
                      <Eye v-else :size="15" />
                    </button>
                  </div>
                </div>
                <div class="sm:col-span-3">
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.fromEmail }}</label>
                  <input
                    v-model="smtpConfig.fromEmail"
                    type="email"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                @click="showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>
