/*
  Worker اصلی سایت مدرسه شاهد.

  ۱) هر درخواستی که به مسیرهای زیر نباشد را بدون هیچ تغییری به همان فایل‌های
     استاتیک قبلی (index.html، news.html، admin.html، staff.html، css/، js/)
     می‌سپارد.
  ۲) مسیرهای ورود/خروج پنل مدیریت را مدیریت می‌کند (رمز به‌صورت Secret واقعی).
  ۳) مسیرهای کارمندان و تصاویر سایت (لوگو/عکس محیط مدرسه) را از/به
     Cloudflare R2 می‌خواند و می‌نویسد — این‌ها برای همه‌ی بازدیدکننده‌ها
     یکسان دیده می‌شوند (برخلاف اطلاعیه‌ها که هنوز در localStorage مرورگر
     مدیر ذخیره می‌شوند).

  راه‌اندازی روی Cloudflare (فقط یک‌بار):
    wrangler secret put ADMIN_PASSWORD
    wrangler deploy
  (باکت R2 باید در wrangler.jsonc با binding به نام R2 متصل شده باشد.)
*/

const COOKIE_NAME = "admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60; // ۸ ساعت
const STAFF_KEY = "data/staff.json";
// دامنه‌ی سفارشیِ عمومیِ باکت R2 (طبق AboutSite.md). اگر این دامنه را عوض
// کردید، همین یک خط را به‌روزرسانی کنید.
const R2_PUBLIC_BASE_URL = "https://dl.modares12.com";

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

    if (url.pathname === "/api/staff" && request.method === "GET") {
      return handleGetStaff(env);
    }
    if (url.pathname === "/api/staff" && request.method === "POST") {
      if (!(await requireAuth(request, env))) return unauthorized();
      return handleSaveStaff(request, env);
    }
    if (url.pathname === "/api/staff-delete" && request.method === "POST") {
      if (!(await requireAuth(request, env))) return unauthorized();
      return handleDeleteStaff(request, env);
    }

    if (url.pathname === "/api/site-images" && request.method === "POST") {
      if (!(await requireAuth(request, env))) return unauthorized();
      return handleSiteImages(request, env);
    }

    // هر مسیر دیگری: همان فایل استاتیک قبلی، بدون تغییر.
    return env.ASSETS.fetch(request);
  }
};

/* ------------------------------- ورود/خروج ------------------------------- */

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

async function requireAuth(request, env) {
  if (!hasSecret(env)) return false;
  const token = getCookie(request, COOKIE_NAME);
  return verifySessionToken(token, env.ADMIN_PASSWORD);
}

function unauthorized() {
  return jsonResponse({ ok: false, error: "ابتدا وارد پنل مدیریت شوید." }, 401);
}

/* -------------------------------- کارمندان -------------------------------- */

async function readStaffList(env) {
  const obj = await env.R2.get(STAFF_KEY);
  if (!obj) return [];
  try {
    const list = await obj.json();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeStaffList(env, list) {
  await env.R2.put(STAFF_KEY, JSON.stringify(list), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
}

async function handleGetStaff(env) {
  const list = await readStaffList(env);
  return jsonResponse({ ok: true, items: list });
}

async function handleSaveStaff(request, env) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ ok: false, error: "درخواست نامعتبر است." }, 400);
  }

  const name = (formData.get("name") || "").toString().trim();
  const role = (formData.get("role") || "").toString().trim();
  const existingId = (formData.get("id") || "").toString().trim();
  const photo = formData.get("photo");

  if (!name || !role) {
    return jsonResponse({ ok: false, error: "نام و سمت الزامی است." }, 400);
  }

  const list = await readStaffList(env);
  const id = existingId || makeStaffId();
  let record = list.find((item) => item.id === id);
  let photoUrl = record ? record.photoUrl || "" : "";

  if (photo && typeof photo === "object" && photo.size > 0) {
    const key = `staff-photos/${id}`;
    await env.R2.put(key, photo, {
      httpMetadata: { contentType: photo.type || "image/jpeg", cacheControl: "public, max-age=300" }
    });
    photoUrl = `${R2_PUBLIC_BASE_URL}/${key}`;
  }

  const updatedRecord = { id, name, role, photoUrl };

  if (record) {
    Object.assign(record, updatedRecord);
  } else {
    list.unshift(updatedRecord);
  }

  await writeStaffList(env, list);
  return jsonResponse({ ok: true, items: list });
}

async function handleDeleteStaff(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "درخواست نامعتبر است." }, 400);
  }

  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return jsonResponse({ ok: false, error: "شناسه نامعتبر است." }, 400);

  const list = await readStaffList(env);
  const next = list.filter((item) => item.id !== id);
  await writeStaffList(env, next);

  try {
    await env.R2.delete(`staff-photos/${id}`);
  } catch {
    // بی‌اهمیت اگر فایل عکسی برای حذف وجود نداشت
  }

  return jsonResponse({ ok: true, items: next });
}

function makeStaffId() {
  return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

/* ------------------------------- تصاویر سایت ------------------------------- */

async function handleSiteImages(request, env) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ ok: false, error: "درخواست نامعتبر است." }, 400);
  }

  const logo = formData.get("logo");
  const campus = formData.get("campus");
  const hasLogo = logo && typeof logo === "object" && logo.size > 0;
  const hasCampus = campus && typeof campus === "object" && campus.size > 0;

  if (!hasLogo && !hasCampus) {
    return jsonResponse({ ok: false, error: "هیچ فایلی انتخاب نشده است." }, 400);
  }

  if (hasLogo) {
    await env.R2.put("site/logo", logo, {
      httpMetadata: { contentType: logo.type || "image/png", cacheControl: "public, max-age=300" }
    });
  }
  if (hasCampus) {
    await env.R2.put("site/campus", campus, {
      httpMetadata: { contentType: campus.type || "image/jpeg", cacheControl: "public, max-age=300" }
    });
  }

  return jsonResponse({ ok: true });
}

/* --------------------------------- کمکی‌ها --------------------------------- */

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
  const match = header.split(";").map((v) => v.trim()).find((v) => v.startsWith(name + "="));
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
