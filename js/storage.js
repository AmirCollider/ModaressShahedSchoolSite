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
