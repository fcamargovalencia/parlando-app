export const Config = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'https://parlando-api-production.up.railway.app',
  AES_KEY: process.env.EXPO_PUBLIC_AES_KEY ?? '',
} as const;

export const APP = {
  NAME: 'ParlAndo',
  VERSION: '1.0.0',
  STORE_KEY: 'parlando-app-auth',
  PHONE_PREFIX: '+57',
  DEFAULT_CURRENCY: 'COP',
} as const;
