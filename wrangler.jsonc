/*
  Worker اصلی سایت مدرسه شاهد.

  کار این فایل فقط دو چیز است:
  ۱) هر درخواستی که به مسیرهای زیر نباشد را بدون هیچ تغییری به همان فایل‌های
     استاتیک قبلی (index.html، news.html، admin.html، css/، js/) می‌سپارد —
     یعنی رفتار سایت برای بازدیدکننده‌ها دقیقاً مثل قبل است.
  ۲) سه مسیر API برای ورود/خروج پنل مدیریت را مدیریت می‌کند و رمز عبور را
     واقعاً به‌صورت یک Secret سمت سرور (نه در کد سمت مرورگر) بررسی می‌کند.

  راه‌اندازی روی Cloudflare:
    wrangler secret put ADMIN_PASSWORD
    (رمز دلخواه خودتان را وارد کنید — دیگر رمز "1234" داخل کد نیست)
    سپس: wrangler deploy
*/

const COOKIE_NAME = "admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60; // ۸ ساعت

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (url.pathname === "/api/logout" && request.method === "POST") {
      return handleLogout();
    }
    if (url.pathname === "/api/session" && request.method === "GET") {
      return handleSessionCheck(request, env);
    }

    // هر مسیر دیگری: همان فایل استاتیک قبلی، بدون تغییر.
    return env.ASSETS.fetch(request);
  }
};

async function handleLogin(request, env) {
  if (!hasSecret(env)) {
    return jsonResponse(
      { ok: false, error: "رمز مدیر روی سرور تنظیم نشده است (ADMIN_PASSWORD)." },
      500
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "درخواست نامعتبر است." }, 400);
  }

  const password = typeof body?.password === "string" ? body.password : "";
  if (!timingSafeEqual(password, env.ADMIN_PASSWORD)) {
    return jsonResponse({ ok: false, error: "رمز عبور نادرست است." }, 401);
  }

  const token = await createSessionToken(env.ADMIN_PASSWORD);
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  headers.append("Set-Cookie", buildCookie(token, SESSION_DURATION_SECONDS));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

function handleLogout() {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  headers.append("Set-Cookie", buildCookie("", 0));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

async function handleSessionCheck(request, env) {
  if (!hasSecret(env)) return jsonResponse({ loggedIn: false });
  const token = getCookie(request, COOKIE_NAME);
  const valid = await verifySessionToken(token, env.ADMIN_PASSWORD);
  return jsonResponse({ loggedIn: valid });
}

function hasSecret(env) {
  return typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length > 0;
}

function buildCookie(token, maxAgeSeconds) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/* --- امضای نشست با HMAC-SHA256 (بدون نیاز به کتابخانه‌ی خارجی) --- */

async function createSessionToken(secret) {
  const payload = JSON.stringify({ exp: nowSeconds() + SESSION_DURATION_SECONDS });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  const signature = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

async function verifySessionToken(token, secret) {
  if (!token || !token.includes(".")) return false;
  const [payloadB64, signature] = token.split(".");
  const expectedSignature = await hmacSign(payloadB64, secret);
  if (!timingSafeEqual(signature, expectedSignature)) return false;

  try {
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);
    return typeof payload.exp === "number" && payload.exp > nowSeconds();
  } catch {
    return false;
  }
}

async function hmacSign(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64UrlEncode(signature);
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function base64UrlEncode(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const padLength = (4 - (value.length % 4)) % 4;
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}
