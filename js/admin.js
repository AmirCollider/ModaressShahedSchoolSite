/*
  ورود پنل مدیریت اکنون سمت سرور بررسی می‌شود (worker.js + Secret واقعی در
  Cloudflare)، نه با یک رمز ثابت داخل این فایل. برای تنظیم/تغییر رمز:
    wrangler secret put ADMIN_PASSWORD
*/

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

function showAdmin() {
  loginPanel.hidden = true;
  adminPanel.hidden = false;
  renderAdminNews();
}

function showLogin() {
  loginPanel.hidden = false;
  adminPanel.hidden = true;
}

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

document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch {
    // اگر شبکه در دسترس نبود هم همچنان کاربر را از حالت نمایش خارج می‌کنیم
  }
  resetForm();
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
