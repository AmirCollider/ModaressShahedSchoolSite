async function renderAllStaff() {
  const target = document.getElementById("all-staff");
  if (!target) return;

  try {
    const items = await fetchStaffList();
    if (!items.length) {
      target.innerHTML = '<div class="empty-state">هنوز کارمندی ثبت نشده است.</div>';
      return;
    }
    target.innerHTML = items.map(renderStaffCard).join("");
    initScrollReveal(target);
  } catch {
    target.innerHTML = '<div class="empty-state">خطا در دریافت اطلاعات کارمندان. صفحه را دوباره بارگذاری کنید.</div>';
  }
}

document.addEventListener("DOMContentLoaded", renderAllStaff);
