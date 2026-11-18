/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_TAGLINE?: string;
  readonly VITE_NEON_DATABASE_URL?: string;
  readonly VITE_ENABLE_NEON_SYNC?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_TAVILY_API_KEY?: string;
  readonly TAVILY_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
