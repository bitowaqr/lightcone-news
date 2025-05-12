// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindTypography from '@tailwindcss/typography';
const sw = true;
export default defineNuxtConfig({
  compatibilityDate: '2025-04-04',
  devtools: { enabled: true },
  modules: [
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/sitemap',
    'nuxt-gtag',
    '@vite-pwa/nuxt',
  ],
  imports: {
    dirs: ['composables', 'stores'],
  },
  css: ['~/assets/css/main.css'],
  tailwindcss: {
    configPath: './tailwind.config.js',
    plugins: [tailwindTypography],
  },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Lightcone News',
      titleTemplate: '%s - Lightcone News',
      meta: [
        { name: 'description', content: 'Contextualised News. Future-oriented.' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },
  site: {
    url: process.env.APP_URL || 'http://localhost:3000',
    name: process.env.APP_NAME || 'Lightcone News',
    description: process.env.APP_DESCRIPTION || 'AI-powered news aggregator...',
    image: '/favicon.ico',
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: process.env.APP_NAME || 'Lightcone News',
      short_name: 'Lightcone',
      description: process.env.APP_DESCRIPTION || 'Contextualised News. Future-oriented.',
      theme_color: '#c97240', 
      background_color: '#EAE2D6', 
      display: 'standalone',
      start_url: '/',
      icons: [
        {
          src: 'pwa-192x192.png', // Ensure this file exists in public/
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'pwa-512x512.png', // Ensure this file exists in public/
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: 'pwa-512x512.png', // Maskable icon for adaptive icons
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
    client: {
      installPrompt: true,
    },
  },
  sitemap: {
    sitemapName: 'sitemap.xml',
    defaultSitemapsChunkSize: 1000,
    priority: 0.8,
    changefreq: 'daily',
    sources: [
      '/api/__sitemap__/urls',
    ],
    exclude: ['/admin', '/admin/*'],
  },
  gtag: {
    enabled: process.env.ENV != 'DEVELOPMENT',
    id: process.env.GTAG_ID,
    initCommands: [
      ['consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500,
      }]
    ]
  },

  runtimeConfig: {
    // MongoDB
    mongodbUri: process.env.MONGODB_URI,
    mongoUsername: process.env.MONGO_USERNAME,
    mongoPassword: process.env.MONGO_PASSWORD,
    
    // JWT Authentication
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    
    // Email verification
    emailFrom: process.env.EMAIL_FROM,
    frontendUrl: process.env.FRONTEND_URL,
    
    // ChromaDB
    chromaUrl: process.env.CHROMA_URL,
    
    // AI Services
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    
    // AWS SES
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsRegion: process.env.AWS_REGION,

    // Metaculus API Token (Server-side only)
    metaculusApiToken: process.env.METACULUS_API_TOKEN,
  },
  fonts: {
    defaults: {
      weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
      style: ['normal', 'italic'],
      subsets: ['latin'],
    },
  },
})