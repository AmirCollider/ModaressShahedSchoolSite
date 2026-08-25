/*
  Offline demo password.
  Change this value before distributing the site.
  NOTE: Because this version runs entirely in the browser, this is NOT secure
  against someone who has access to the source files. When going online,
  authentication should move to a server/Cloudflare Worker.
*/
const ADMIN_PASSWORD = "1234";
const SESSION_KEY = "school_admin_session";

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

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

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
    <article class="admin-news-item">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="news-date">${escapeHtml(item.date)}</div>
        <p>${escapeHtml(item.body)}</p>
      </div>
      <div class="admin-actions">
        <button class="small-btn" type="button" data-edit="${escapeHtml(item.id)}">ویرایش</button>
        <button class="small-btn danger" type="button" data-delete="${escapeHtml(item.id)}">حذف</button>
      </div>
    </article>
  `).join("");
}

function resetForm() {
  newsForm.reset();
  editingId.value = "";
  saveNewsBtn.textContent = "ثبت اطلاعیه";
  cancelEditBtn.hidden = true;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = document.getElementById("password").value;

  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "1");
    loginError.hidden = true;
    showAdmin();
  } else {
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

document.getElementById("logout-btn").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  resetForm();
  showLogin();
});

document.addEventListener("DOMContentLoaded", () => {
  if (isLoggedIn()) showAdmin();
  else showLogin();
});
