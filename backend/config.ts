// backend/config.ts

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

// Helper: in production, require the env var. In dev, allow a fallback.
function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;

  if (isProd) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  if (fallback !== undefined) return fallback;
  return "";
}

export const config = {
  // Server
  port: Number(process.env.PORT || 3000),

  // Auth
  jwtSecret: env("JWT_SECRET", "dev_secret"),
  internalToken: env("INTERNAL_ADMIN_TOKEN", "internal_dev_token"),

  // Database
  // Railway will provide DATABASE_URL; in dev you can still use DB_* pieces.
  databaseUrl:
    process.env.DATABASE_URL ||
    `postgres://${env("DB_USER", "postgres")}:${env("DB_PASSWORD", "postgres")}@${env(
      "DB_HOST",
      "localhost"
    )}:${Number(process.env.DB_PORT || 5432)}/${env("DB_NAME", "voterfield")}`,

  // Redis
  redisUrl: env("REDIS_URL", "redis://localhost:6379"),

  // Object storage (Cloudflare R2 via S3-compatible API)
  // NOTE: credentials are handled in storage.ts (S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY)
  s3Endpoint: env("S3_ENDPOINT", "http://localhost:9000"),
  s3Bucket: env("S3_BUCKET", "voterfield"),
  s3Region: process.env.S3_REGION || (isProd ? "auto" : "us-east-1"),
  s3ForcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") !== "false",

  // Back-compat aliases (in case any older code references these names)
  // Prefer S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY everywhere.
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || "",
  s3SecretAccessKey:
    process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || "",
};
