import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Stripe + Supabase-friendly baseline; tighten further once all third-party origins are catalogued. */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://m.stripe.network https://aientitle.com wss://aientitle.com${isDev ? " http://localhost:8080 ws://localhost:8080 http://127.0.0.1:8080 ws://127.0.0.1:8080" : ""}`,
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  env: {
    // Expose FRONTEND_URL to the browser bundle so client code can build canonical links.
    // (Kept as FRONTEND_URL to match existing infra conventions.)
    FRONTEND_URL: process.env.FRONTEND_URL,
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    qualities: [70, 75, 85],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack(config: any) {
    config.infrastructureLogging = { level: 'error' };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
    ]
  },
};

export default nextConfig;
