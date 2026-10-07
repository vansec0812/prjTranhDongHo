export function databaseStartupError(log, environment, exitCode) {
  let safeLog = log;
  for (const [key, value] of Object.entries(environment)) {
    if (
      !value ||
      !/PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL|DIRECT_URL/.test(key)
    )
      continue;
    safeLog = safeLog.replaceAll(value, "[REDACTED]");
    if (/URL/.test(key)) {
      try {
        const url = new URL(value);
        for (const secret of [url.password, decodeURIComponent(url.password)])
          if (secret) safeLog = safeLog.replaceAll(secret, "[REDACTED]");
      } catch {
        // Invalid URLs are already handled by the local setup config guard.
      }
    }
  }
  safeLog = safeLog
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[DB_URL_REDACTED]")
    .replace(/(password|secret|token|key)\s*[:=]\s*[^\s]+/gi, "$1=[REDACTED]");
  const details = safeLog.split(/\r?\n/).slice(-20).join("\n").trim();
  return new Error(
    `Local Postgres did not start (exit code: ${exitCode ?? "not exited"}). See .local/database.log.${details ? `\n${details}` : ""}`,
  );
}
