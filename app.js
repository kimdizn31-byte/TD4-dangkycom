const SUPABASE_URL = "https://usgecirqtmoldcvwwcxk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZ2VjaXJxdG1vbGRjdnd3Y3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMjQ5NTUsImV4cCI6MjA1Njk0MDk1NX0.6EaR6Q7Jd8k_H0G5h0R0O6W0N5k_G0H5h0R0O6W0N5k";

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

// --- HÀM KIỂM TRA HẠN ĐĂNG KÝ/SỬA (10:30 TRƯA & 17:30 TỐI) ---
function isDeadlinePassed(selectedDateStr, mealType) {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // Ngày trong quá khứ -> Khóa hoàn toàn
  if (selectedDateStr < todayStr) return true;

  // Ngày hôm nay -> Kiểm tra giờ chót
  if (selectedDateStr === todayStr) {
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    if (mealType === "Trưa" && totalMinutes >= (10 * 60 + 30)) return true; // Quá 10:30
    if (mealType === "Tối" && totalMinutes >= (17 * 60 + 30)) return true;  // Quá 17:30
  }

  return false;
}

// --- 2. RENDER BẢNG LỊCH TUẦN ---
function renderWeekSchedule() {
  const tbody = document.getElementById("weekScheduleBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const now = new Date();
  
  const currentDay = now.getDay();
  const diffToMonday = (currentDay === 0 ? -6 : 1 - currentDay);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const daysLabel = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const lunchDisabled = isDeadlinePassed(dateStr, "Trưa");
    const dinnerDisabled = isDeadlinePassed(dateStr, "Tối");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="day-col">
        ${daysLabel[i]}
        <span class="d-date">${day}/${month}</span>
      </td>
      <td>
        <select class="meal-select" data-date="${dateStr}" data-type="Trưa" ${lunchDisabled ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
          <option value="Không ăn">${lunchDisabled ? '🔒 Đã khóa (Sau 10h30)' : '❌ Không ăn'}</option>
          <option value="Đúng giờ" ${!lunchDisabled ? 'selected' : ''}>⏰ Đúng giờ</option>
          <option value="Ăn trễ">⌛ Ăn trễ</option>
        </select>
      </td>
      <td>
        <select class="meal-select" data-date="${dateStr}" data-type="Tối" ${dinnerDisabled ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
          <option value="Không ăn" selected>${dinnerDisabled ? '🔒 Đã khóa (Sau 17h30)' : '❌ Không ăn'}</option>
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

  // Xử lý lưu Form
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

      // KIỂM TRA LẠI MỘT LẦN NỮA: Bỏ qua tuyệt đối các suất đã quá giờ
      if (isDeadlinePassed(date, type)) {
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
      return alert("Không có thay đổi hợp lệ nào được lưu (các suất bạn chọn đều đã quá giờ quy định)!");
    }

    const { error } = await sb.from("meal_registrations").insert(inserts);

    if (error) {
      alert("Lỗi lưu dữ liệu: " + error.message);
    } else {
      alert("Lưu thành công!");
      loadMeals();
    }
  });
});
    }
  });
});
