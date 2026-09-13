const SUPABASE_URL = "https://usgecirqtmoldcvvwcxk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__qbft3pHINGK3sweQHL7W_DLC5z..."; // Hoặc mã legacy anon bắt đầu bằng eyJ...
const sb = (typeof supabase !== "undefined") ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- 1. ĐĂNG NHẬP GOOGLE ---
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

  document.getElementById("btn-google-login")?.addEventListener("click", async () => {
    if (!sb) return alert("Chưa kết nối Supabase!");
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://td-4-dangkycom.vercel.app' }
    });
    if (error) alert("Lỗi đăng nhập: " + error.message);
  });

  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    if (sb) {
      await sb.auth.signOut();
      window.location.reload();
    }
  });

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
    if (loginBtn) loginBtn.style.display = "none";
    if (profileDiv) profileDiv.style.display = "flex";

    document.getElementById("user-display-name").textContent = userName;
    document.getElementById("user-display-email").textContent = session.user.email;
    if (nameInput) nameInput.value = userName;
  } else {
    if (loginBtn) loginBtn.style.display = "block";
    if (profileDiv) profileDiv.style.display = "none";
    if (nameInput) nameInput.value = "";
  }
}

// --- HÀM KIỂM TRA MÚI GIỜ VIỆT NAM (UTC+7) ---
function getVNTime() {
  const now = new Date();
  const vnTimeString = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  return new Date(vnTimeString);
}

// Phút hiện tại trong ngày (ví dụ 8:00 = 480 phút)
function getCurrentMinutes() {
  const vnDate = getVNTime();
  return vnDate.getHours() * 60 + vnDate.getMinutes();
}

function getTodayStr() {
  const vnDate = getVNTime();
  const year = vnDate.getFullYear();
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const day = String(vnDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 1. Kiểm tra hạn ĐĂNG KÝ MỚI (Phải trước 8h00 sáng ngày hôm đó)
function isRegistrationDeadlinePassed(selectedDateStr) {
  const todayStr = getTodayStr();
  if (selectedDateStr < todayStr) return true; // Ngày quá khứ
  if (selectedDateStr === todayStr) {
    return getCurrentMinutes() >= (8 * 60); // Sau 8h00
  }
  return false;
}

// 2. Kiểm tra hạn THAY ĐỔI TRẠNG THÁI (Trưa: 10h30, Tối: 17h30)
function isChangeDeadlinePassed(selectedDateStr, mealType) {
  const todayStr = getTodayStr();
  if (selectedDateStr < todayStr) return true; // Ngày quá khứ
  if (selectedDateStr === todayStr) {
    const minutes = getCurrentMinutes();
    if (mealType === "Trưa" && minutes >= (10 * 60 + 30)) return true; // Quá 10h30
    if (mealType === "Tối" && minutes >= (17 * 60 + 30)) return true;  // Quá 17h30
  }
  return false;
}

// --- 2. RENDER BẢNG 7 NGÀY TRONG TUẦN ---
function renderWeekSchedule() {
  const tbody = document.getElementById("weekScheduleBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const vnNow = getVNTime();
  
  const currentDay = vnNow.getDay();
  const diffToMonday = (currentDay === 0 ? -6 : 1 - currentDay);
  const monday = new Date(vnNow);
  monday.setDate(vnNow.getDate() + diffToMonday);

  const daysLabel = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const regPassed = isRegistrationDeadlinePassed(dateStr);
    const lunchChangePassed = isChangeDeadlinePassed(dateStr, "Trưa");
    const dinnerChangePassed = isChangeDeadlinePassed(dateStr, "Tối");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="day-col">
        ${daysLabel[i]}
        <span class="d-date">${day}/${month}</span>
      </td>
      <td>
        <select class="meal-select" data-date="${dateStr}" data-type="Trưa" ${lunchChangePassed ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
          <option value="Không ăn">❌ Không ăn</option>
          <option value="Đúng giờ" ${!regPassed ? 'selected' : ''}>⏰ Đúng giờ</option>
          <option value="Ăn trễ">⌛ Ăn trễ</option>
        </select>
      </td>
      <td>
        <select class="meal-select" data-date="${dateStr}" data-type="Tối" ${dinnerChangePassed ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
          <option value="Không ăn" selected>❌ Không ăn</option>
          <option value="Đúng giờ">⏰ Đúng giờ</option>
          <option value="Ăn trễ">⌛ Ăn trễ</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

// --- 3. TẢI VÀ LƯU DỮ LIỆU ---
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
      if (item.meal_time !== "Không ăn") {
        total++;
        if (item.meal_type === "Trưa") lunch++;
        if (item.meal_type === "Tối") dinner++;
      }

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
  renderWeekSchedule();
  loadMeals();

  document.getElementById("btnRefresh")?.addEventListener("click", loadMeals);

  // Xử lý nộp Form
  document.getElementById("mealForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;

    if (!name) return alert("Vui lòng đăng nhập Gmail trước khi đăng ký!");

    const selects = document.querySelectorAll(".meal-select");
    const inserts = [];

    for (const select of selects) {
      const date = select.dataset.date;
      const type = select.dataset.type;
      const time = select.value;

      // 1. Nếu đăng ký ăn mới (Đúng giờ / Ăn trễ) nhưng đã quá 8h00 sáng -> Chặn
      if (time !== "Không ăn" && isRegistrationDeadlinePassed(date)) {
        alert(`Đã quá 8h00 sáng! Không thể đăng ký thêm suất ăn ngày ${date}.`);
        return;
      }

      // 2. Nếu đã quá hạn thay đổi (Trưa sau 10h30, Tối sau 17h30) -> Bỏ qua không cho sửa
      if (isChangeDeadlinePassed(date, type)) {
        continue;
      }

      if (time !== "Không ăn") {
        inserts.push({
          name: name,
          meal_date: date,
          meal_type: type,
          meal_time: time
        });
      }
    }

    if (inserts.length === 0) {
      return alert("Không có thay đổi hợp lệ nào được lưu!");
    }

    const { error } = await sb.from("meal_registrations").insert(inserts);

    if (error) {
      alert("Lỗi lưu dữ liệu: " + error.message);
    } else {
      alert("Lưu thành công!");
      loadMeals();

      document.getElementById("btn-google-login")?.addEventListener("click", async () => {
  if (typeof supabase === 'undefined') {
    alert("Lỗi: Thư viện Supabase chưa được tải!");
    return;
  }
  
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    alert("Không thể đăng nhập: " + error.message);
  }
});
    }
  });
});
