async function renderGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  try {
    const res = await fetch("/api/gallery");
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    if (!items.length) {
      grid.innerHTML = '<div class="empty-state">هنوز تصویری به گالری اضافه نشده است.</div>';
      return;
    }

    grid.innerHTML = items.map((item, index) => `
      <button type="button" class="gallery-item reveal" data-index="${index}">
        <img src="${escapeHtml(item.photoUrl)}" alt="${escapeHtml(item.caption || "")}" loading="lazy">
        ${item.caption ? `<span class="gallery-caption">${escapeHtml(item.caption)}</span>` : ""}
      </button>
    `).join("");
    initScrollReveal(grid);
    setupLightbox(items);
  } catch {
    grid.innerHTML = '<div class="empty-state">خطا در دریافت تصاویر. صفحه را دوباره بارگذاری کنید.</div>';
  }
}

function setupLightbox(items) {
  const grid = document.getElementById("gallery-grid");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const closeBtn = lightbox.querySelector(".lightbox-close");

  function open(index) {
    const item = items[index];
    if (!item) return;
    lightboxImg.src = item.photoUrl;
    lightboxImg.alt = item.caption || "";
    lightboxCaption.textContent = item.caption || "";
    lightbox.hidden = false;
  }

  function close() {
    lightbox.hidden = true;
    lightboxImg.src = "";
  }

  grid.addEventListener("click", (event) => {
    const btn = event.target.closest(".gallery-item");
    if (!btn) return;
    open(Number(btn.dataset.index));
  });

  closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) close();
  });
}

document.addEventListener("DOMContentLoaded", renderGallery);
