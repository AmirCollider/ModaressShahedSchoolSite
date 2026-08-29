const STORAGE_KEY = "school_news_v1";

const seedNews = [
  {
    id: "seed-1",
    title: "به سامانه اطلاع‌رسانی مدرسه خوش آمدید",
    date: "۱۴۰۵/۰۶/۰۱",
    body: "این وب‌سایت برای انتشار اخبار و اطلاعیه‌های مدرسه طراحی شده است."
  }
];

function getNews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedNews));
      return [...seedNews];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...seedNews];
  } catch {
    return [...seedNews];
  }
}

function saveNews(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function makeId() {
  return "n-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
  انیمیشن ورودِ هنگام اسکرول.
  عناصر دارای کلاس reveal را رصد می‌کند و با ورود به دید، کلاس is-visible
  را اضافه می‌کند (استایل مربوطه در css/style.css تعریف شده است).
  در مرورگرهای بدون IntersectionObserver، همه چیز بدون انیمیشن نمایش داده می‌شود.
*/
function initScrollReveal(root = document) {
  const items = root.querySelectorAll(".reveal:not(.is-visible)");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  items.forEach((el) => observer.observe(el));
}

/*
  اطلاعات کارمندان دیگر در localStorage نیست (چون باید برای همه‌ی بازدیدکننده‌ها
  یکسان دیده شود، نه فقط مرورگر مدیر) — از طریق Worker و Cloudflare R2 خوانده
  می‌شود. renderStaffCard در صفحه‌ی اصلی و صفحه‌ی کارمندان مشترک است.
*/
function renderStaffCard(item) {
  const initial = escapeHtml((item.name || "؟").trim().charAt(0) || "؟");
  const photo = item.photoUrl
    ? `<img class="staff-photo" src="${escapeHtml(item.photoUrl)}" alt="${escapeHtml(item.name)}" loading="lazy">`
    : `<div class="staff-photo staff-photo-placeholder">${initial}</div>`;

  return `
    <article class="staff-card reveal">
      ${photo}
      <h3>${escapeHtml(item.name)}</h3>
      <div class="staff-role">${escapeHtml(item.role)}</div>
    </article>
  `;
}

async function fetchStaffList() {
  const res = await fetch("/api/staff");
  if (!res.ok) throw new Error("staff fetch failed");
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}
