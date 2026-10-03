type DatabaseEnvironment = Readonly<Record<string, string | undefined>>;

function value(env: DatabaseEnvironment, ...keys: string[]) {
  return keys.map((key) => env[key]?.trim()).find(Boolean);
}

function postgresUrl(raw: string | undefined, key: string) {
  if (!raw) throw new Error(`Missing database config: ${key}`);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // Connection strings contain credentials; never include them in errors.
    throw new Error(`Invalid database config: ${key}`);
  }
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length < 2
  )
    throw new Error(`Invalid PostgreSQL connection: ${key}`);
  return url;
}

function requireCloudConnection(url: URL, key: string) {
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.startsWith("127.") ||
    ["[::1]", "0.0.0.0", "[::]"].includes(host)
  )
    throw new Error(`${key} must point to hosted PostgreSQL, not a local DB`);
  if (
    !["require", "verify-ca", "verify-full"].includes(
      url.searchParams.get("sslmode") ?? "",
    )
  )
    throw new Error(`${key} requires TLS: set sslmode=require or stricter`);
}

export function runtimeDatabaseUrl(env: DatabaseEnvironment = process.env) {
  const url = postgresUrl(
    value(env, "DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"),
    "DATABASE_URL",
  );
  if (env.VERCEL === "1" || env.APP_MODE === "production")
    requireCloudConnection(url, "DATABASE_URL");
  if (env.VERCEL === "1") {
    // Each warm function owns a pool; start small and retain provider options.
    if (!url.searchParams.has("connection_limit"))
      url.searchParams.set("connection_limit", "1");
    if (!url.searchParams.has("connect_timeout"))
      url.searchParams.set("connect_timeout", "15");
    if (!url.searchParams.has("pool_timeout"))
      url.searchParams.set("pool_timeout", "15");
  }
  const limit = url.searchParams.get("connection_limit");
  if (limit !== null && (!/^\d+$/.test(limit) || Number(limit) < 1))
    throw new Error("DATABASE_URL connection_limit must be a positive integer");
  return url.toString();
}

export function migrationDatabaseUrl(env: DatabaseEnvironment = process.env) {
  const direct = value(env, "DIRECT_URL", "POSTGRES_URL_NON_POOLING");
  const cloud = env.VERCEL === "1" || env.APP_MODE === "production";
  if (cloud && !direct)
    throw new Error("Missing DIRECT_URL for hosted PostgreSQL migrations");
  const url = postgresUrl(
    direct ?? value(env, "DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"),
    "DIRECT_URL / DATABASE_URL",
  );
  if (cloud) requireCloudConnection(url, "DIRECT_URL");
  if (url.searchParams.get("pgbouncer") === "true")
    throw new Error("DIRECT_URL must use a direct or session connection");
  return url.toString();
}
