import { z } from "zod";
import { ConfigurationError } from "../errors/appErrors";

const postgresUrlRegex = /^postgres(ql)?:\/\/[^:]+:[^@]+@[^/]+(\/.*)?$/;

export const backendEnvSchema = z.object({
  DATABASE_URL: z
    .string({ required_error: "DATABASE_URL is required for backend operation." })
    .regex(postgresUrlRegex, "DATABASE_URL must be a valid PostgreSQL connection URI."),
  DATABASE_URL_UNPOOLED: z
    .string({ required_error: "DATABASE_URL_UNPOOLED is required for migrations and DDL." })
    .regex(postgresUrlRegex, "DATABASE_URL_UNPOOLED must be a valid PostgreSQL connection URI."),
  CLERK_SECRET_KEY: z
    .string({ required_error: "CLERK_SECRET_KEY is required for server-side token verification." })
    .min(10, "CLERK_SECRET_KEY must be a valid Clerk secret key.")
    .refine((val) => val.startsWith("sk_test_") || val.startsWith("sk_live_"), {
      message: "CLERK_SECRET_KEY must start with 'sk_test_' or 'sk_live_'."
    }),
  VITE_CLERK_PUBLISHABLE_KEY: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith("pk_test_") || val.startsWith("pk_live_"), {
      message: "VITE_CLERK_PUBLISHABLE_KEY must start with 'pk_test_' or 'pk_live_'."
    }),
  CLERK_WEBHOOK_SIGNING_SECRET: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith("whsec_"), {
      message: "CLERK_WEBHOOK_SIGNING_SECRET must start with 'whsec_'."
    }),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export type BackendConfig = z.infer<typeof backendEnvSchema>;

let cachedConfig: BackendConfig | null = null;

/**
 * Extracts and validates backend environment variables without leaking credentials in error messages.
 */
export function validateBackendEnvironment(customEnv?: Record<string, string | undefined>): BackendConfig {
  const envSource = customEnv ?? process.env;

  const rawConfig = {
    DATABASE_URL:
      envSource.DATABASE_URL ||
      envSource.NEON_DATABASE_URL_POOLED ||
      envSource.VITE_NEON_DATABASE_URL,
    DATABASE_URL_UNPOOLED:
      envSource.DATABASE_URL_UNPOOLED ||
      envSource.NEON_DATABASE_URL_UNPOOLED ||
      envSource.DATABASE_URL ||
      envSource.NEON_DATABASE_URL_POOLED ||
      envSource.VITE_NEON_DATABASE_URL,
    CLERK_SECRET_KEY: envSource.CLERK_SECRET_KEY,
    VITE_CLERK_PUBLISHABLE_KEY:
      envSource.VITE_CLERK_PUBLISHABLE_KEY ||
      envSource.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_WEBHOOK_SIGNING_SECRET: envSource.CLERK_WEBHOOK_SIGNING_SECRET,
    NODE_ENV: envSource.NODE_ENV || "development"
  };

  const parseResult = backendEnvSchema.safeParse(rawConfig);

  if (!parseResult.success) {
    const errorDetails = parseResult.error.errors.map((err) => {
      const field = err.path.join(".");
      // Ensure we NEVER output sensitive values in error messages
      return `${field}: ${err.message}`;
    });

    throw new ConfigurationError(
      `Invalid backend configuration: ${errorDetails.join("; ")}`
    );
  }

  return parseResult.data;
}

/**
 * Returns cached validated backend configuration.
 */
export function getBackendConfig(): BackendConfig {
  if (!cachedConfig) {
    cachedConfig = validateBackendEnvironment();
  }
  return cachedConfig;
}

/**
 * Clears cached config (useful for testing).
 */
export function clearBackendConfigCache(): void {
  cachedConfig = null;
}

/**
 * Helper to safely check if Neon is configured without throwing.
 */
export function isNeonConfigured(customEnv?: Record<string, string | undefined>): boolean {
  try {
    const envSource = customEnv ?? process.env;
    const url = envSource.DATABASE_URL || envSource.NEON_DATABASE_URL_POOLED || envSource.VITE_NEON_DATABASE_URL;
    return Boolean(url && postgresUrlRegex.test(url));
  } catch {
    return false;
  }
}

/**
 * Helper to safely check if Clerk is configured without throwing.
 */
export function isClerkConfigured(customEnv?: Record<string, string | undefined>): boolean {
  try {
    const envSource = customEnv ?? process.env;
    const key = envSource.CLERK_SECRET_KEY;
    return Boolean(key && (key.startsWith("sk_test_") || key.startsWith("sk_live_")));
  } catch {
    return false;
  }
}
