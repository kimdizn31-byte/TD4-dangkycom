const SUPABASE_URL = "https://usgecirqtmoldcvwwcxk.supabase.co";
// Dán Publishable key (sb_publishable_...) hoặc Anon key (eyJhbGci...) vào ô dưới:
const SUPABASE_ANON_KEY = "sb_publishable__qbft3pHINGK3sweQHL7W_DLC5z"; 

const sb = (typeof supabase !== "undefined") ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

document.addEventListener("DOMContentLoaded", () => {
  initGoogleAuth();
  generateWeekDays();
  listenAuthChanges();
  setupFormSubmit();
  
  document.getElementById("btn-refresh")?.addEventListener("click", fetchRegistrations);
});

// 1. Tạo giao diện nút Đăng nhập / Profile
function initGoogleAuth() {
  const mealForm = document.getElementById("mealForm");
  if (!mealForm) return;

  if (!document.getElementById("auth-container")) {
    const authHTML = `
      <div id="auth-container" style="margin-bottom: 15px;">
        <button id="btn-google-login" type="button" style="background-color: #ffffff; color: #000000; border: none; padding: 12px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: bold; font-size: 14px;">
          🔑 Đăng nhập bằng Gmail
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
    if (!sb) return alert("Không thể kết nối Supabase!");
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) alert("Lỗi đăng nhập: " + error.message);
  });

  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    if (sb) {
      await sb.auth.signOut();
      window.location.reload();
    }
  });
}

// 2. Render danh sách các ngày từ Thứ 2 -> Chủ Nhật của tuần hiện tại
function generateWeekDays() {
  const container = document.getElementById("weekDaysContainer");
  if (!container) return;

  const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
  const now = new Date();
  const currentDay = now.getDay();
  const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));

  let html = "";
  days.forEach((dayName, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const isoDate = d.toISOString().split('T')[0];

    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #222;">
        <div style="width: 30%;">
          <strong>${dayName}</strong><br><small style="color: #777;">${dateStr}</small>
        </div>
        <div style="width: 33%;">
          <select data-date="${isoDate}" data-meal="lunch" style="width: 95%; background: #111; color: #fff; border: 1px solid #333; padding: 6px; border-radius: 4px;">
            <option value="Không ăn">❌ Không ăn</option>
            <option value="Đúng giờ">⏰ Đúng giờ</option>
            <option value="Ăn muộn">⏳ Ăn muộn</option>
          </select>
        </div>
        <div style="width: 33%;">
          <select data-date="${isoDate}" data-meal="dinner" style="width: 95%; background: #111; color: #fff; border: 1px solid #333; padding: 6px; border-radius: 4px;">
            <option value="Không ăn">❌ Không ăn</option>
            <option value="Đúng giờ">⏰ Đúng giờ</option>
            <option value="Ăn muộn">⏳ Ăn muộn</option>
          </select>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// 3. Lắng nghe trạng thái Auth & Tải dữ liệu
function listenAuthChanges() {
  if (!sb) return;

  sb.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      updateUIForLoggedInUser(session.user);
    } else {
      updateUIForLoggedOutUser();
    }
    fetchRegistrations();
  });

  sb.auth.getSession().then(({ data: { session } }) => {
    if (session && session.user) {
      updateUIForLoggedInUser(session.user);
    } else {
      updateUIForLoggedOutUser();
    }
    fetchRegistrations();
  });
}

function updateUIForLoggedInUser(user) {
  const loginBtn = document.getElementById("btn-google-login");
  const userProfile = document.getElementById("user-profile");
  const displayName = document.getElementById("user-display-name");
  const displayEmail = document.getElementById("user-display-email");

  if (loginBtn) loginBtn.style.display = "none";
  if (userProfile) userProfile.style.display = "flex";

  if (displayName) displayName.textContent = user.user_metadata?.full_name || user.email;
  if (displayEmail) displayEmail.textContent = user.email || "";
}

function updateUIForLoggedOutUser() {
  const loginBtn = document.getElementById("btn-google-login");
  const userProfile = document.getElementById("user-profile");

  if (loginBtn) loginBtn.style.display = "block";
  if (userProfile) userProfile.style.display = "none";
}

// 4. Xử lý lưu đăng ký vào Database
function setupFormSubmit() {
  const form = document.getElementById("mealForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!sb) return alert("Chưa kết nối CSDL!");
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      return alert("Bạn cần Đăng nhập bằng Gmail trước khi đăng ký!");
    }

    const selects = form.querySelectorAll("select[data-date]");
    const payload = [];

    selects.forEach(select => {
      const status = select.value;
      if (status !== "Không ăn") {
        payload.push({
          user_id: session.user.id,
          user_name: session.user.user_metadata?.full_name || session.user.email,
          date: select.dataset.date,
          meal_type: select.dataset.meal === "lunch" ? "suất trưa" : "suất tối",
          status: status
        });
      }
    });

    if (payload.length === 0) {
      return alert("Bạn chưa chọn suất ăn nào!");
    }

    const { error } = await sb.from("meal_registrations").upsert(payload, { onConflict: "user_id,date,meal_type" });

    if (error) {
      alert("Lỗi khi lưu: " + error.message);
    } else {
      alert("🎉 Đã lưu đăng ký thành công!");
      fetchRegistrations();
    }
  });
}

// 5. Tải danh sách đăng ký từ Database
async function fetchRegistrations() {
  const listDiv = document.getElementById("registrations-list");
  if (!listDiv) return;

  if (!sb) {
    listDiv.innerHTML = "Chưa kết nối Supabase.";
    return;
  }

  const { data, error } = await sb.from("meal_registrations").select("*").order("date", { ascending: true });

  if (error) {
    listDiv.innerHTML = "Không thể tải danh sách (hoặc chưa đăng nhập).";
    return;
  }

  if (!data || data.length === 0) {
    listDiv.innerHTML = "Chưa có ai đăng ký tuần này.";
    document.getElementById("stat-total").textContent = "0";
    document.getElementById("stat-lunch").textContent = "0";
    document.getElementById("stat-dinner").textContent = "0";
    return;
  }

  let totalLunch = 0;
  let totalDinner = 0;

  let tableHTML = `<table style="width:100%; text-align:left; border-collapse:collapse;">
    <tr style="border-bottom:1px solid #333; color:#888;">
      <th style="padding:4px;">Tên</th>
      <th style="padding:4px;">Ngày</th>
      <th style="padding:4px;">Buổi</th>
      <th style="padding:4px;">Trạng thái</th>
    </tr>`;

  data.forEach(item => {
    if (item.meal_type === "suất trưa") totalLunch++;
    if (item.meal_type === "suất tối") totalDinner++;

    tableHTML += `<tr style="border-bottom:1px solid #222;">
      <td style="padding:6px 4px;">${item.user_name || 'N/A'}</td>
      <td style="padding:6px 4px;">${item.date}</td>
      <td style="padding:6px 4px;">${item.meal_type}</td>
      <td style="padding:6px 4px;">${item.status}</td>
    </tr>`;
  });

  tableHTML += `</table>`;
  listDiv.innerHTML = tableHTML;

  document.getElementById("stat-total").textContent = data.length;
  document.getElementById("stat-lunch").textContent = totalLunch;
  document.getElementById("stat-dinner").textContent = totalDinner;
}
