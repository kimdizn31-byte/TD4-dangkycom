const SUPABASE_URL = "https://usgecirqtmoldcvwwcxk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__qbft3pHINGK3sweQHL7W_DLC5z"; // Thay bằng key bạn vừa lấy

const sb = (typeof supabase !== "undefined") ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

document.addEventListener("DOMContentLoaded", () => {
  initGoogleAuth();
  generateWeekDays();
  listenAuthChanges();
});

// 1. Tạo nút Đăng nhập / Profile
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
      options: { redirectTo: window.location.origin }
    });
    if (error) alert("Lỗi: " + error.message);
  });

  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    if (sb) {
      await sb.auth.signOut();
      window.location.reload();
    }
  });
}

// 2. Tạo danh sách các ngày trong tuần
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
          <select data-date="${isoDate}" data-meal="lunch" style="width: 90%; background: #111; color: #fff; border: 1px solid #333; padding: 6px; border-radius: 4px;">
            <option value="Đúng giờ">⏰ Đúng giờ</option>
            <option value="Ăn muộn">⏳ Ăn muộn</option>
            <option value="Không ăn">❌ Không ăn</option>
          </select>
        </div>
        <div style="width: 33%;">
          <select data-date="${isoDate}" data-meal="dinner" style="width: 90%; background: #111; color: #fff; border: 1px solid #333; padding: 6px; border-radius: 4px;">
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

// 3. Lắng nghe trạng thái Auth
function listenAuthChanges() {
  if (!sb) return;

  sb.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      updateUIForLoggedInUser(session.user);
    } else {
      updateUIForLoggedOutUser();
    }
  });

  sb.auth.getSession().then(({ data: { session } }) => {
    if (session && session.user) {
      updateUIForLoggedInUser(session.user);
    }
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
