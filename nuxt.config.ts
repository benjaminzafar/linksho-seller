export default defineNuxtConfig({
  compatibilityDate: '2025-03-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'cloudflare-module',
  },
  app: {
    head: {
      title: 'Seller pannel | پنل فروش اختصاصی',
      htmlAttrs: { lang: 'fa', dir: 'rtl' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Seller pannel — ساخت و مدیریت پنل فروش و فروشگاه آنلاین اختصاصی روی کلودفلر' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap' },
      ],
    },
  },
});
