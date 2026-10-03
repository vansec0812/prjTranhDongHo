"use client";
import { useRef, useEffect, useState } from "react";
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          language: string;
        },
      ) => string;
      remove: (id: string) => void;
    };
  }
}
let scriptReady: Promise<void> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptReady) {
    scriptReady = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () =>
        window.turnstile ? resolve() : reject(new Error("CAPTCHA_UNAVAILABLE"));
      script.onerror = () => {
        script.remove();
        scriptReady = undefined;
        reject(new Error("CAPTCHA_UNAVAILABLE"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptReady;
}
export function Captcha({
  locale,
  onToken,
  eager = false,
}: {
  locale: string;
  onToken: (token: string) => void;
  eager?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  callback.current = onToken;
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: getComputedStyle(document.documentElement)
          .getPropertyValue("--space-24")
          .trim(),
      },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible && !eager) return;
    let mounted = true;
    loadTurnstile()
      .then(() => {
        if (mounted) setLoaded(true);
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    return () => {
      mounted = false;
    };
  }, [visible, eager]);
  useEffect(() => {
    if (!loaded || !visible || !container.current || !window.turnstile) return;
    const id = window.turnstile.render(container.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
      callback: (token) => {
        callback.current(token);
        setError(false);
      },
      "expired-callback": () => callback.current(""),
      "error-callback": () => {
        callback.current("");
        setError(true);
      },
      language: locale,
    });
    return () => window.turnstile?.remove(id);
  }, [loaded, visible, locale]);
  return (
    <div>
      <div ref={container} />
      {!loaded && (
        <p className="meta">
          {locale === "en"
            ? "Loading spam protection…"
            : "Đang tải kiểm tra chống spam…"}
        </p>
      )}
      {error && (
        <p role="alert" className="field-error">
          {locale === "en"
            ? "Spam protection unavailable. Check your connection and retry."
            : "Chống spam chưa sẵn sàng. Kiểm tra kết nối rồi tải lại."}
        </p>
      )}
    </div>
  );
}
