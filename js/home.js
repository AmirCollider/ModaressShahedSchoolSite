function renderLatest() {
  const target = document.getElementById("latest-news");
  const items = getNews().slice(0, 3);
  if (!items.length) {
    target.innerHTML = '<div class="empty-state">هنوز اطلاعیه‌ای منتشر نشده است.</div>';
    return;
  }
  target.innerHTML = items.map(item => `
    <article class="news-card reveal">
      <div class="news-date">${escapeHtml(item.date)}</div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
    </article>
  `).join("");
  initScrollReveal(target);
}

async function renderStaffPreview() {
  const target = document.getElementById("staff-preview");
  if (!target) return;

  try {
    const items = (await fetchStaffList()).slice(0, 4);
    if (!items.length) {
      target.innerHTML = '<div class="empty-state">هنوز کارمندی ثبت نشده است.</div>';
      return;
    }
    target.innerHTML = items.map(renderStaffCard).join("");
    initScrollReveal(target);
  } catch {
    target.innerHTML = '<div class="empty-state">خطا در دریافت اطلاعات کارمندان.</div>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderLatest();
  renderStaffPreview();
});
