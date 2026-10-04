import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
// Owner-only handoff artifact. Never read the local DB URL or log secret values.
await mkdir(".local", { recursive: true });
await writeFile(
  ".local/vercel-copy.env",
  `# Import into Vercel Production environment only.
# Replace the five THAY_ variables before importing. Neon / Blob / Resend supply their keys separately.
APP_MODE=prototype
DEPLOYMENT_PROFILE=vercel-prototype
NEXT_PUBLIC_APP_MODE=prototype
NEXT_PUBLIC_DEPLOYMENT_PROFILE=vercel-prototype
BOOTSTRAP_DEMO=true
SITE_URL=https://prj-tranh-dong-ho.vercel.app
AUTH_TRUST_HOST=true
TRUST_PROXY=true
AUTH_SECRET=${randomBytes(32).toString("base64url")}
PII_ENCRYPTION_KEY=${randomBytes(32).toString("hex")}
CRON_SECRET=${randomBytes(32).toString("base64url")}
INITIAL_ADMIN_EMAIL=THAY_EMAIL_ADMIN_CUA_BAN
INITIAL_ADMIN_PASSWORD=${randomBytes(24).toString("base64url")}
ADMIN_NOTIFY_EMAIL=THAY_EMAIL_ADMIN_CUA_BAN
MAIL_MODE=resend
MAIL_FROM="Dong Ho <website@THAY_TEN_MIEN_GUI_MAIL>"
MEDIA_STORAGE=vercel-blob
NEXT_PUBLIC_TURNSTILE_SITE_KEY=THAY_SITE_KEY_TURNSTILE
TURNSTILE_SECRET_KEY=THAY_SECRET_KEY_TURNSTILE
`,
  { flag: "wx" },
);
console.log(
  "Private deployment file prepared in .local/vercel-copy.env; no secret values logged.",
);
