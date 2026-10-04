// Explicit cloud prototype profile: durable adapters, real CAPTCHA and email.
// Production retains its stricter content and malware-scanner requirements.
export function cloudPrototype(env = process.env) {
  return (
    env.VERCEL === "1" &&
    env.APP_MODE === "prototype" &&
    env.DEPLOYMENT_PROFILE === "vercel-prototype"
  );
}
export function localAdapters(env = process.env) {
  return env.APP_MODE === "prototype" && env.VERCEL !== "1";
}
