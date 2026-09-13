const SUPABASE_URL = "https://usgecirqtmoldcvwwcxk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__qbpft3pHINGK3sweQHL7w_DLc5zZMt";

const sb = (typeof supabase !== "undefined") ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

document.addEventListener("DOMContentLoaded", () => {
  initGoogleAuth();
  listenAuthChanges();
});

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
    if (!sb) return alert("Chưa kết nối được với Supabase!");
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

// Bắt và lắng nghe Token đăng nhập từ Google trả về
function listenAuthChanges() {
  if (!sb) return;

  sb.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      updateUIForLoggedInUser(session.user);
    } else {
      updateUIForLoggedOutUser();
    }
  });

  // Kiểm tra nếu đã có Session từ trước
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

  if (displayName) displayName.textContent = user.user_metadata?.full_name || "Người dùng";
  if (displayEmail) displayEmail.textContent = user.email || "";
}

function updateUIForLoggedOutUser() {
  const loginBtn = document.getElementById("btn-google-login");
  const userProfile = document.getElementById("user-profile");

  if (loginBtn) loginBtn.style.display = "block";
  if (userProfile) userProfile.style.display = "none";
}
});
    }
  });
});
