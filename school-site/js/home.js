function renderLatest() {
  const target = document.getElementById("latest-news");
  const items = getNews().slice(0, 3);
  if (!items.length) {
    target.innerHTML = '<div class="empty-state">هنوز اطلاعیه‌ای منتشر نشده است.</div>';
    return;
  }
  target.innerHTML = items.map(item => `
    <article class="news-card">
      <div class="news-date">${escapeHtml(item.date)}</div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
    </article>
  `).join("");
}
document.addEventListener("DOMContentLoaded", renderLatest);
