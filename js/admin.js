/*
  ورود پنل مدیریت سمت سرور بررسی می‌شود (worker.js + Secret واقعی در Cloudflare).
  برای تنظیم/تغییر رمز:  wrangler secret put ADMIN_PASSWORD

  اطلاعیه‌ها همچنان در localStorage همین مرورگر ذخیره می‌شوند (مثل قبل).
  کارمندان و تصاویر سایت (لوگو/عکس محیط مدرسه) روی Cloudflare R2 ذخیره
  می‌شوند تا برای همه‌ی بازدیدکننده‌ها یکسان دیده شوند.
*/

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // ۵ مگابایت

const loginPanel = document.getElementById("login-panel");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

const newsForm = document.getElementById("news-form");
const newsTitle = document.getElementById("news-title");
const newsDate = document.getElementById("news-date");
const newsBody = document.getElementById("news-body");
const editingId = document.getElementById("editing-id");
const saveNewsBtn = document.getElementById("save-news-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const adminNewsList = document.getElementById("admin-news-list");
const newsCount = document.getElementById("news-count");
const saveMessage = document.getElementById("save-message");

const staffForm = document.getElementById("staff-form");
const staffName = document.getElementById("staff-name");
const staffRole = document.getElementById("staff-role");
const staffPhotoInput = document.getElementById("staff-photo");
const staffEditingId = document.getElementById("staff-editing-id");
const saveStaffBtn = document.getElementById("save-staff-btn");
const cancelStaffEditBtn = document.getElementById("cancel-staff-edit-btn");
const adminStaffList = document.getElementById("admin-staff-list");
const staffCount = document.getElementById("staff-count");
const staffSaveMessage = document.getElementById("staff-save-message");
const staffErrorMessage = document.getElementById("staff-error-message");

const galleryForm = document.getElementById("gallery-form");
const galleryPhotoInput = document.getElementById("gallery-photo");
const galleryCaptionInput = document.getElementById("gallery-caption");
const saveGalleryBtn = document.getElementById("save-gallery-btn");
const adminGalleryList = document.getElementById("admin-gallery-list");
const galleryCount = document.getElementById("gallery-count");
const gallerySaveMessage = document.getElementById("gallery-save-message");
const galleryErrorMessage = document.getElementById("gallery-error-message");

const linkForm = document.getElementById("link-form");
const linkTitleInput = document.getElementById("link-title");
const linkUrlInput = document.getElementById("link-url");
const linkEditingId = document.getElementById("link-editing-id");
const saveLinkBtn = document.getElementById("save-link-btn");
const cancelLinkEditBtn = document.getElementById("cancel-link-edit-btn");
const adminLinkList = document.getElementById("admin-link-list");
const linkCount = document.getElementById("link-count");
const linkSaveMessage = document.getElementById("link-save-message");
const linkErrorMessage = document.getElementById("link-error-message");

const siteImagesForm = document.getElementById("site-images-form");
const siteLogoInput = document.getElementById("site-logo");
const siteCampusInput = document.getElementById("site-campus");
const siteImagesMessage = document.getElementById("site-images-message");
const siteImagesError = document.getElementById("site-images-error");
const adminLogoImg = document.getElementById("admin-logo-img");

function showAdmin() {
  loginPanel.hidden = true;
  adminPanel.hidden = false;
  renderAdminNews();
  loadStaff();
  loadGallery();
  loadLinks();
}

function showLogin() {
  loginPanel.hidden = false;
  adminPanel.hidden = true;
}

/* ---------------------------- اطلاعیه‌ها (بدون تغییر) ---------------------------- */

function renderAdminNews() {
  const items = getNews();
  newsCount.textContent = `${items.length.toLocaleString("fa-IR")} مورد`;

  if (!items.length) {
    adminNewsList.innerHTML = '<div class="empty-state">اطلاعیه‌ای وجود ندارد.</div>';
    return;
  }

  adminNewsList.innerHTML = items.map(item => `
    <article class="admin-news-item reveal">
      <div>
        <div class="news-date">${escapeHtml(item.date)}</div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.body)}</p>
      </div>
      <div class="admin-actions">
        <button class="small-btn" type="button" data-edit="${escapeHtml(item.id)}">ویرایش</button>
        <button class="small-btn danger" type="button" data-delete="${escapeHtml(item.id)}">حذف</button>
      </div>
    </article>
  `).join("");
  initScrollReveal(adminNewsList);
}

function resetForm() {
  newsForm.reset();
  editingId.value = "";
  saveNewsBtn.textContent = "ثبت اطلاعیه";
  cancelEditBtn.hidden = true;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.getElementById("password").value;
  loginError.hidden = true;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await res.json();

    if (res.ok && data.ok) {
      showAdmin();
    } else {
      loginError.textContent = data.error || "رمز عبور نادرست است.";
      loginError.hidden = false;
    }
  } catch {
    loginError.textContent = "خطا در ارتباط با سرور. دوباره تلاش کنید.";
    loginError.hidden = false;
  }
});

newsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = newsTitle.value.trim();
  const date = newsDate.value.trim();
  const body = newsBody.value.trim();
  const currentId = editingId.value.trim();

  let items = getNews();

  if (currentId) {
    items = items.map(item => item.id === currentId ? { ...item, title, date, body } : item);
  } else {
    items.unshift({ id: makeId(), title, date, body });
  }

  saveNews(items);
  renderAdminNews();
  resetForm();
  saveMessage.hidden = false;
  setTimeout(() => saveMessage.hidden = true, 2200);
});

cancelEditBtn.addEventListener("click", resetForm);

adminNewsList.addEventListener("click", (event) => {
  const editId = event.target.getAttribute("data-edit");
  const deleteId = event.target.getAttribute("data-delete");
  const items = getNews();

  if (editId) {
    const item = items.find(x => x.id === editId);
    if (!item) return;
    editingId.value = item.id;
    newsTitle.value = item.title;
    newsDate.value = item.date;
    newsBody.value = item.body;
    saveNewsBtn.textContent = "ذخیره تغییرات";
    cancelEditBtn.hidden = false;
    newsTitle.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (deleteId) {
    const item = items.find(x => x.id === deleteId);
    if (!item) return;

    if (confirm(`اطلاعیه «${item.title}» حذف شود؟`)) {
      saveNews(items.filter(x => x.id !== deleteId));
      renderAdminNews();
    }
  }
});

/* ------------------------------- کارمندان (جدید) ------------------------------- */

function renderAdminStaff(items) {
  staffCount.textContent = `${items.length.toLocaleString("fa-IR")} نفر`;

  if (!items.length) {
    adminStaffList.innerHTML = '<div class="empty-state">کارمندی ثبت نشده است.</div>';
    return;
  }

  adminStaffList.innerHTML = items.map(item => {
    const initial = escapeHtml((item.name || "؟").trim().charAt(0) || "؟");
    const photo = item.photoUrl
      ? `<img class="staff-photo" src="${escapeHtml(item.photoUrl)}" alt="">`
      : `<div class="staff-photo staff-photo-placeholder">${initial}</div>`;
    return `
      <article class="admin-news-item reveal">
        <div class="admin-staff-info">
          ${photo}
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.role)}</p>
          </div>
        </div>
        <div class="admin-actions">
          <button class="small-btn" type="button" data-staff-edit="${escapeHtml(item.id)}">ویرایش</button>
          <button class="small-btn danger" type="button" data-staff-delete="${escapeHtml(item.id)}">حذف</button>
        </div>
      </article>
    `;
  }).join("");
  initScrollReveal(adminStaffList);
}

let staffCache = [];

async function loadStaff() {
  try {
    staffCache = await fetchStaffList();
    renderAdminStaff(staffCache);
  } catch {
    adminStaffList.innerHTML = '<div class="empty-state">خطا در دریافت فهرست کارمندان.</div>';
  }
}

function resetStaffForm() {
  staffForm.reset();
  staffEditingId.value = "";
  saveStaffBtn.textContent = "افزودن کارمند";
  cancelStaffEditBtn.hidden = true;
  staffErrorMessage.hidden = true;
}

staffForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  staffErrorMessage.hidden = true;

  const photoFile = staffPhotoInput.files[0];
  if (photoFile && photoFile.size > MAX_UPLOAD_BYTES) {
    staffErrorMessage.textContent = "حجم عکس بیشتر از ۵ مگابایت است.";
    staffErrorMessage.hidden = false;
    return;
  }

  const formData = new FormData();
  formData.set("name", staffName.value.trim());
  formData.set("role", staffRole.value.trim());
  if (staffEditingId.value) formData.set("id", staffEditingId.value);
  if (photoFile) formData.set("photo", photoFile);

  saveStaffBtn.disabled = true;
  try {
    const res = await fetch("/api/staff", { method: "POST", body: formData });
    const data = await res.json();

    if (res.ok && data.ok) {
      staffCache = data.items;
      renderAdminStaff(staffCache);
      resetStaffForm();
      staffSaveMessage.hidden = false;
      setTimeout(() => staffSaveMessage.hidden = true, 2200);
    } else {
      staffErrorMessage.textContent = data.error || "خطا در ذخیره‌سازی.";
      staffErrorMessage.hidden = false;
    }
  } catch {
    staffErrorMessage.textContent = "خطا در ارتباط با سرور. دوباره تلاش کنید.";
    staffErrorMessage.hidden = false;
  } finally {
    saveStaffBtn.disabled = false;
  }
});

cancelStaffEditBtn.addEventListener("click", resetStaffForm);

adminStaffList.addEventListener("click", (event) => {
  const editId = event.target.getAttribute("data-staff-edit");
  const deleteId = event.target.getAttribute("data-staff-delete");

  if (editId) {
    const item = staffCache.find(x => x.id === editId);
    if (!item) return;
    staffEditingId.value = item.id;
    staffName.value = item.name;
    staffRole.value = item.role;
    staffPhotoInput.value = "";
    saveStaffBtn.textContent = "ذخیره تغییرات";
    cancelStaffEditBtn.hidden = false;
    staffName.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (deleteId) {
    const item = staffCache.find(x => x.id === deleteId);
    if (!item) return;

    if (confirm(`اطلاعات «${item.name}» حذف شود؟`)) {
      fetch("/api/staff-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId })
      })
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            staffCache = data.items;
            renderAdminStaff(staffCache);
          }
        })
        .catch(() => {});
    }
  }
});

/* -------------------------------- گالری (جدید) -------------------------------- */

function renderAdminGallery(items) {
  galleryCount.textContent = `${items.length.toLocaleString("fa-IR")} تصویر`;

  if (!items.length) {
    adminGalleryList.innerHTML = '<div class="empty-state">تصویری در گالری نیست.</div>';
    return;
  }

  adminGalleryList.innerHTML = items.map(item => `
    <div class="admin-gallery-item reveal">
      <img src="${escapeHtml(item.photoUrl)}" alt="${escapeHtml(item.caption || "")}">
      <button class="small-btn danger" type="button" data-gallery-delete="${escapeHtml(item.id)}">حذف</button>
    </div>
  `).join("");
  initScrollReveal(adminGalleryList);
}

let galleryCache = [];

async function loadGallery() {
  try {
    const res = await fetch("/api/gallery");
    const data = await res.json();
    galleryCache = Array.isArray(data.items) ? data.items : [];
    renderAdminGallery(galleryCache);
  } catch {
    adminGalleryList.innerHTML = '<div class="empty-state">خطا در دریافت گالری.</div>';
  }
}

galleryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  galleryErrorMessage.hidden = true;

  const photoFile = galleryPhotoInput.files[0];
  if (!photoFile) {
    galleryErrorMessage.textContent = "انتخاب یک تصویر الزامی است.";
    galleryErrorMessage.hidden = false;
    return;
  }
  if (photoFile.size > MAX_UPLOAD_BYTES) {
    galleryErrorMessage.textContent = "حجم عکس بیشتر از ۵ مگابایت است.";
    galleryErrorMessage.hidden = false;
    return;
  }

  const formData = new FormData();
  formData.set("photo", photoFile);
  formData.set("caption", galleryCaptionInput.value.trim());

  saveGalleryBtn.disabled = true;
  try {
    const res = await fetch("/api/gallery", { method: "POST", body: formData });
    const data = await res.json();

    if (res.ok && data.ok) {
      galleryCache = data.items;
      renderAdminGallery(galleryCache);
      galleryForm.reset();
      gallerySaveMessage.hidden = false;
      setTimeout(() => gallerySaveMessage.hidden = true, 2200);
    } else {
      galleryErrorMessage.textContent = data.error || "خطا در ذخیره‌سازی.";
      galleryErrorMessage.hidden = false;
    }
  } catch {
    galleryErrorMessage.textContent = "خطا در ارتباط با سرور. دوباره تلاش کنید.";
    galleryErrorMessage.hidden = false;
  } finally {
    saveGalleryBtn.disabled = false;
  }
});

adminGalleryList.addEventListener("click", (event) => {
  const deleteId = event.target.getAttribute("data-gallery-delete");
  if (!deleteId) return;

  if (confirm("این تصویر از گالری حذف شود؟")) {
    fetch("/api/gallery-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          galleryCache = data.items;
          renderAdminGallery(galleryCache);
        }
      })
      .catch(() => {});
  }
});

/* ---------------------------- پیوندهای مفید (جدید) ---------------------------- */

function renderAdminLinks(items) {
  linkCount.textContent = `${items.length.toLocaleString("fa-IR")} مورد`;

  if (!items.length) {
    adminLinkList.innerHTML = '<div class="empty-state">پیوندی ثبت نشده است.</div>';
    return;
  }

  adminLinkList.innerHTML = items.map(item => `
    <article class="admin-news-item reveal">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.url)}</p>
      </div>
      <div class="admin-actions">
        <button class="small-btn" type="button" data-link-edit="${escapeHtml(item.id)}">ویرایش</button>
        <button class="small-btn danger" type="button" data-link-delete="${escapeHtml(item.id)}">حذف</button>
      </div>
    </article>
  `).join("");
  initScrollReveal(adminLinkList);
}

let linksCache = [];

async function loadLinks() {
  try {
    const res = await fetch("/api/links");
    const data = await res.json();
    linksCache = Array.isArray(data.items) ? data.items : [];
    renderAdminLinks(linksCache);
  } catch {
    adminLinkList.innerHTML = '<div class="empty-state">خطا در دریافت پیوندها.</div>';
  }
}

function resetLinkForm() {
  linkForm.reset();
  linkEditingId.value = "";
  saveLinkBtn.textContent = "افزودن پیوند";
  cancelLinkEditBtn.hidden = true;
  linkErrorMessage.hidden = true;
}

linkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  linkErrorMessage.hidden = true;

  const body = {
    title: linkTitleInput.value.trim(),
    url: linkUrlInput.value.trim()
  };
  if (linkEditingId.value) body.id = linkEditingId.value;

  saveLinkBtn.disabled = true;
  try {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (res.ok && data.ok) {
      linksCache = data.items;
      renderAdminLinks(linksCache);
      resetLinkForm();
      linkSaveMessage.hidden = false;
      setTimeout(() => linkSaveMessage.hidden = true, 2200);
    } else {
      linkErrorMessage.textContent = data.error || "خطا در ذخیره‌سازی.";
      linkErrorMessage.hidden = false;
    }
  } catch {
    linkErrorMessage.textContent = "خطا در ارتباط با سرور. دوباره تلاش کنید.";
    linkErrorMessage.hidden = false;
  } finally {
    saveLinkBtn.disabled = false;
  }
});

cancelLinkEditBtn.addEventListener("click", resetLinkForm);

adminLinkList.addEventListener("click", (event) => {
  const editId = event.target.getAttribute("data-link-edit");
  const deleteId = event.target.getAttribute("data-link-delete");

  if (editId) {
    const item = linksCache.find(x => x.id === editId);
    if (!item) return;
    linkEditingId.value = item.id;
    linkTitleInput.value = item.title;
    linkUrlInput.value = item.url;
    saveLinkBtn.textContent = "ذخیره تغییرات";
    cancelLinkEditBtn.hidden = false;
    linkTitleInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (deleteId) {
    const item = linksCache.find(x => x.id === deleteId);
    if (!item) return;

    if (confirm(`پیوند «${item.title}» حذف شود؟`)) {
      fetch("/api/links-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId })
      })
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            linksCache = data.items;
            renderAdminLinks(linksCache);
          }
        })
        .catch(() => {});
    }
  }
});

/* ---------------------------- تصاویر سایت (جدید) ---------------------------- */

siteImagesForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  siteImagesError.hidden = true;

  const logoFile = siteLogoInput.files[0];
  const campusFile = siteCampusInput.files[0];

  if (!logoFile && !campusFile) {
    siteImagesError.textContent = "هیچ فایلی انتخاب نشده است.";
    siteImagesError.hidden = false;
    return;
  }
  if ((logoFile && logoFile.size > MAX_UPLOAD_BYTES) || (campusFile && campusFile.size > MAX_UPLOAD_BYTES)) {
    siteImagesError.textContent = "حجم فایل بیشتر از ۵ مگابایت است.";
    siteImagesError.hidden = false;
    return;
  }

  const formData = new FormData();
  if (logoFile) formData.set("logo", logoFile);
  if (campusFile) formData.set("campus", campusFile);

  const submitBtn = document.getElementById("save-site-images-btn");
  submitBtn.disabled = true;
  try {
    const res = await fetch("/api/site-images", { method: "POST", body: formData });
    const data = await res.json();

    if (res.ok && data.ok) {
      siteImagesForm.reset();
      siteImagesMessage.hidden = false;
      setTimeout(() => siteImagesMessage.hidden = true, 2200);
      // به‌روزرسانی لحظه‌ای پیش‌نمایش لوگو در همین صفحه (عبور از کش مرورگر)
      if (logoFile && adminLogoImg) {
        adminLogoImg.src = "https://dl.modares12.com/site/logo?t=" + Date.now();
      }
    } else {
      siteImagesError.textContent = data.error || "خطا در بارگذاری تصاویر.";
      siteImagesError.hidden = false;
    }
  } catch {
    siteImagesError.textContent = "خطا در ارتباط با سرور. دوباره تلاش کنید.";
    siteImagesError.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});

/* --------------------------------- ورود/خروج --------------------------------- */

document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch {
    // اگر شبکه در دسترس نبود هم همچنان کاربر را از حالت نمایش خارج می‌کنیم
  }
  resetForm();
  resetStaffForm();
  resetLinkForm();
  showLogin();
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/session");
    const data = await res.json();
    if (data.loggedIn) {
      showAdmin();
      return;
    }
  } catch {
    // خطای شبکه: فرم ورود نمایش داده می‌شود
  }
  showLogin();
});
