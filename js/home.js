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

async function renderGalleryPreview() {
  const target = document.getElementById("gallery-preview");
  const section = document.getElementById("gallery-preview-section");
  if (!target) return;

  try {
    const res = await fetch("/api/gallery");
    const data = await res.json();
    const items = (Array.isArray(data.items) ? data.items : []).slice(0, 6);

    if (!items.length) {
      if (section) section.hidden = true;
      return;
    }
    target.innerHTML = items.map(item => `
      <a class="gallery-item reveal" href="gallery.html">
        <img src="${escapeHtml(item.photoUrl)}" alt="${escapeHtml(item.caption || "")}" loading="lazy">
      </a>
    `).join("");
    initScrollReveal(target);
  } catch {
    if (section) section.hidden = true;
  }
}

async function renderUsefulLinks() {
  const target = document.getElementById("useful-links");
  const section = document.getElementById("links-section");
  if (!target) return;

  try {
    const res = await fetch("/api/links");
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    if (!items.length) {
      if (section) section.hidden = true;
      return;
    }
    target.innerHTML = items.map(item => `
      <a class="link-chip reveal" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
    `).join("");
    initScrollReveal(target);
  } catch {
    if (section) section.hidden = true;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderLatest();
  renderStaffPreview();
  renderGalleryPreview();
  renderUsefulLinks();
});
