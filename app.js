const SUPABASE_URL = "https://usgecirqtmoldcvvwcxk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable__qbpft3pHINGK3sweQHL7w_DLc5zZMt";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (id) => document.getElementById(id);

let session = null;
let currentWeekStart = getMonday(new Date());
let weekRowsData = [];
let myRegistrations = [];

const MEALS = ["Trưa", "Tối"];
const STATUSES = ["Đúng giờ", "Ăn trễ", "Không ăn"];

// ===============================
// DATE / TIME
// ===============================

function vnNow() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh"
    })
  );
}

function localDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function displayDate(date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function shortDate(date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit"
  });
}

function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);

  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dayName(date) {
  const names = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7"
  ];

  return names[date.getDay()];
}

function todayString() {
  return localDateString(vnNow());
}

function weekEnd() {
  return addDays(currentWeekStart, 6);
}
// ===============================
// TIME RULES
// ===============================

function getVietnamMinutes() {
  const now = vnNow();
  return now.getHours() * 60 + now.getMinutes();
}

function canRegister(date, meal, existing) {
  const today = todayString();

  // Ngày đã qua: không được thay đổi
  if (date < today) {
    return {
      allowed: false,
      message: "Ngày này đã qua."
    };
  }

  // Ngày tương lai: được đăng ký
  if (date > today) {
    return {
      allowed: true
    };
  }

  const minutes = getVietnamMinutes();

  // Hạn đăng ký mới trong ngày: 08:00
  if (!existing) {
    if (minutes >= 8 * 60) {
      return {
        allowed: false,
        message: "Đã quá 08:00. Không thể đăng ký mới cho hôm nay."
      };
    }

    return {
      allowed: true
    };
  }

  // Sau khi đã đăng ký:
  // chỉ cho đổi Đúng giờ <-> Ăn trễ trước giờ quy định
  const deadline =
    meal === "Trưa"
      ? 10 * 60 + 30
      : 17 * 60 + 30;

  if (minutes >= deadline) {
    return {
      allowed: false,
      message:
        meal === "Trưa"
          ? "Đã quá 10:30. Không thể thay đổi suất trưa."
          : "Đã quá 17:30. Không thể thay đổi suất tối."
    };
  }

  return {
    allowed: true
  };
}

// ===============================
// CLOCK
// ===============================

function updateClock() {
  const now = vnNow();

  $("clockBox").innerHTML = `
    ${now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })}
    <small>
      ${now.toLocaleDateString("vi-VN")} · Giờ Việt Nam
    </small>
  `;
}

// ===============================
// LOGIN
// ===============================

async function login() {
  $("loginError").textContent = "";

  const { error } =
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          location.origin + location.pathname
      }
    });

  if (error) {
    $("loginError").textContent = error.message;
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

// ===============================
// SHOW APP
// ===============================

async function showApp() {
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("userBox").classList.remove("hidden");

  $("userEmail").textContent =
    session?.user?.email || "Đã đăng nhập";

  updateClock();

  setInterval(updateClock, 1000);

  await loadWeek();
}

// ===============================
// WEEK HEADER
// ===============================

function updateWeekLabels() {
  const end = weekEnd();

  const text =
    `${shortDate(currentWeekStart)} - ${shortDate(end)}`;

  $("weekLabel").textContent = text;
  $("summaryWeek").textContent = text;
  $("listWeekLabel").textContent = text;
}

// ===============================
// BUILD WEEK UI
// ===============================

function renderWeekRows() {
  const container = $("weekRows");

  container.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const date = addDays(currentWeekStart, i);
    const dateStr = localDateString(date);

    const row = document.createElement("div");

    row.className = "week-row";

    if (dateStr === todayString()) {
      row.classList.add("today-row");
    }

    row.innerHTML = `
      <div class="week-date-cell">
        <strong>${dayName(date)}</strong>
        <span>${displayDate(date)}</span>
      </div>

      ${mealCell(dateStr, "Trưa")}

      ${mealCell(dateStr, "Tối")}
    `;

    container.appendChild(row);
  }

  applyExistingSelections();
}

function mealCell(date, meal) {
  const key =
    `${date}-${meal === "Trưa" ? "lunch" : "dinner"}`;

  return `
    <div
      class="meal-cell"
      data-date="${date}"
      data-meal="${meal}"
    >

      <label class="tick-option">
        <input
          type="radio"
          name="${key}"
          value="Đúng giờ"
        >
        <span>✓ Đúng giờ</span>
      </label>

      <label class="tick-option">
        <input
          type="radio"
          name="${key}"
          value="Ăn trễ"
        >
        <span>⏰ Ăn trễ</span>
      </label>

      <label class="tick-option">
        <input
          type="radio"
          name="${key}"
          value="Không ăn"
        >
        <span>✕ Không ăn</span>
      </label>

    </div>
  `;
}

// ===============================
// LOAD WEEK
// ===============================

async function loadWeek() {
  updateWeekLabels();

  $("notice").textContent =
    "Đang tải dữ liệu tuần...";

  const start = localDateString(currentWeekStart);
  const end = localDateString(weekEnd());

  const { data, error } = await supabaseClient
    .from("meal_registrations")
    .select("*")
    .gte("meal_date", start)
    .lte("meal_date", end)
    .order("meal_date", {
      ascending: true
    })
    .order("meal", {
      ascending: true
    });

  if (error) {
    $("notice").textContent =
      "Lỗi tải dữ liệu: " + error.message;

    return;
  }

  weekRowsData = data || [];

  myRegistrations =
    weekRowsData.filter(
      (row) =>
        row.user_id === session.user.id
    );

  renderWeekRows();
  renderSummary();
  renderRegistrationList();

  $("notice").textContent =
    "Chọn trạng thái cho từng buổi rồi bấm Lưu đăng ký tuần.";
}

// ===============================
// RESTORE MY EXISTING CHOICES
// ===============================

function applyExistingSelections() {
  myRegistrations.forEach((row) => {
    const cell = document.querySelector(
      `.meal-cell[data-date="${row.meal_date}"][data-meal="${row.meal}"]`
    );

    if (!cell) return;

    const inputs =
      cell.querySelectorAll(
        'input[type="radio"]'
      );

    inputs.forEach((input) => {
      if (input.value === row.status) {
        input.checked = true;
      }
    });
  });
}

// ===============================
// SAVE WEEK
// ===============================

async function saveWeek() {
  $("formMessage").textContent =
    "Đang lưu...";

  const cells =
    document.querySelectorAll(
      ".meal-cell"
    );

  let saved = 0;
  let skipped = 0;
  let errors = [];

  for (const cell of cells) {
    const checked =
      cell.querySelector(
        'input[type="radio"]:checked'
      );

    if (!checked) {
      continue;
    }

    const date =
      cell.dataset.date;

    const meal =
      cell.dataset.meal;

    const status =
      checked.value;

    if (date < todayString()) {
      skipped++;
      continue;
    }

    const existing =
      myRegistrations.find(
        (r) =>
          r.meal_date === date &&
          r.meal === meal
      );
  

    if (existing && existing.status === status) {
  continue;
}

const permission = canRegister(date, meal, existing);

if (!permission.allowed) {
  errors.push(
    `${displayDate(
      new Date(date + "T00:00:00")
    )} ${meal}: ${permission.message}`
  );
  continue;
}

if (existing) {
  const { error } =
    await supabaseClient
      .from("meal_registrations")
      .update({
        status: status
      })
      .eq("id", existing.id);

  if (error) {
    errors.push(
      `${displayDate(
        new Date(date + "T00:00:00")
      )} ${meal}: ${error.message}`
    );
  } else {
    saved++;
  }

  continue;
}

    const name =
      session.user.user_metadata
        ?.full_name ||
      session.user.user_metadata
        ?.name ||
      session.user.email
        ?.split("@")[0] ||
      "Người dùng";

    const { error } =
      await supabaseClient
        .from("meal_registrations")
        .insert({
          user_id:
            session.user.id,

          email:
            session.user.email,

          name:
            name,

          meal_date:
            date,

          meal:
            meal,

          status:
            status
        });

    if (error) {
      errors.push(
        `${displayDate(
          new Date(date + "T00:00:00")
        )} ${meal}: ${error.message}`
      );
    } else {
      saved++;
    }
  }

  if (errors.length) {
    $("formMessage").textContent =
      `Đã lưu ${saved} mục. Có lỗi: ${errors[0]}`;
  } else if (saved === 0) {
    $("formMessage").textContent =
      "Không có thay đổi mới để lưu.";
  } else {
    $("formMessage").textContent =
      `✓ Đã lưu ${saved} lựa chọn.`;
  }

  await loadWeek();
}

// ===============================
// SUMMARY
// ===============================

function renderSummary() {
  $("totalCount").textContent =
    weekRowsData.length;

  $("onTimeCount").textContent =
    weekRowsData.filter(
      (x) =>
        x.status === "Đúng giờ"
    ).length;

  $("lateCount").textContent =
    weekRowsData.filter(
      (x) =>
        x.status === "Ăn trễ"
    ).length;

  $("noEatCount").textContent =
    weekRowsData.filter(
      (x) =>
        x.status === "Không ăn"
    ).length;

  $("lunchCount").textContent =
    weekRowsData.filter(
      (x) =>
        x.meal === "Trưa"
    ).length;

  $("dinnerCount").textContent =
    weekRowsData.filter(
      (x) =>
        x.meal === "Tối"
    ).length;
}

// ===============================
// REGISTRATION LIST
// ===============================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRegistrationList() {
  const body =
    $("registrationTable");

  if (!weekRowsData.length) {
    body.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="empty"
        >
          Chưa có dữ liệu
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    weekRowsData
      .map((row) => {
        return `
          <tr>
            <td>
              ${escapeHtml(row.name)}
            </td>

            <td>
              ${escapeHtml(row.email)}
            </td>

            <td>
              ${escapeHtml(row.meal_date)}
            </td>

            <td>
              ${row.meal === "Trưa"
                ? "🌞 Trưa"
                : "🌙 Tối"}
            </td>

            <td>
              <span class="badge">
                ${escapeHtml(row.status)}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");
}

// ===============================
// WEEK NAVIGATION
// ===============================

async function previousWeek() {
  currentWeekStart =
    addDays(currentWeekStart, -7);

  await loadWeek();
}

async function nextWeek() {
  currentWeekStart =
    addDays(currentWeekStart, 7);

  await loadWeek();
}

// ===============================
// EVENTS
// ===============================

$("googleLoginBtn")
  .addEventListener(
    "click",
    login
  );

$("logoutBtn")
  .addEventListener(
    "click",
    logout
  );

$("prevWeekBtn")
  .addEventListener(
    "click",
    previousWeek
  );

$("nextWeekBtn")
  .addEventListener(
    "click",
    nextWeek
  );

$("saveWeekBtn")
  .addEventListener(
    "click",
    saveWeek
  );

$("refreshBtn")
  .addEventListener(
    "click",
    loadWeek
  );

// ===============================
// AUTH START
// ===============================

supabaseClient.auth
  .getSession()
  .then(({ data }) => {
    session = data.session;

    if (session) {
      showApp();
    }
  });

supabaseClient.auth
  .onAuthStateChange(
    (_event, newSession) => {
      session = newSession;

      if (session) {
        showApp();
      }
    }
  );
