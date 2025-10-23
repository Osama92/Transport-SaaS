/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID: string
  readonly VITE_USE_FIRESTORE: string
  readonly VITE_PAYSTACK_PUBLIC_KEY: string
  readonly VITE_PAYSTACK_SECRET_KEY: string
  readonly VITE_TERMII_API_KEY: string
  readonly VITE_TERMII_SENDER_ID: string
  readonly VITE_WHATSAPP_ACCESS_TOKEN: string
  readonly VITE_WHATSAPP_PHONE_NUMBER_ID: string
  readonly VITE_WHATSAPP_BUSINESS_ACCOUNT_ID: string
  readonly VITE_WHATSAPP_VERIFY_TOKEN: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_HCTI_USER_ID: string
  readonly VITE_HCTI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
