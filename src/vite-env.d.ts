/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPER_ADMIN_SECRET: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_FOUNDER_TENANT_IDS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
