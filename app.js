const SUPABASE_URL = "https://usgecirqtmoldcvwwcxk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZ2VjaXJxdG1vbGRjdnd3Y3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMjQ5NTUsImV4cCI6MjA1Njk0MDk1NX0.6EaR6Q7Jd8k_H0G5h0R0O6W0N5k_G0H5h0R0O6W0N5k";

const sb = (typeof supabase !== "undefined") ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- 1. ĐĂNG NHẬP GOOGLE & TÀI KHOẢN CỐ ĐỊNH ---
function initGoogleAuth() {
  const mealForm = document.getElementById("mealForm");
  if (!mealForm) return;

  if (!document.getElementById("auth-container")) {
    const authHTML = `
      <div id="auth-container" style="margin-bottom: 15px;">
        <button id="btn-google-login" type="button" style="background-color: #ffffff; color: #000000; border: none; padding: 12px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: bold; font-size: 14px;">
          Đăng nhập bằng Gmail
        </button>
        <div id="user-profile" style="display: none; background: #161616; border: 1px solid #222; padding: 10px 14px; border-radius: 8px; justify-content: space-between; align-items: center;">
          <div>
            <div id="user-display-name" style="font-weight: bold; color: #ffffff; font-size: 13px;"></div>
            <div id="user-display-email" style="font-size: 11px; color: #888888;"></div>
          </div>
          <button id="btn-logout" type="button" style="background: transparent; border: 1px solid #333; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; color: #ccc;">
            Đăng xuất
          </button>
        </div>
      </div>
    `;
    mealForm.insertAdjacentHTML("afterbegin", authHTML);
  }

  const googleBtn = document.getElementById("btn-google-login");
  if (googleBtn && !googleBtn.dataset.bound) {
    googleBtn.dataset.bound = "true";
    googleBtn.addEventListener("click", async () => {
      if (!sb) return alert("Chưa kết nối Supabase!");
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'https://td-4-dangkycom.vercel.app' }
      });
      if (error) alert("Lỗi đăng nhập: " + error.message);
    });
  }

  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "true";
    logoutBtn.addEventListener("click", async () => {
      if (sb) {
        await sb.auth.signOut();
        window.location.reload();
      }
    });
  }

  checkUserSession();
}

async function checkUserSession() {
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  const nameInput = document.getElementById("name");
  const loginBtn = document.getElementById("btn-google-login");
  const profileDiv = document.getElementById("user-profile");

  if (session && session.user) {
    const userName = session.user.user_metadata?.full_name || session.user.email;
    const userEmail = session.user.email;

    if (loginBtn) loginBtn.style.display = "none";
    if (profileDiv) profileDiv.style.display = "flex";

    document.getElementById("user-display-name").textContent = userName;
    document.getElementById("user-display-email").textContent = userEmail;
    if (nameInput) nameInput.value = userName;
  } else {
    if (loginBtn) loginBtn.style.display = "block";
    if (profileDiv) profileDiv.style.display = "none";
    if (nameInput) nameInput.value = "";
  }
}

// --- 2. TẠO LỊCH CÁC THỨ TRONG TUẦN & HẠN ĐĂNG KÝ ---
function setupWeekDays() {
  const container = document.getElementById("weekSelector");
  if (!container) return;

  container.innerHTML = "";
  const now = new Date();
  
  const currentDay = now.getDay();
  const diffToMonday = (currentDay === 0 ? -6 : 1 - currentDay);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const daysLabel = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `day-btn ${i === 0 ? 'active' : ''}`;
    btn.dataset.date = dateStr;
    btn.innerHTML = `<span class="day-name">${daysLabel[i]}</span><span class="day-date">${day}/${month}</span>`;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("selectedDate").value = dateStr;
    });

    container.appendChild(btn);
  }

  document.getElementById("selectedDate").value = container.children[0].dataset.date;
}

// Kiểm tra hạn 10:30 & 17:30
function isDeadlinePassed(selectedDateStr, mealType) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (selectedDateStr < todayStr) return true;

  if (selectedDateStr === todayStr) {
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    if (mealType === "Trưa" && totalMinutes >= (10 * 60 + 30)) return true;
    if (mealType === "Tối" && totalMinutes >= (17 * 60 + 30)) return true;
  }
  return false;
}

// Setup nút Toggle
function setupToggleButtons(groupId, hiddenInputId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  const btns = group.querySelectorAll(".btn-toggle");
  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(hiddenInputId).value = btn.dataset.value;
    });
  });
}

// --- 3. TẢI & THÊM DỮ LIỆU ---
async function loadMeals() {
  if (!sb) return;
  const tbody = document.getElementById("mealTableBody");
  const { data, error } = await sb.from("meal_registrations").select("*").order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">Lỗi tải dữ liệu</td></tr>`;
    return;
  }

  let total = 0, lunch = 0, dinner = 0;
  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">Chưa có đăng ký nào.</td></tr>`;
  } else {
    data.forEach(item => {
      total++;
      if (item.meal_type === "Trưa") lunch++;
      if (item.meal_type === "Tối") dinner++;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${item.name || "Ẩn danh"}</b></td>
        <td>${item.meal_date || ""}</td>
        <td>${item.meal_type || ""}</td>
        <td>${item.meal_time || ""}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statLunch").textContent = lunch;
  document.getElementById("statDinner").textContent = dinner;
}

// KHI TRANG TẢI XONG
document.addEventListener("DOMContentLoaded", () => {
  initGoogleAuth();
  setupWeekDays();
  setupToggleButtons("mealTypeGroup", "mealType");
  setupToggleButtons("mealTimeGroup", "mealTime");
  loadMeals();

  document.getElementById("btnRefresh")?.addEventListener("click", loadMeals);

  // Xử lý nộp Form
  document.getElementById("mealForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const selectedDate = document.getElementById("selectedDate").value;
    const mealType = document.getElementById("mealType").value;
    const mealTime = document.getElementById("mealTime").value;

    if (!name) return alert("Vui lòng đăng nhập Gmail trước khi đăng ký!");

    if (isDeadlinePassed(selectedDate, mealType)) {
      return alert(`Đã quá hạn đăng ký cho suất ${mealType} ngày này! (Trưa trước 10h30, Tối trước 17h30)`);
    }

    const { error } = await sb.from("meal_registrations").insert([{
      name: name,
      meal_date: selectedDate,
      meal_type: mealType,
      meal_time: mealTime
    }]);

    if (error) {
      alert("Lỗi đăng ký: " + error.message);
    } else {
      alert("Đăng ký thành công!");
      loadMeals();
    }
  });
});
