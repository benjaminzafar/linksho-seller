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
  Store,
  Rocket,
  Terminal,
  Copy,
  BarChart3,
  Download,
  Check,
  XCircle,
  RefreshCw,
  Code2,
  Bell,
} from 'lucide-vue-next';
import { SELLER_LANGUAGES, TRANSLATIONS } from '~/utils/i18n';

const STORAGE_KEY = 'seller_pannel_v5';

const lang = ref('en');
const activeTab = ref('orders'); // 'orders' | 'menu' | 'reports' | 'settings'
const mobileNavOpen = ref(false);
const sidebarCollapsed = ref(false);
const settingsSubTab = ref('profile'); // 'profile' | 'delivery' | 'notifications' | 'stripe' | 'api' | 'install'
const searchQuery = ref('');
const orderFilter = ref('all');
const orderTypeFilter = ref('all'); // 'all' | 'Delivery' | 'Pickup'
const categoryFilter = ref('all');
const selectedOrderId = ref('');
const acceptingOrderId = ref('');
const customPrepMinutes = ref('35');
const reportPeriod = ref('month'); // 'month' | '6months' | 'year'
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
  enabled: true,
  mode: 'test',
  publishableKey: '',
  secretKey: '',
});
const showStripeSecret = ref(false);

const telegramConfig = ref({
  botToken: '',
  chatId: '',
});
const testingTelegram = ref(false);
const telegramTestFeedback = ref({ ok: false, msg: '' });

const smtpConfig = ref({
  host: 'smtp.gmail.com',
  port: 587,
  security: 'TLS',
  username: '',
  password: '',
  fromEmail: 'orders@stockholmbistro.se',
  resendApiKey: '',
  webhookUrl: '',
});
const showSmtpPass = ref(false);
const workerSyncing = ref(false);
const workerSyncMsg = ref('');

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

const restaurantConfig = ref({
  prepTime: 30,
  minOrder: 150,
  maxDeliveryKm: 10,
  openingHours: 'Mon-Sun 11:00 - 22:00',
  pickupEnabled: true,
  deliveryEnabled: true,
});

const categories = ref(['Main Course', 'Sides', 'Desserts', 'Drinks']);
const newCategoryName = ref('');

const installation = ref({
  installed: false,
  setupCompleted: false,
  workerUrl: '',
  apiKey: '',
  pinCode: '',
  installedAt: '',
});

const showSetupWizard = ref(false);
const wizardStep = ref(1);
const installStep = ref(1);
const installDeploying = ref(false);
const installError = ref('');
const cfDeployToken = ref('');
const cfDeployEmail = ref('');

const products = ref([
  { id: 'PRD-101', name: 'Grilled Lamb Plate', category: 'Main Course', price: 169, available: true, description: 'Served with rice and grilled tomato', image: '' },
  { id: 'PRD-102', name: 'Herb Stew Bowl', category: 'Main Course', price: 159, available: true, description: 'Slow-cooked herbs, kidney beans and rice', image: '' },
  { id: 'PRD-103', name: 'Chicken Skewers', category: 'Main Course', price: 149, available: true, description: 'Marinated chicken fillet with saffron', image: '' },
  { id: 'PRD-104', name: 'Pistachio Baklava', category: 'Desserts', price: 65, available: true, description: '4 pieces', image: '' },
  { id: 'PRD-105', name: 'Sparkling Mint Drink', category: 'Drinks', price: 35, available: false, description: '500ml bottle', image: '' },
]);

const daysAgoIso = (days) => new Date(Date.now() - days * 86400000).toISOString();

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
    prepMinutes: null,
    estimatedReadyAt: '',
    time: '4m ago',
    createdAt: daysAgoIso(0),
  },
  {
    id: 'ORD-4820',
    customer: 'Oskar Bergström',
    phone: '+46 73 882 10 44',
    address: 'Takeaway at restaurant',
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
    prepMinutes: 30,
    estimatedReadyAt: '19:10',
    time: '18m ago',
    createdAt: daysAgoIso(0),
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
    status: 'pending',
    prepMinutes: null,
    estimatedReadyAt: '',
    time: '8m ago',
    createdAt: daysAgoIso(0),
  },
  {
    id: 'ORD-4818',
    customer: 'Lukas Nyström',
    phone: '+46 72 904 55 18',
    address: 'Takeaway at restaurant',
    deliveryType: 'Pickup',
    lines: [{ name: 'Grilled Lamb Plate', qty: 2, price: 169 }],
    subtotal: 338,
    shipping: 0,
    total: 338,
    payment: 'Stripe',
    status: 'delivered',
    prepMinutes: 30,
    estimatedReadyAt: '18:10',
    time: '3 days ago',
    createdAt: daysAgoIso(3),
  },
  {
    id: 'ORD-4710',
    customer: 'Emma Lindqvist',
    phone: '+46 70 441 12 90',
    address: 'Kungsgatan 18, Stockholm',
    deliveryType: 'Delivery',
    lines: [{ name: 'Grilled Lamb Plate', qty: 4, price: 169 }],
    subtotal: 676,
    shipping: 49,
    total: 725,
    payment: 'Stripe',
    status: 'delivered',
    prepMinutes: 40,
    estimatedReadyAt: '20:15',
    time: '3 months ago',
    createdAt: daysAgoIso(92),
  },
  {
    id: 'ORD-4502',
    customer: 'Maja Ekström',
    phone: '+46 70 998 11 22',
    address: 'Sveavägen 90, Stockholm',
    deliveryType: 'Delivery',
    lines: [{ name: 'Chicken Skewers', qty: 5, price: 149 }],
    subtotal: 745,
    shipping: 49,
    total: 794,
    payment: 'Stripe',
    status: 'delivered',
    prepMinutes: 60,
    estimatedReadyAt: '19:45',
    time: '8 months ago',
    createdAt: daysAgoIso(240),
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

const t = computed(() => ({ ...TRANSLATIONS.en, ...(TRANSLATIONS[lang.value] || {}) }));

const copyText = async (val) => {
  if (!val) return;
  try {
    await navigator.clipboard.writeText(String(val));
    showToast('Copied');
  } catch {}
};

const workerBaseUrl = computed(() => String(installation.value.workerUrl || '').trim().replace(/\/+$/, ''));

const workerFetch = async (path, opts = {}) => {
  if (!workerBaseUrl.value || !installation.value.pinCode) return null;
  const res = await fetch(`${workerBaseUrl.value}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-seller-pin': installation.value.pinCode,
      ...(opts.headers || {}),
    },
  });
  return res.json().catch(() => null);
};

const syncSettingsToWorker = async (silent = false) => {
  if (!workerBaseUrl.value || !installation.value.pinCode) {
    if (!silent) showToast('Deploy or connect a Worker first');
    return;
  }
  workerSyncing.value = true;
  workerSyncMsg.value = '';
  try {
    const res = await workerFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        name: store.value.name,
        isOpen: store.value.isOpen,
        logoUrl: store.value.logoUrl,
        bannerUrl: store.value.bannerUrl,
        brandColor: store.value.brandColor,
        currency: store.value.currency,
        shippingFee: store.value.shippingFee,
        freeShippingOver: store.value.freeShippingOver,
        minOrder: restaurantConfig.value.minOrder,
        maxDeliveryKm: restaurantConfig.value.maxDeliveryKm,
        openingHours: restaurantConfig.value.openingHours,
        deliveryEnabled: restaurantConfig.value.deliveryEnabled,
        pickupEnabled: restaurantConfig.value.pickupEnabled,
        deliveryZones: shippingZones.value,
        categories: categories.value,
        coupons: coupons.value,
        telegram: telegramConfig.value,
        smtp: smtpConfig.value,
        stripe: stripeConfig.value,
        phone: store.value.phone,
        address: store.value.address,
        instagram: store.value.instagram,
        receiptNote: store.value.receiptNote,
      }),
    });
    if (res?.ok) {
      workerSyncMsg.value = 'Synced to Cloudflare Worker';
      if (!silent) showToast('Synced to Worker');
    } else if (!silent) {
      workerSyncMsg.value = res?.error || 'Sync failed';
    }
  } catch (err) {
    if (!silent) workerSyncMsg.value = err?.message || 'Sync failed';
  } finally {
    workerSyncing.value = false;
  }
};

const pullFromWorker = async () => {
  if (!workerBaseUrl.value || !installation.value.pinCode) return;
  workerSyncing.value = true;
  workerSyncMsg.value = '';
  try {
    const res = await workerFetch('/api/admin/overview');
    if (res?.ok && Array.isArray(res.orders)) {
      const mappedOrders = res.orders.map((o) => ({
        id: o.id,
        customer: o.customerName,
        phone: o.customerPhone,
        address: o.customerAddress || (o.deliveryType === 'pickup' ? 'Takeaway at restaurant' : ''),
        deliveryType: o.deliveryType === 'pickup' ? 'Pickup' : 'Delivery',
        lines: (o.items || []).map((i) => ({ name: i.title || i.name, qty: Number(i.qty) || 1, price: Number(i.unitPrice || i.price) || 0 })),
        subtotal: Number(o.subtotal) || 0,
        shipping: Number(o.shippingFee) || 0,
        total: Number(o.totalAmount) || 0,
        payment: o.paymentMethod === 'stripe' ? `Stripe (${o.paymentStatus || 'unpaid'})` : 'Pay on delivery/pickup',
        status: o.status || 'pending',
        prepMinutes: o.prepMinutes || null,
        estimatedReadyAt: o.estimatedReadyAt || '',
        time: o.createdAt ? new Date(o.createdAt).toLocaleString() : 'Live',
        createdAt: o.createdAt || new Date().toISOString(),
      }));
      if (mappedOrders.length > 0) {
        orders.value = mappedOrders;
      }
      workerSyncMsg.value = `Synced ${mappedOrders.length} live order(s)`;
      showToast('Live orders synced');
    } else {
      workerSyncMsg.value = res?.error || 'Could not pull from Worker';
    }
  } catch (err) {
    workerSyncMsg.value = err?.message || 'Worker connection failed';
  } finally {
    workerSyncing.value = false;
  }
};

const sendTestTelegram = async () => {
  telegramTestFeedback.value = { ok: false, msg: '' };
  testingTelegram.value = true;
  try {
    let res;
    if (workerBaseUrl.value && installation.value.pinCode) {
      res = await workerFetch('/api/admin/test-telegram', {
        method: 'POST',
        body: JSON.stringify({
          botToken: telegramConfig.value.botToken,
          chatId: telegramConfig.value.chatId,
        }),
      });
    } else {
      res = await $fetch('/api/notifications/test-telegram', {
        method: 'POST',
        body: {
          botToken: telegramConfig.value.botToken,
          chatId: telegramConfig.value.chatId,
          name: store.value.name,
        },
      });
    }
    if (res?.ok) {
      telegramTestFeedback.value = { ok: true, msg: res.message || 'Test notification sent to Telegram!' };
      showToast('Telegram test sent');
    } else {
      telegramTestFeedback.value = { ok: false, msg: res?.error || 'Telegram test failed.' };
    }
  } catch (err) {
    telegramTestFeedback.value = { ok: false, msg: err?.data?.error || err?.message || 'Telegram test failed.' };
  } finally {
    testingTelegram.value = false;
  }
};

const storefrontPreviewJson = computed(() =>
  JSON.stringify(
    {
      ok: true,
      store: {
        name: store.value.name,
        isOpen: store.value.isOpen,
        currency: store.value.currency,
        shippingFee: Number(store.value.shippingFee) || 0,
        freeShippingOver: Number(store.value.freeShippingOver) || 0,
        maxDeliveryKm: Number(restaurantConfig.value.maxDeliveryKm) || 10,
        deliveryEnabled: restaurantConfig.value.deliveryEnabled,
        pickupEnabled: restaurantConfig.value.pickupEnabled,
        stripe: {
          enabled: stripeConfig.value.enabled,
          mode: stripeConfig.value.mode,
          publishableKey: stripeConfig.value.publishableKey || 'pk_test_...',
        },
      },
      categories: categories.value,
      deliveryZones: shippingZones.value.map((z) => ({ id: z.id, name: z.name, price: z.price, estTime: z.estTime })),
      products: products.value.filter((p) => p.available).map((p) => ({
        id: p.id,
        title: p.name,
        category: p.category,
        price: p.price,
        description: p.description,
      })),
    },
    null,
    2
  )
);

const frontendFetchSnippet = computed(() => {
  const base = workerBaseUrl.value || 'https://your-worker.workers.dev';
  const key = installation.value.apiKey || 'sk_live_YOUR_API_KEY';
  return `// 1. Load Restaurant Menu & Stripe Publishable Key
const res = await fetch('${base}/api/storefront?key=${key}');
const { store, categories, products } = await res.json();

// 2. Check Customer Delivery Location (optional lat/lng)
const check = await fetch('${base}/api/delivery/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey: '${key}', lat: 59.33, lng: 18.06 })
}).then(r => r.json());

// 3. Checkout & Pay with Stripe
const pay = await fetch('${base}/api/stripe/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: '${key}',
    customerName: 'Emma Lindqvist',
    customerPhone: '+46 70 441 12 90',
    customerAddress: 'Kungsgatan 18, Stockholm',
    deliveryType: 'delivery',
    items: [{ productId: products[0]?.id, qty: 1 }],
    successUrl: window.location.origin + '/order-success',
    cancelUrl: window.location.origin + '/cart'
  })
}).then(r => r.json());
if (pay.checkoutUrl) window.location.href = pay.checkoutUrl;

// 4. Track Order Acceptance & Estimated Preparation Time
const status = await fetch('${base}/api/orders/status?id=' + pay.orderId + '&key=${key}').then(r => r.json());
// status.order => { status: 'preparing', prepMinutes: 30, estimatedReadyAt: '19:45' }`;
});

const deployPanelToCloudflare = async () => {
  installError.value = '';
  installDeploying.value = true;
  try {
    const res = await $fetch('/api/cloudflare/deploy', {
      method: 'POST',
      body: {
        name: store.value.name,
        type: 'restaurant',
        isOpen: store.value.isOpen,
        currency: store.value.currency,
        shippingFee: store.value.shippingFee,
        freeShippingOver: store.value.freeShippingOver,
        minOrder: restaurantConfig.value.minOrder,
        maxDeliveryKm: restaurantConfig.value.maxDeliveryKm,
        openingHours: restaurantConfig.value.openingHours,
        deliveryEnabled: restaurantConfig.value.deliveryEnabled,
        pickupEnabled: restaurantConfig.value.pickupEnabled,
        deliveryZones: shippingZones.value,
        categories: categories.value,
        coupons: coupons.value,
        telegram: telegramConfig.value,
        smtp: smtpConfig.value,
        stripe: stripeConfig.value,
        products: products.value,
        logoUrl: store.value.logoUrl,
        bannerUrl: store.value.bannerUrl,
        brandColor: store.value.brandColor,
        phone: store.value.phone,
        address: store.value.address,
        instagram: store.value.instagram,
        receiptNote: store.value.receiptNote,
        companyNumber: store.value.orgNumber,
        email: cfDeployEmail.value.trim() || smtpConfig.value.fromEmail,
        cfToken: cfDeployToken.value.trim() || undefined,
      },
    });
    if (!res?.ok) {
      installError.value = res?.error || 'Installation failed.';
      return;
    }
    installation.value = {
      ...installation.value,
      installed: true,
      workerUrl: res.panelUrl || res.workerUrl || '',
      apiKey: res.apiKey || '',
      pinCode: res.pinCode || '',
      installedAt: new Date().toISOString(),
    };
    showToast(t.value.installSuccess);
  } catch (err) {
    installError.value = err?.data?.error || err?.message || 'Cloudflare deployment failed. Check your Cloudflare API token or server env.';
  } finally {
    installDeploying.value = false;
  }
};

const openSetupWizard = () => {
  wizardStep.value = 1;
  showSetupWizard.value = true;
};

const finishSetupWizard = () => {
  installation.value = { ...installation.value, setupCompleted: true };
  showSetupWizard.value = false;
  activeTab.value = 'orders';
  showToast(`${store.value.name} is ready!`);
};

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
      if (parsed.store) store.value = { ...store.value, ...parsed.store, type: 'restaurant' };
      if (parsed.stripeConfig) stripeConfig.value = { ...stripeConfig.value, ...parsed.stripeConfig };
      if (parsed.telegramConfig) telegramConfig.value = { ...telegramConfig.value, ...parsed.telegramConfig };
      if (parsed.smtpConfig) smtpConfig.value = { ...smtpConfig.value, ...parsed.smtpConfig };
      if (Array.isArray(parsed.shippingZones)) shippingZones.value = parsed.shippingZones;
      if (Array.isArray(parsed.categories)) categories.value = parsed.categories;
      if (Array.isArray(parsed.coupons)) coupons.value = parsed.coupons;
      if (parsed.restaurantConfig) restaurantConfig.value = { ...restaurantConfig.value, ...parsed.restaurantConfig };
      if (Array.isArray(parsed.products)) products.value = parsed.products;
      if (Array.isArray(parsed.orders)) orders.value = parsed.orders;
      if (parsed.installation) installation.value = { ...installation.value, ...parsed.installation };
      if (!installation.value.setupCompleted) {
        wizardStep.value = 1;
        showSetupWizard.value = true;
      }
      return;
    }
    wizardStep.value = 1;
    showSetupWizard.value = true;
  } catch {}
});

watch(
  [lang, store, stripeConfig, telegramConfig, smtpConfig, shippingZones, categories, coupons, restaurantConfig, products, orders, installation],
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
          categories: categories.value,
          coupons: coupons.value,
          restaurantConfig: restaurantConfig.value,
          products: products.value,
          orders: orders.value,
          installation: installation.value,
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
  orders.value.filter((o) => ['pending', 'preparing'].includes(o.status)).length
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
    if (orderTypeFilter.value !== 'all' && o.deliveryType !== orderTypeFilter.value) return false;
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
  const set = new Set([...categories.value, ...products.value.map((p) => p.category).filter(Boolean)]);
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
    preparing: 'Accepted',
    ready: 'Accepted',
    delivered: t.value.statusDelivered,
    cancelled: t.value.statusRejected || t.value.statusCancelled,
  };
  return map[status] || status;
};

const updateOrderStatus = (orderId, nextStatus) => {
  orders.value = orders.value.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o));
  showToast(t.value.savedToast);
};

const acceptOrderWithPrep = (orderId, minutes) => {
  const mins = Math.max(5, Math.min(240, Number(minutes) || 30));
  const readyDate = new Date(Date.now() + mins * 60000);
  const readyStr = readyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  orders.value = orders.value.map((o) =>
    o.id === orderId
      ? { ...o, status: 'preparing', prepMinutes: mins, estimatedReadyAt: readyStr }
      : o
  );
  acceptingOrderId.value = '';
  workerFetch('/api/admin/orders', {
    method: 'PUT',
    body: JSON.stringify({ id: orderId, status: 'preparing', prepMinutes: mins, estimatedReadyAt: readyStr }),
  }).catch(() => {});
  showToast(`${t.value.acceptOrder} • ${mins} min (${readyStr})`);
};

const rejectOrder = (orderId) => {
  orders.value = orders.value.map((o) =>
    o.id === orderId ? { ...o, status: 'cancelled', prepMinutes: null, estimatedReadyAt: '' } : o
  );
  acceptingOrderId.value = '';
  workerFetch('/api/admin/orders', {
    method: 'PUT',
    body: JSON.stringify({ id: orderId, status: 'cancelled' }),
  }).catch(() => {});
  showToast(t.value.statusRejected || 'Rejected');
};

const addCategory = () => {
  const clean = newCategoryName.value.trim();
  if (!clean || categories.value.includes(clean)) return;
  categories.value = [...categories.value, clean];
  newCategoryName.value = '';
  showToast(t.value.savedToast);
};

const deleteCategory = (catName) => {
  if (categories.value.length <= 1) return;
  categories.value = categories.value.filter((c) => c !== catName);
  if (categoryFilter.value === catName) categoryFilter.value = 'all';
  showToast(t.value.savedToast);
};

const reportPeriodStats = computed(() => {
  const daysMap = { month: 30, '6months': 180, year: 365 };
  const maxDays = daysMap[reportPeriod.value] || 30;
  const cutoff = Date.now() - maxDays * 86400000;
  const validOrders = orders.value.filter((o) => {
    if (o.status === 'cancelled') return false;
    const ts = o.createdAt ? new Date(o.createdAt).getTime() : Date.now();
    return ts >= cutoff;
  });
  const revenue = validOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const ordersCount = validOrders.length;
  const avgOrder = ordersCount ? Math.round(revenue / ordersCount) : 0;
  const uniqueCustomers = new Set(validOrders.map((o) => o.phone || o.customer)).size;
  return { revenue, ordersCount, avgOrder, uniqueCustomers, filteredOrders: validOrders };
});

const bestSellingFoods = computed(() => {
  const map = new Map();
  for (const o of orders.value) {
    if (o.status === 'cancelled') continue;
    for (const line of o.lines || []) {
      const prev = map.get(line.name) || { name: line.name, qty: 0, revenue: 0 };
      prev.qty += Number(line.qty || 1);
      prev.revenue += Number(line.qty || 1) * Number(line.price || 0);
      map.set(line.name, prev);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
});

const exportSalesToExcel = () => {
  const headers = [
    'Order ID',
    'Date',
    'Customer',
    'Phone',
    'Type',
    'Address',
    'Items',
    'Subtotal',
    'Delivery Fee',
    'Total',
    'Currency',
    'Payment',
    'Status',
    'Prep Time (min)',
    'Estimated Ready',
  ];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = orders.value.map((o) => [
    o.id,
    o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : o.time,
    o.customer,
    o.phone,
    o.deliveryType === 'Delivery' ? 'Delivery' : 'Takeaway',
    o.address,
    (o.lines || []).map((l) => `${l.qty}x ${l.name}`).join('; '),
    o.subtotal,
    o.shipping,
    o.total,
    store.value.currency,
    o.payment,
    o.status,
    o.prepMinutes || '',
    o.estimatedReadyAt || '',
  ].map(esc).join(','));
  const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = store.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = url;
  a.download = `sales-report-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(t.value.exportExcel);
};

const openNewProductForm = () => {
  editingProductId.value = '';
  productForm.value = { name: '', category: categories.value[0] || 'Main Course', price: '', description: '', image: '' };
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

  let savedItem = null;
  if (editingProductId.value) {
    products.value = products.value.map((p) => {
      if (p.id !== editingProductId.value) return p;
      savedItem = {
        ...p,
        name: cleanName,
        category: productForm.value.category.trim() || 'General',
        price: numPrice,
        description: productForm.value.description.trim(),
        image: productForm.value.image.trim(),
      };
      return savedItem;
    });
  } else {
    savedItem = {
      id: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      name: cleanName,
      category: productForm.value.category.trim() || 'General',
      price: numPrice,
      description: productForm.value.description.trim(),
      image: productForm.value.image.trim(),
      available: true,
    };
    products.value = [savedItem, ...products.value];
  }

  if (savedItem) {
    workerFetch('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({ ...savedItem, title: savedItem.name }),
    }).catch(() => {});
  }

  showProductForm.value = false;
  editingProductId.value = '';
  showToast(t.value.savedToast);
};

const toggleProductAvailability = (id) => {
  let updated = null;
  products.value = products.value.map((p) => {
    if (p.id !== id) return p;
    updated = { ...p, available: !p.available };
    return updated;
  });
  if (updated) {
    workerFetch('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({ ...updated, title: updated.name }),
    }).catch(() => {});
  }
  showToast(t.value.savedToast);
};

const deleteProduct = (id) => {
  products.value = products.value.filter((p) => p.id !== id);
  workerFetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  showToast(t.value.savedToast);
};

const renderMapZones = () => {
  const L = typeof window !== 'undefined' ? window.L : null;
  if (!L || !leafletMap || !zoneLayerGroup || !draftLayerGroup) return;

  zoneLayerGroup.clearLayers();
  const centerLatLng = [59.3293, 18.0686];
  const maxKm = Math.max(1, Number(restaurantConfig.value.maxDeliveryKm) || 10);
  L.circle(centerLatLng, {
    radius: maxKm * 1000,
    color: '#0066CC',
    dashArray: '6, 6',
    fillColor: '#0066CC',
    fillOpacity: 0.06,
    weight: 1.5,
  }).addTo(zoneLayerGroup).bindTooltip(`Max delivery radius: ${maxKm} km`);

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

watch([activeTab, settingsSubTab], ([tab, sub]) => {
  if (tab === 'settings' && sub === 'delivery') {
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
  { id: 'orders', label: t.value.navOrders, icon: ShoppingBag, badge: activeOrdersCount.value },
  { id: 'menu', label: t.value.navMenu, icon: Utensils, badge: products.value.length },
  { id: 'reports', label: t.value.navReports, icon: BarChart3 },
]);

const setupNav = computed(() => [
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

    <!-- Apple Flat Rounded Sidebar (No heavy drop shadow) -->
    <aside
      :class="[
        'fixed inset-y-3 left-3 z-50 rounded-[26px] bg-[#FBFBFC] border border-[#E5E5EA] text-[#1D1D1F] flex flex-col justify-between transition-all duration-200 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:translate-x-0 shrink-0',
        sidebarCollapsed ? 'lg:w-[76px] w-64' : 'w-64',
        mobileNavOpen ? 'translate-x-0' : '-translate-x-[115%]'
      ]"
    >
      <div :class="['space-y-4', sidebarCollapsed ? 'lg:px-3 lg:py-4 p-4' : 'p-4']">
        <!-- Brand & Collapse Toggle -->
        <div :class="['flex items-center px-1', sidebarCollapsed ? 'lg:justify-center justify-between' : 'justify-between']">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="h-9 w-9 rounded-2xl text-white flex items-center justify-center font-extrabold text-xs shrink-0 overflow-hidden"
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
          @click="store.isOpen = !store.isOpen; syncSettingsToWorker(true); showToast(t.savedToast)"
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
                ? 'bg-[#0066CC] text-white'
                : 'text-[#515154] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
            ]"
            @click="selectTab(item.id)"
          >
            <span class="flex items-center gap-2.5">
              <span class="flex h-5 w-5 items-center justify-center shrink-0">
                <component :is="item.icon" :size="16" :stroke-width="2" class="block" />
              </span>
              <span v-if="!sidebarCollapsed" class="leading-none">{{ item.label }}</span>
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
          class="flex items-center justify-between gap-2 text-[#1D1D1F] hover:text-[#0066CC] font-semibold transition-colors leading-none"
        >
          <span v-if="!sidebarCollapsed" class="truncate font-mono leading-none">{{ store.customDomain }}</span>
          <span class="flex h-4 w-4 items-center justify-center shrink-0">
            <ExternalLink :size="13" :stroke-width="2" class="block text-[#86868B]" />
          </span>
        </a>
        <div v-if="!sidebarCollapsed" class="flex items-center gap-1.5 text-emerald-600 font-semibold leading-none">
          <span class="flex h-4 w-4 items-center justify-center shrink-0">
            <Lock :size="12" :stroke-width="2" class="block" />
          </span>
          <span class="leading-none">{{ t.sslActive }}</span>
        </div>
      </div>
    </aside>

    <!-- Main Workspace -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Apple Flat Rounded Top Navbar (No heavy drop shadow) -->
      <header class="sticky top-3 lg:top-4 z-30 mx-3 mt-3 lg:mx-auto lg:mt-0 w-[calc(100%-1.5rem)] lg:w-full max-w-7xl h-14 rounded-[22px] bg-[#FBFBFC]/95 backdrop-blur-md border border-[#E5E5EA] px-3.5 sm:px-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            class="lg:hidden h-9 w-9 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#1D1D1F]"
            @click="mobileNavOpen = true"
          >
            <Menu :size="17" />
          </button>

          <div class="relative w-full max-w-sm flex items-center">
            <span class="absolute left-3 flex h-4 w-4 items-center justify-center text-[#86868B] pointer-events-none">
              <Search :size="14" :stroke-width="2" class="block" />
            </span>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t.searchPlaceholder"
              class="w-full h-9 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] pl-9 pr-4 text-xs leading-none focus:bg-white focus:border-[#0066CC] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <div class="relative flex items-center">
            <span class="absolute left-3 flex h-4 w-4 items-center justify-center text-[#6E6E73] pointer-events-none">
              <Globe :size="14" :stroke-width="2" class="block" />
            </span>
            <select
              v-model="lang"
              class="h-9 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] pl-8 pr-3 text-xs font-semibold leading-none text-[#1D1D1F] focus:border-[#0066CC] focus:outline-none cursor-pointer transition-colors"
            >
              <option v-for="l in SELLER_LANGUAGES" :key="l.code" :value="l.code">
                {{ l.flag }} {{ l.label }}
              </option>
            </select>
          </div>
        </div>
      </header>

      <main class="p-3 sm:p-4 lg:px-1 lg:pt-5 lg:pb-8 max-w-7xl w-full mx-auto space-y-5">
        <!-- 1. ORDERS TAB (HIGHEST PRIORITY) -->
        <template v-if="activeTab === 'orders'">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-xl font-extrabold text-[#1D1D1F]">{{ store.name }} — {{ t.navOrders }}</h1>
              <p class="text-xs text-[#6E6E73]">{{ store.address }}</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-if="workerBaseUrl && installation.pinCode"
                type="button"
                :disabled="workerSyncing"
                class="h-8 px-3 rounded-full bg-white hover:bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                @click="pullFromWorker"
              >
                <RefreshCw :size="12" :class="workerSyncing ? 'animate-spin' : ''" />
                <span>Sync Live Orders</span>
              </button>
              <span class="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                {{ orderCountsByStatus.pending }} {{ t.statusPending }}
              </span>
              <span class="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#0066CC] text-xs font-bold">
                {{ activeOrdersCount }} Active
              </span>
            </div>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div :class="[selectedOrder ? 'lg:col-span-7' : 'lg:col-span-12', 'rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4']">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navOrders }} ({{ filteredOrders.length }})</h2>
                  <!-- Delivery vs Takeaway Quick Filter -->
                  <div class="inline-flex items-center p-0.5 rounded-full bg-[#F5F5F7] border border-[#E5E5EA]">
                    <button
                      v-for="dt in [{ id: 'all', label: t.filterAll }, { id: 'Delivery', label: 'Delivery' }, { id: 'Pickup', label: 'Takeaway' }]"
                      :key="dt.id"
                      type="button"
                      :class="[
                        'h-7 px-3 rounded-full text-[11px] font-bold cursor-pointer transition-colors',
                        orderTypeFilter === dt.id ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                      ]"
                      @click="orderTypeFilter = dt.id"
                    >
                      {{ dt.label }}
                    </button>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <button
                    v-for="st in ['all', 'pending', 'preparing', 'cancelled']"
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
                    ord.status === 'pending' ? 'border-l-4 border-l-amber-500' : '',
                    selectedOrderId === ord.id ? 'bg-[#0066CC]/[0.05]' : 'hover:bg-[#F5F5F7]/70'
                  ]"
                  @click="selectedOrderId = ord.id"
                >
                  <div class="space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-mono text-xs font-bold">{{ ord.id }}</span>
                      <span class="text-xs font-bold text-[#1D1D1F]">{{ ord.customer }}</span>
                      <span
                        :class="[
                          'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          ord.deliveryType === 'Delivery' ? 'bg-blue-50 text-[#0066CC]' : 'bg-emerald-50 text-emerald-700'
                        ]"
                      >
                        {{ ord.deliveryType === 'Delivery' ? 'Delivery' : 'Takeaway' }}
                      </span>
                      <span :class="['px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border', statusBadgeClass(ord.status)]">
                        {{ statusLabel(ord.status) }}
                      </span>
                      <span
                        v-if="ord.prepMinutes && ord.status !== 'cancelled'"
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA]"
                      >
                        ⏱ {{ ord.prepMinutes }} min{{ ord.estimatedReadyAt ? ` (${ord.estimatedReadyAt})` : '' }}
                      </span>
                    </div>
                    <p class="text-xs text-[#515154]">{{ ord.lines.map((l) => `${l.qty}x ${l.name}`).join(', ') }}</p>
                    <p class="text-[11px] text-[#86868B]">{{ ord.address }} • {{ ord.payment }} • {{ ord.time }}</p>
                  </div>

                  <div class="flex flex-col items-end gap-2 shrink-0" @click.stop>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-extrabold tabular-nums">{{ ord.total }} {{ store.currency }}</span>
                      <template v-if="ord.status === 'pending'">
                        <button
                          type="button"
                          class="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          @click="acceptingOrderId = acceptingOrderId === ord.id ? '' : ord.id"
                        >
                          <Check :size="14" />
                          <span>{{ t.acceptOrder }}</span>
                        </button>
                        <button
                          type="button"
                          class="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          @click="rejectOrder(ord.id)"
                        >
                          <XCircle :size="14" />
                          <span>{{ t.rejectOrder }}</span>
                        </button>
                      </template>
                    </div>

                    <!-- Inline Preparation Time Picker when Accepting -->
                    <div
                      v-if="ord.status === 'pending' && acceptingOrderId === ord.id"
                      class="p-2.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex flex-wrap items-center gap-1.5"
                    >
                      <span class="text-[11px] font-bold text-[#1D1D1F] mr-1">{{ t.setPrepTime }}:</span>
                      <button type="button" class="h-7 px-2.5 rounded-lg bg-white hover:bg-[#0066CC] hover:text-white border border-[#D2D2D7] text-[11px] font-bold cursor-pointer" @click="acceptOrderWithPrep(ord.id, 30)">{{ t.prep30 }}</button>
                      <button type="button" class="h-7 px-2.5 rounded-lg bg-white hover:bg-[#0066CC] hover:text-white border border-[#D2D2D7] text-[11px] font-bold cursor-pointer" @click="acceptOrderWithPrep(ord.id, 40)">{{ t.prep40 }}</button>
                      <button type="button" class="h-7 px-2.5 rounded-lg bg-white hover:bg-[#0066CC] hover:text-white border border-[#D2D2D7] text-[11px] font-bold cursor-pointer" @click="acceptOrderWithPrep(ord.id, 60)">{{ t.prep60 }}</button>
                      <input
                        v-model="customPrepMinutes"
                        type="number"
                        min="5"
                        max="240"
                        class="w-14 h-7 rounded-lg bg-white border border-[#D2D2D7] px-2 text-[11px] font-mono"
                      />
                      <button type="button" class="h-7 px-2.5 rounded-lg bg-[#0066CC] text-white text-[11px] font-bold cursor-pointer" @click="acceptOrderWithPrep(ord.id, customPrepMinutes)">
                        {{ t.confirmAccept }}
                      </button>
                    </div>
                  </div>
                </div>
                <div v-if="filteredOrders.length === 0" class="p-8 text-center text-xs text-[#6E6E73]">
                  No orders match the current filter.
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

              <div class="space-y-2.5 text-xs">
                <div class="flex items-center gap-2 font-bold leading-none text-[#1D1D1F]">
                  <span class="flex h-4 w-4 items-center justify-center shrink-0">
                    <Users :size="14" :stroke-width="2" class="block text-[#6E6E73]" />
                  </span>
                  <span class="leading-none">{{ selectedOrder.customer }}</span>
                </div>
                <div class="flex items-center gap-2 text-[#515154] font-mono leading-none">
                  <span class="flex h-4 w-4 items-center justify-center shrink-0">
                    <Phone :size="14" :stroke-width="2" class="block text-[#6E6E73]" />
                  </span>
                  <a :href="`tel:${selectedOrder.phone}`" class="hover:text-[#0066CC] leading-none">{{ selectedOrder.phone }}</a>
                </div>
                <div class="flex items-center gap-2 text-[#515154] leading-none">
                  <span class="flex h-4 w-4 items-center justify-center shrink-0">
                    <MapPin :size="14" :stroke-width="2" class="block text-[#6E6E73]" />
                  </span>
                  <span class="leading-none">{{ selectedOrder.address }}</span>
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

              <div
                v-if="selectedOrder.prepMinutes && selectedOrder.status !== 'cancelled'"
                class="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-[#0066CC] flex items-center justify-between"
              >
                <span>{{ t.expectedReady }}</span>
                <span>{{ selectedOrder.prepMinutes }} min{{ selectedOrder.estimatedReadyAt ? ` (${selectedOrder.estimatedReadyAt})` : '' }}</span>
              </div>

              <div v-if="selectedOrder.status === 'pending'" class="pt-2 space-y-2.5">
                <div class="text-xs font-bold text-[#1D1D1F]">{{ t.setPrepTime }}:</div>
                <div class="grid grid-cols-3 gap-2">
                  <button type="button" class="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer" @click="acceptOrderWithPrep(selectedOrder.id, 30)">{{ t.prep30 }}</button>
                  <button type="button" class="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer" @click="acceptOrderWithPrep(selectedOrder.id, 40)">{{ t.prep40 }}</button>
                  <button type="button" class="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer" @click="acceptOrderWithPrep(selectedOrder.id, 60)">{{ t.prep60 }}</button>
                </div>
                <div class="flex items-center gap-2">
                  <input v-model="customPrepMinutes" type="number" min="5" max="240" class="w-24 h-9 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs font-mono" />
                  <button type="button" class="flex-1 h-9 rounded-xl bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer" @click="acceptOrderWithPrep(selectedOrder.id, customPrepMinutes)">
                    {{ t.confirmAccept }}
                  </button>
                  <button type="button" class="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer" @click="rejectOrder(selectedOrder.id)">
                    {{ t.rejectOrder }}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </template>

        <!-- 2. MENU TAB -->
        <template v-else-if="activeTab === 'menu'">
          <div class="space-y-5">
            <!-- Categories Manager -->
            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.categoriesTitle }}</h2>
                <form class="flex items-center gap-2" @submit.prevent="addCategory">
                  <input
                    v-model="newCategoryName"
                    type="text"
                    :placeholder="t.categoryPlaceholder"
                    class="h-9 rounded-full bg-white border border-[#D2D2D7] px-3.5 text-xs focus:border-[#0066CC] focus:outline-none"
                  />
                  <button
                    type="submit"
                    class="h-9 px-4 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    + {{ t.addCategory }}
                  </button>
                </form>
              </div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="cat in categories"
                  :key="cat"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-semibold"
                >
                  <span>{{ cat }}</span>
                  <button
                    v-if="categories.length > 1"
                    type="button"
                    class="text-[#6E6E73] hover:text-rose-600 cursor-pointer"
                    @click="deleteCategory(cat)"
                  >
                    <X :size="12" />
                  </button>
                </div>
              </div>
            </div>

          <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-base font-extrabold text-[#1D1D1F] mr-2">{{ t.navMenu }} ({{ filteredProducts.length }})</h2>
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
                <select
                  v-model="productForm.category"
                  class="w-full h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs font-semibold"
                >
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
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
                    <Utensils v-else :size="16" />
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
              <div v-if="filteredProducts.length === 0" class="p-8 text-center text-xs text-[#6E6E73]">
                No menu items in this category yet. Click "{{ t.addProduct }}" to add one.
              </div>
            </div>
          </div>
          </div>
        </template>

        <!-- 4. REPORTS & ANALYTICS TAB -->
        <template v-else-if="activeTab === 'reports'">
          <div class="space-y-5">
            <!-- Header: Period Filter (1M / 6M / 1Y) & Excel Export -->
            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navReports }}</h2>
                <p class="text-xs text-[#6E6E73]">{{ store.name }} • {{ t.salesHistory }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="inline-flex items-center p-1 rounded-full bg-[#F5F5F7] border border-[#E5E5EA]">
                  <button
                    v-for="p in [
                      { id: 'month', label: t.reportsLastMonth },
                      { id: '6months', label: t.reportsLast6Months },
                      { id: 'year', label: t.reportsLastYear }
                    ]"
                    :key="p.id"
                    type="button"
                    :class="[
                      'h-7 px-3 rounded-full text-[11px] font-bold cursor-pointer transition-colors',
                      reportPeriod === p.id ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                    ]"
                    @click="reportPeriod = p.id"
                  >
                    {{ p.label }}
                  </button>
                </div>
                <button
                  type="button"
                  class="h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  @click="exportSalesToExcel"
                >
                  <Download :size="14" />
                  <span>{{ t.exportExcel }}</span>
                </button>
              </div>
            </div>

            <!-- Period Summary KPIs -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1">
                <div class="text-xs font-semibold text-[#6E6E73]">{{ t.kpiRevenue }}</div>
                <div class="text-2xl font-extrabold tabular-nums text-[#0066CC]">
                  {{ reportPeriodStats.revenue.toLocaleString('en-US') }} {{ store.currency }}
                </div>
              </div>
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1">
                <div class="text-xs font-semibold text-[#6E6E73]">{{ t.ordersCount }}</div>
                <div class="text-2xl font-extrabold tabular-nums">{{ reportPeriodStats.ordersCount }}</div>
              </div>
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1">
                <div class="text-xs font-semibold text-[#6E6E73]">{{ t.kpiAvgOrder }}</div>
                <div class="text-2xl font-extrabold tabular-nums">{{ reportPeriodStats.avgOrder }} {{ store.currency }}</div>
              </div>
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-1">
                <div class="text-xs font-semibold text-[#6E6E73]">{{ t.navCustomers }}</div>
                <div class="text-2xl font-extrabold tabular-nums">{{ reportPeriodStats.uniqueCustomers }}</div>
              </div>
            </div>

            <!-- Best-Selling Foods & Customer History -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <!-- Best-Selling Foods -->
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-3">
                <h3 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.bestSellingFoods }}</h3>
                <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
                  <div
                    v-for="(item, idx) in bestSellingFoods"
                    :key="item.name"
                    class="px-4 py-3 space-y-1.5 text-xs"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="h-6 w-6 rounded-full bg-[#F5F5F7] text-[#1D1D1F] font-extrabold text-[11px] flex items-center justify-center shrink-0">
                          {{ idx + 1 }}
                        </span>
                        <span class="font-bold text-[#1D1D1F] truncate">{{ item.name }}</span>
                      </div>
                      <div class="flex items-center gap-3 shrink-0">
                        <span class="text-[#6E6E73] font-semibold">{{ item.qty }} {{ t.unitsSold }}</span>
                        <span class="font-extrabold tabular-nums text-[#0066CC]">{{ item.revenue }} {{ store.currency }}</span>
                      </div>
                    </div>
                    <div class="h-1.5 w-full rounded-full bg-[#F0F0F2] overflow-hidden">
                      <div
                        class="h-full rounded-full bg-[#0066CC]"
                        :style="{ width: `${Math.max(8, Math.round((item.qty / (bestSellingFoods[0]?.qty || 1)) * 100))}%` }"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Customer History & Analytics -->
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-3">
                <h3 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.customerAnalytics }} ({{ customersList.length }})</h3>
                <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
                  <div
                    v-for="c in customersList"
                    :key="c.phone || c.name"
                    class="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div class="text-xs font-bold text-[#1D1D1F]">{{ c.name }}</div>
                      <div class="text-[11px] text-[#6E6E73] font-mono">{{ c.phone }} • {{ c.address }}</div>
                    </div>
                    <div class="flex items-center gap-3 text-xs shrink-0">
                      <span class="text-[#6E6E73]">{{ t.ordersCount }}: <strong class="text-[#1D1D1F] tabular-nums">{{ c.ordersCount }}</strong></span>
                      <span class="font-extrabold tabular-nums text-[#0066CC]">{{ c.totalSpent }} {{ store.currency }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="filteredOrders.length === 0" class="p-8 text-center text-xs text-[#6E6E73]">
                  No orders match the current filter.
                </div>
              </div>
            </div>

            <!-- Complete Sales & Order History -->
            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-3">
              <h3 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.salesHistory }} ({{ orders.length }})</h3>
              <div class="overflow-x-auto border border-[#E5E5EA] rounded-2xl bg-white">
                <table class="w-full text-left text-xs">
                  <thead class="bg-[#F5F5F7] text-[#6E6E73] text-[11px] uppercase">
                    <tr>
                      <th class="px-4 py-2.5 font-bold">Order</th>
                      <th class="px-4 py-2.5 font-bold">Customer</th>
                      <th class="px-4 py-2.5 font-bold">Type</th>
                      <th class="px-4 py-2.5 font-bold">Items</th>
                      <th class="px-4 py-2.5 font-bold">Status</th>
                      <th class="px-4 py-2.5 font-bold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#E5E5EA]">
                    <tr v-for="o in orders" :key="o.id" class="hover:bg-[#F5F5F7]/60">
                      <td class="px-4 py-2.5 font-mono font-bold">{{ o.id }}</td>
                      <td class="px-4 py-2.5">{{ o.customer }}</td>
                      <td class="px-4 py-2.5">{{ o.deliveryType === 'Delivery' ? 'Delivery' : 'Takeaway' }}</td>
                      <td class="px-4 py-2.5 text-[#6E6E73]">{{ o.lines.map((l) => `${l.qty}x ${l.name}`).join(', ') }}</td>
                      <td class="px-4 py-2.5">
                        <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold border', statusBadgeClass(o.status)]">
                          {{ statusLabel(o.status) }}
                        </span>
                      </td>
                      <td class="px-4 py-2.5 font-extrabold tabular-nums text-right">{{ o.total }} {{ store.currency }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Discount Codes -->
          <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h3 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.navCoupons }} ({{ coupons.length }})</h3>
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
          </div>
        </template>

        <!-- 5. SETTINGS TAB -->
        <template v-else-if="activeTab === 'settings'">
          <div class="space-y-5 max-w-4xl">
            <!-- Clean Apple Segmented Sub-Navigation -->
            <div class="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA]">
              <button
                type="button"
                :class="[
                  'h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                  settingsSubTab === 'profile' ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'profile'"
              >
                {{ t.navSettings }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                  settingsSubTab === 'delivery' ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'delivery'"
              >
                {{ t.navDelivery }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                  settingsSubTab === 'branding' ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'branding'"
              >
                {{ t.brandingTitle }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                  settingsSubTab === 'locale' ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'locale'"
              >
                {{ t.countryCurrencyTitle }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                  settingsSubTab === 'business' ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'business'"
              >
                {{ t.restaurantSettings }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                  settingsSubTab === 'telegram' ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'telegram'"
              >
                {{ t.navTelegram }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                  settingsSubTab === 'smtp' ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'smtp'"
              >
                {{ t.smtpSettings }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                  settingsSubTab === 'payments' ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'payments'"
              >
                {{ t.navPayments }}
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                  settingsSubTab === 'api' ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'api'"
              >
                REST API
              </button>
              <button
                type="button"
                :class="[
                  'h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                  settingsSubTab === 'install' ? 'bg-[#0066CC] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                ]"
                @click="settingsSubTab = 'install'"
              >
                {{ t.navInstall }}
              </button>
            </div>

            <!-- SUB-TAB: Delivery Settings & Map -->
            <div v-if="settingsSubTab === 'delivery'" class="space-y-5">
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-4">
                <div>
                  <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navDelivery }}</h2>
                  <p class="text-xs text-[#6E6E73] mt-0.5">{{ t.deliveryAreaHint }}</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.maxDeliveryDistance }}</label>
                    <input
                      v-model="restaurantConfig.maxDeliveryKm"
                      type="number"
                      min="1"
                      max="100"
                      class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                      @change="renderMapZones()"
                    />
                  </div>
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
                  @click="renderMapZones(); syncSettingsToWorker(true); showToast(t.savedToast)"
                >
                  {{ t.save }}
                </button>
              </div>

              <!-- Interactive OpenStreetMap Delivery Zone Drawer -->
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-4">
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

                <div ref="mapContainer" class="w-full h-72 sm:h-80 rounded-2xl border border-[#E5E5EA] overflow-hidden z-10 bg-[#ECECEF]" />

                <form
                  v-if="showZoneForm"
                  class="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
                  @submit.prevent="addShippingZone"
                >
                  <input v-model="zoneForm.name" type="text" required :placeholder="t.zoneName" class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs" />
                  <input v-model="zoneForm.price" type="number" min="0" required :placeholder="`${t.zonePrice} (${store.currency})`" class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs font-mono" />
                  <input v-model="zoneForm.estTime" type="text" :placeholder="t.estTime" class="h-10 rounded-xl bg-white border border-[#D2D2D7] px-3 text-xs" />
                  <input v-model="zoneForm.color" type="color" class="h-10 w-full rounded-xl border border-[#D2D2D7] bg-white px-1 cursor-pointer" />
                  <button type="submit" class="h-10 px-4 rounded-xl bg-[#0066CC] text-white text-xs font-bold cursor-pointer">{{ t.save }}</button>
                </form>

                <div class="divide-y divide-[#E5E5EA] border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
                  <div v-for="z in shippingZones" :key="z.id" class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div class="flex items-center gap-3">
                      <span class="h-3.5 w-3.5 rounded-full shrink-0" :style="{ backgroundColor: z.color || '#0066CC' }" />
                      <div>
                        <div class="text-xs font-bold text-[#1D1D1F]">{{ z.name }}</div>
                        <div class="text-[11px] text-[#6E6E73]">{{ z.points?.length ? `${z.points.length} pts` : z.range }} • {{ z.estTime }}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs font-extrabold tabular-nums text-[#0066CC]">{{ z.price }} {{ store.currency }}</span>
                      <button type="button" class="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer" @click="deleteShippingZone(z.id)">
                        <Trash2 :size="13" />
                      </button>
                    </div>
                  </div>
                  <div v-if="shippingZones.length === 0" class="p-6 text-center text-xs text-[#6E6E73]">
                    No delivery zones drawn yet. Click 3+ points on the map above to draw a zone.
                  </div>
                </div>
              </div>
            </div>

            <!-- SUB-TAB: Telegram -->
            <div v-if="settingsSubTab === 'telegram'" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navTelegram }}</h2>
                  <p class="text-xs text-[#6E6E73] mt-0.5">Instant Telegram order alerts run directly inside your Cloudflare Worker.</p>
                </div>
                <button
                  type="button"
                  :disabled="testingTelegram"
                  class="h-9 px-4 rounded-full bg-[#1D1D1F] hover:bg-black disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  @click="sendTestTelegram"
                >
                  <Bell :size="13" />
                  <span>{{ testingTelegram ? 'Sending...' : 'Send Test Notification' }}</span>
                </button>
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
              <div
                v-if="telegramTestFeedback.msg"
                :class="[
                  'p-3 rounded-xl border text-xs font-semibold',
                  telegramTestFeedback.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'
                ]"
              >
                {{ telegramTestFeedback.msg }}
              </div>
              <button
                type="button"
                class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                @click="syncSettingsToWorker(true); showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
            </div>

            <!-- SUB-TAB: Stripe Payments -->
            <div v-if="settingsSubTab === 'payments'" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navPayments }}</h2>
                  <p class="text-xs text-[#6E6E73] mt-0.5">Handles Stripe Checkout sessions &amp; PaymentIntents directly in the Worker API.</p>
                </div>
                <label class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-bold cursor-pointer">
                  <input v-model="stripeConfig.enabled" type="checkbox" class="accent-[#0066CC]" />
                  <span>Enable Stripe</span>
                </label>
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
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.publishableKey }} (Public Frontend)</label>
                  <input
                    v-model="stripeConfig.publishableKey"
                    type="text"
                    placeholder="pk_test_... / pk_live_..."
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">Stripe Secret Key (Stored privately in Worker D1)</label>
                  <div class="relative">
                    <input
                      v-model="stripeConfig.secretKey"
                      :type="showStripeSecret ? 'text' : 'password'"
                      placeholder="sk_test_... / sk_live_..."
                      class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] pl-3.5 pr-9 text-xs font-mono"
                    />
                    <button
                      type="button"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                      @click="showStripeSecret = !showStripeSecret"
                    >
                      <EyeOff v-if="showStripeSecret" :size="15" />
                      <Eye v-else :size="15" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                @click="syncSettingsToWorker(true); showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
            </div>

            <!-- SUB-TAB: REST API & Frontend Selling -->
            <div v-if="settingsSubTab === 'api'" class="space-y-5">
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 class="text-base font-extrabold text-[#1D1D1F] flex items-center gap-2">
                      <Code2 :size="17" class="text-[#0066CC]" />
                      <span>Frontend REST API &amp; Stripe Selling</span>
                    </h2>
                    <p class="text-xs text-[#6E6E73] mt-0.5">Connect your customer website to display your menu, check delivery area, accept Stripe payments, and show order prep times.</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      :disabled="workerSyncing"
                      class="h-9 px-4 rounded-full bg-[#0066CC] hover:bg-[#0055AA] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      @click="syncSettingsToWorker(false)"
                    >
                      <RefreshCw :size="12" :class="workerSyncing ? 'animate-spin' : ''" />
                      <span>Sync Settings to Worker</span>
                    </button>
                    <button
                      type="button"
                      :disabled="workerSyncing || !workerBaseUrl"
                      class="h-9 px-4 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] disabled:opacity-50 text-xs font-bold cursor-pointer"
                      @click="pullFromWorker"
                    >
                      Pull Live Orders
                    </button>
                  </div>
                </div>

                <div v-if="workerSyncMsg" class="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#0066CC] text-xs font-semibold">
                  {{ workerSyncMsg }}
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-[#6E6E73] mb-1">Worker URL</label>
                    <input v-model="installation.workerUrl" type="url" placeholder="https://linksho-site-....workers.dev" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-mono" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-[#6E6E73] mb-1">Public API Key</label>
                    <input v-model="installation.apiKey" type="text" placeholder="sk_live_..." class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-mono" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-[#6E6E73] mb-1">Admin Seller PIN</label>
                    <input v-model="installation.pinCode" type="password" placeholder="PIN" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-mono" />
                  </div>
                </div>

                <!-- Copyable Endpoints -->
                <div class="space-y-2.5 pt-2">
                  <div
                    v-for="ep in [
                      { method: 'GET', label: 'Show Menu, Categories, Delivery Zones & Stripe Key on Frontend', url: `${workerBaseUrl || 'https://your-worker.workers.dev'}/api/storefront?key=${installation.apiKey || 'YOUR_API_KEY'}` },
                      { method: 'POST', label: 'Verify Delivery Area / Max Distance (lat, lng)', url: `${workerBaseUrl || 'https://your-worker.workers.dev'}/api/delivery/check` },
                      { method: 'POST', label: 'Place Order (Pay on Delivery / Takeaway + Telegram Alert)', url: `${workerBaseUrl || 'https://your-worker.workers.dev'}/api/orders` },
                      { method: 'POST', label: 'Create Stripe Checkout Session & Redirect Customer to Pay', url: `${workerBaseUrl || 'https://your-worker.workers.dev'}/api/stripe/checkout` },
                      { method: 'POST', label: 'Create Stripe PaymentIntent (Custom Elements)', url: `${workerBaseUrl || 'https://your-worker.workers.dev'}/api/stripe/payment-intent` },
                      { method: 'POST', label: 'Verify Stripe Payment & Send Paid Telegram Alert', url: `${workerBaseUrl || 'https://your-worker.workers.dev'}/api/stripe/verify` },
                      { method: 'GET', label: 'Show Order Status & Preparation Time on Customer Website', url: `${workerBaseUrl || 'https://your-worker.workers.dev'}/api/orders/status?id=ORD-XXXX&key=${installation.apiKey || 'YOUR_API_KEY'}` },
                    ]"
                    :key="ep.url"
                    class="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div class="min-w-0 space-y-0.5">
                      <div class="flex items-center gap-2">
                        <span :class="['px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono', ep.method === 'GET' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-[#0066CC]']">{{ ep.method }}</span>
                        <span class="text-xs font-bold text-[#1D1D1F]">{{ ep.label }}</span>
                      </div>
                      <div class="text-[11px] font-mono text-[#6E6E73] truncate">{{ ep.url }}</div>
                    </div>
                    <button type="button" class="h-8 px-3 rounded-lg bg-white hover:bg-[#ECECEF] border border-[#D2D2D7] text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer" @click="copyText(ep.url)">
                      <Copy :size="12" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Frontend Integration Code & Live JSON Preview -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-3">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-extrabold text-[#1D1D1F]">Frontend JavaScript Example</h3>
                    <button type="button" class="h-8 px-3 rounded-lg bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer" @click="copyText(frontendFetchSnippet)">
                      <Copy :size="12" />
                      <span>Copy Code</span>
                    </button>
                  </div>
                  <pre class="p-3.5 rounded-xl bg-[#1D1D1F] text-[#F5F5F7] text-[11px] font-mono overflow-x-auto leading-relaxed max-h-72">{{ frontendFetchSnippet }}</pre>
                </div>

                <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-5 space-y-3">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-extrabold text-[#1D1D1F]">Live /api/storefront JSON Preview</h3>
                    <button type="button" class="h-8 px-3 rounded-lg bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer" @click="copyText(storefrontPreviewJson)">
                      <Copy :size="12" />
                      <span>Copy JSON</span>
                    </button>
                  </div>
                  <pre class="p-3.5 rounded-xl bg-[#1D1D1F] text-emerald-300 text-[11px] font-mono overflow-x-auto leading-relaxed max-h-72">{{ storefrontPreviewJson }}</pre>
                </div>
              </div>
            </div>

            <!-- SUB-TAB 1: Store Profile -->
            <div v-if="settingsSubTab === 'profile'" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-base font-extrabold text-[#1D1D1F]">{{ t.navSettings }}</h2>
                <button
                  type="button"
                  class="h-9 px-4 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  @click="openSetupWizard"
                >
                  <Rocket :size="13" class="text-[#0066CC]" />
                  <span>Setup Wizard</span>
                </button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.storeName }}</label>
                  <input
                    v-model="store.name"
                    type="text"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs"
                  />
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
                @click="syncSettingsToWorker(true); showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
            </div>

            <!-- SUB-TAB 2: Logo & Branding Upload -->
            <div v-if="settingsSubTab === 'branding'" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
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

            <!-- SUB-TAB 3: Country, Storefront Languages & Currency -->
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
                @click="syncSettingsToWorker(true); showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
            </div>

            <!-- SUB-TAB 4: Restaurant Settings -->
            <div v-if="settingsSubTab === 'business'">
            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
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
              </div>
              <button
                type="button"
                class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                @click="syncSettingsToWorker(true); showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
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
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">Resend API Key (Optional — sends emails directly from Worker)</label>
                  <input
                    v-model="smtpConfig.resendApiKey"
                    type="password"
                    placeholder="re_..."
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">Email Webhook URL (Optional)</label>
                  <input
                    v-model="smtpConfig.webhookUrl"
                    type="url"
                    placeholder="https://..."
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
                @click="syncSettingsToWorker(true); showToast(t.savedToast)"
              >
                {{ t.save }}
              </button>
            </div>

            <!-- SUB-TAB: Install & Setup -->
            <div v-if="settingsSubTab === 'install'" class="space-y-5">
            <!-- Header & Stepper -->
            <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="text-lg font-extrabold text-[#1D1D1F]">{{ t.installTitle }} — {{ store.name }}</h2>
                  <p class="text-xs text-[#6E6E73] mt-0.5">{{ t.installSubtitle }}</p>
                </div>
                <span
                  :class="[
                    'px-3 py-1.5 rounded-full text-xs font-bold border',
                    installation.installed
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  ]"
                >
                  {{ installation.installed ? t.installComplete : t.installPending }}
                </span>
              </div>

              <!-- 4-Step Progress Bar -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  v-for="(label, idx) in [t.installStep1, t.installStep2, t.installStep3, t.installStep4]"
                  :key="idx"
                  type="button"
                  :class="[
                    'p-3 rounded-xl border text-left transition-all cursor-pointer',
                    installStep === idx + 1
                      ? 'bg-[#0066CC] text-white border-[#0066CC]'
                      : installStep > idx + 1
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-[#F5F5F7] text-[#6E6E73] border-[#E5E5EA] hover:text-[#1D1D1F]'
                  ]"
                  @click="installStep = idx + 1"
                >
                  <div class="text-[10px] font-bold uppercase tracking-wider opacity-80">Step {{ idx + 1 }}</div>
                  <div class="text-xs font-extrabold mt-0.5 truncate">{{ label }}</div>
                </button>
              </div>
            </div>

            <!-- Step 1: Restaurant Info -->
            <div v-if="installStep === 1" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-4">
              <h3 class="text-base font-extrabold text-[#1D1D1F]">1. {{ t.installStep1 }}</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.storeName }}</label>
                  <input v-model="store.name" type="text" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.country }}</label>
                  <select
                    :value="store.country"
                    class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-semibold"
                    @change="onCountryChange($event.target.value)"
                  >
                    <option v-for="c in STORE_COUNTRIES" :key="c.id" :value="c.id">{{ c.name }} ({{ c.currency }})</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.phone }}</label>
                  <input v-model="store.phone" type="text" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.address }}</label>
                  <input v-model="store.address" type="text" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.orgNumber }}</label>
                  <input v-model="store.orgNumber" type="text" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.customDomain }}</label>
                  <input v-model="store.customDomain" type="text" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                </div>
              </div>
              <div class="flex justify-end pt-2">
                <button type="button" class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer" @click="installStep = 2">
                  {{ t.installNext }}
                </button>
              </div>
            </div>

            <!-- Step 2: Delivery & Hours -->
            <div v-else-if="installStep === 2" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-4">
              <h3 class="text-base font-extrabold text-[#1D1D1F]">2. {{ t.installStep2 }}</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.openingHours }}</label>
                  <input v-model="restaurantConfig.openingHours" type="text" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.prepTime }}</label>
                  <input v-model="restaurantConfig.prepTime" type="number" min="5" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.minOrder }} ({{ store.currency }})</label>
                  <input v-model="restaurantConfig.minOrder" type="number" min="0" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.shippingFee }} ({{ store.currency }})</label>
                  <input v-model="store.shippingFee" type="number" min="0" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
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
              </div>
              <div class="flex justify-between pt-2">
                <button type="button" class="h-10 px-5 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-xs font-bold cursor-pointer" @click="installStep = 1">
                  {{ t.installPrev }}
                </button>
                <button type="button" class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer" @click="installStep = 3">
                  {{ t.installNext }}
                </button>
              </div>
            </div>

            <!-- Step 3: Payments & Alerts -->
            <div v-else-if="installStep === 3" class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-4">
              <h3 class="text-base font-extrabold text-[#1D1D1F]">3. {{ t.installStep3 }}</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.publishableKey }} (Stripe)</label>
                  <input v-model="stripeConfig.publishableKey" type="text" placeholder="pk_test_... / pk_live_..." class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">Stripe Secret Key</label>
                  <input v-model="stripeConfig.secretKey" type="password" placeholder="sk_test_... / sk_live_..." class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.botToken }} (Telegram)</label>
                  <input v-model="telegramConfig.botToken" type="text" placeholder="123456789:AAH..." class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.chatId }} (Telegram)</label>
                  <input v-model="telegramConfig.chatId" type="text" placeholder="-1001234567890" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">{{ t.fromEmail }} (SMTP)</label>
                  <input v-model="smtpConfig.fromEmail" type="email" placeholder="orders@restaurant.se" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                </div>
              </div>
              <div class="flex justify-between pt-2">
                <button type="button" class="h-10 px-5 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-xs font-bold cursor-pointer" @click="installStep = 2">
                  {{ t.installPrev }}
                </button>
                <button type="button" class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer" @click="installStep = 4">
                  {{ t.installNext }}
                </button>
              </div>
            </div>

            <!-- Step 4: Deploy & Install -->
            <div v-else class="space-y-5">
              <!-- Cloudflare Worker + D1 One-Click Install -->
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-4">
                <div class="flex items-center gap-2.5">
                  <div class="h-9 w-9 rounded-xl bg-[#0066CC]/10 text-[#0066CC] flex items-center justify-center">
                    <Rocket :size="18" />
                  </div>
                  <div>
                    <h3 class="text-base font-extrabold text-[#1D1D1F]">4. {{ t.installStep4 }} (Cloudflare Worker + D1)</h3>
                    <p class="text-xs text-[#6E6E73]">Deploys an isolated D1 database & storefront API worker for <strong>{{ store.name }}</strong>.</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">Cloudflare API Token (optional if set in server env)</label>
                    <input v-model="cfDeployToken" type="password" placeholder="cf_..." class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-[#1D1D1F] mb-1.5">Owner Notification Email</label>
                    <input v-model="cfDeployEmail" type="email" :placeholder="smtpConfig.fromEmail || 'owner@restaurant.se'" class="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3.5 text-xs font-mono" />
                  </div>
                </div>

                <div v-if="installError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {{ installError }}
                </div>

                <div v-if="installation.installed" class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                  <div class="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 :size="15" />
                    <span>{{ t.installSuccess }}</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div class="p-2.5 rounded-xl bg-white border border-emerald-200">
                      <div class="text-[10px] font-bold text-[#6E6E73] uppercase">Worker URL</div>
                      <div class="font-mono font-semibold text-[#1D1D1F] truncate mt-0.5">{{ installation.workerUrl }}</div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <div class="text-[10px] font-bold text-[#6E6E73] uppercase">API Key</div>
                        <div class="font-mono font-semibold text-[#1D1D1F] truncate mt-0.5">{{ installation.apiKey }}</div>
                      </div>
                      <button type="button" class="text-[#0066CC] cursor-pointer shrink-0" @click="copyText(installation.apiKey)"><Copy :size="14" /></button>
                    </div>
                    <div class="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <div class="text-[10px] font-bold text-[#6E6E73] uppercase">Seller PIN</div>
                        <div class="font-mono font-semibold text-[#1D1D1F] truncate mt-0.5">{{ installation.pinCode }}</div>
                      </div>
                      <button type="button" class="text-[#0066CC] cursor-pointer shrink-0" @click="copyText(installation.pinCode)"><Copy :size="14" /></button>
                    </div>
                  </div>
                  <div class="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2 text-xs">
                    <div class="min-w-0">
                      <div class="text-[10px] font-bold text-[#6E6E73] uppercase">Storefront REST API (Show Menu &amp; Sell)</div>
                      <div class="font-mono font-semibold text-[#1D1D1F] truncate mt-0.5">{{ workerBaseUrl }}/api/storefront?key={{ installation.apiKey }}</div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <button type="button" class="h-8 px-3 rounded-lg bg-[#F5F5F7] text-[#0066CC] font-bold cursor-pointer" @click="copyText(`${workerBaseUrl}/api/storefront?key=${installation.apiKey}`)">Copy API</button>
                      <button type="button" class="h-8 px-3 rounded-lg bg-[#0066CC] text-white font-bold cursor-pointer" @click="settingsSubTab = 'api'">Open REST API</button>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button type="button" class="h-10 px-5 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-xs font-bold cursor-pointer" @click="installStep = 3">
                    {{ t.installPrev }}
                  </button>
                  <button
                    type="button"
                    :disabled="installDeploying"
                    class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                    @click="deployPanelToCloudflare"
                  >
                    <Rocket :size="14" />
                    <span>{{ installDeploying ? t.installDeploying : t.installDeployBtn }}</span>
                  </button>
                </div>
              </div>

              <!-- Local / CLI Self-Hosted Install Instructions -->
              <div class="rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] p-6 space-y-3">
                <div class="flex items-center gap-2">
                  <Terminal :size="16" class="text-[#0066CC]" />
                  <h3 class="text-sm font-extrabold text-[#1D1D1F]">{{ t.installSelfHosted }}</h3>
                </div>
                <pre class="p-4 rounded-xl bg-[#1D1D1F] text-[#F5F5F7] text-xs font-mono overflow-x-auto leading-relaxed">npm install
npm run dev          # Local development
npm run build        # Build Nuxt + Cloudflare module
npx wrangler deploy  # Deploy panel to Cloudflare Workers</pre>
              </div>
            </div>
          </div>
          </div>
        </template>
      </main>
    </div>

    <!-- First-Time Setup Wizard Modal (Next -> Next -> Finish) -->
    <div
      v-if="showSetupWizard"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="w-full max-w-xl rounded-3xl bg-white border border-[#E5E5EA] p-6 sm:p-7 space-y-5 shadow-2xl">
        <!-- Header & Step Dots -->
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-[#0066CC]">
              First-Time Setup • Step {{ wizardStep }} of 4
            </div>
            <h2 class="text-lg font-extrabold text-[#1D1D1F] mt-0.5">
              {{ wizardStep === 1 ? 'Restaurant Name & Logo' : wizardStep === 2 ? 'Delivery & Takeaway Setup' : wizardStep === 3 ? 'Telegram & Email Alerts' : 'Ready to Launch!' }}
            </h2>
          </div>
          <button
            type="button"
            class="text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
            @click="finishSetupWizard"
          >
            Skip
          </button>
        </div>

        <!-- Progress Bar -->
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="s in 4"
            :key="s"
            :class="['h-1.5 rounded-full transition-colors', s <= wizardStep ? 'bg-[#0066CC]' : 'bg-[#E5E5EA]']"
          />
        </div>

        <!-- Step 1: Restaurant Name, Logo & Contact -->
        <div v-if="wizardStep === 1" class="space-y-4">
          <div class="flex items-center gap-4">
            <div
              class="h-16 w-16 rounded-2xl border border-[#E5E5EA] bg-[#F5F5F7] flex items-center justify-center overflow-hidden shrink-0 font-extrabold text-sm text-[#0066CC]"
            >
              <img v-if="store.logoUrl" :src="store.logoUrl" :alt="store.name" class="h-full w-full object-cover" />
              <span v-else>{{ (store.name || 'SP').slice(0, 2).toUpperCase() }}</span>
            </div>
            <label class="h-9 px-4 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
              <Upload :size="13" />
              <span>{{ t.uploadLogo }}</span>
              <input type="file" accept="image/*" class="hidden" @change="handleImageUpload($event, 'logo')" />
            </label>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.storeName }}</label>
              <input v-model="store.name" type="text" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs" />
            </div>
            <div>
              <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.country }}</label>
              <select
                :value="store.country"
                class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-semibold"
                @change="onCountryChange($event.target.value)"
              >
                <option v-for="c in STORE_COUNTRIES" :key="c.id" :value="c.id">{{ c.name }} ({{ c.currency }})</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.phone }}</label>
              <input v-model="store.phone" type="text" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-mono" />
            </div>
            <div>
              <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.address }}</label>
              <input v-model="store.address" type="text" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs" />
            </div>
          </div>
        </div>

        <!-- Step 2: Delivery & Takeaway Setup -->
        <div v-else-if="wizardStep === 2" class="space-y-4">
          <div class="flex flex-wrap gap-3">
            <label class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-semibold cursor-pointer">
              <input v-model="restaurantConfig.deliveryEnabled" type="checkbox" class="accent-[#0066CC]" />
              <span>{{ t.deliveryEnabled }}</span>
            </label>
            <label class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-semibold cursor-pointer">
              <input v-model="restaurantConfig.pickupEnabled" type="checkbox" class="accent-[#0066CC]" />
              <span>{{ t.pickupEnabled }}</span>
            </label>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.maxDeliveryDistance }}</label>
              <input v-model="restaurantConfig.maxDeliveryKm" type="number" min="1" max="100" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-mono" />
            </div>
            <div>
              <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.shippingFee }} ({{ store.currency }})</label>
              <input v-model="store.shippingFee" type="number" min="0" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-mono" />
            </div>
            <div>
              <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.freeShippingOver }} ({{ store.currency }})</label>
              <input v-model="store.freeShippingOver" type="number" min="0" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-mono" />
            </div>
            <div>
              <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.openingHours }}</label>
              <input v-model="restaurantConfig.openingHours" type="text" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs" />
            </div>
          </div>
        </div>

        <!-- Step 3: Telegram & Email Notifications -->
        <div v-else-if="wizardStep === 3" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.chatId }} (Telegram Order Alerts)</label>
            <input v-model="telegramConfig.chatId" type="text" placeholder="-1001234567890" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-mono" />
          </div>
          <div>
            <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.botToken }}</label>
            <input v-model="telegramConfig.botToken" type="text" placeholder="123456789:AAH..." class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-mono" />
          </div>
          <div>
            <label class="block text-xs font-bold text-[#1D1D1F] mb-1">{{ t.fromEmail }} (SMTP)</label>
            <input v-model="smtpConfig.fromEmail" type="email" placeholder="orders@restaurant.se" class="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] px-3 text-xs font-mono" />
          </div>
        </div>

        <!-- Step 4: Finish & Ready to Receive Orders -->
        <div v-else class="space-y-3">
          <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs text-emerald-900">
            <div class="font-extrabold flex items-center gap-1.5 text-sm">
              <CheckCircle2 :size="16" class="text-emerald-600" />
              <span>{{ store.name }} is configured!</span>
            </div>
            <ul class="space-y-1 text-emerald-800">
              <li>• Currency: <strong>{{ store.currency }}</strong> • Delivery Radius: <strong>{{ restaurantConfig.maxDeliveryKm }} km</strong></li>
              <li>• Services: <strong>{{ restaurantConfig.deliveryEnabled ? 'Delivery' : '' }}{{ restaurantConfig.deliveryEnabled && restaurantConfig.pickupEnabled ? ' & ' : '' }}{{ restaurantConfig.pickupEnabled ? 'Takeaway' : '' }}</strong></li>
              <li>• Telegram Alerts: <strong>{{ telegramConfig.chatId ? 'Connected' : 'Can be added later in Settings' }}</strong></li>
            </ul>
          </div>
          <p class="text-xs text-[#6E6E73]">
            Click <strong>Finish</strong> to start receiving and managing orders right away.
          </p>
        </div>

        <!-- Wizard Footer Navigation: Back -> Next -> Finish -->
        <div class="flex items-center justify-between pt-2 border-t border-[#E5E5EA]">
          <button
            v-if="wizardStep > 1"
            type="button"
            class="h-10 px-5 rounded-full bg-[#F5F5F7] hover:bg-[#ECECEF] border border-[#E5E5EA] text-xs font-bold cursor-pointer"
            @click="wizardStep -= 1"
          >
            ← Back
          </button>
          <span v-else />

          <button
            v-if="wizardStep < 4"
            type="button"
            class="h-10 px-6 rounded-full bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-bold cursor-pointer"
            @click="wizardStep += 1"
          >
            Next →
          </button>
          <button
            v-else
            type="button"
            class="h-10 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            @click="finishSetupWizard"
          >
            <Check :size="14" />
            <span>Finish</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
