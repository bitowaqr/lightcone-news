// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindTypography from '@tailwindcss/typography';

export default defineNuxtConfig({
  compatibilityDate: '2025-04-04',
  devtools: { enabled: true },
  modules: [
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/sitemap',
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
  sitemap: {
    sitemapName: 'sitemap.xml',
    defaultSitemapsChunkSize: 1000,
    priority: 0.8,
    changefreq: 'daily',
    routes: async () => {
      const articles = await $fetch('/api/newsfeed'); // Fetch articles from the newsfeed API
      return articles.map(article => `/articles/${article.id}`); // Adjust the route as needed
    },
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
  },
  fonts: {
    defaults: {
      weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
      style: ['normal', 'italic'],
      subsets: ['latin'],
    },
  },
})