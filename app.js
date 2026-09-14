const SUPABASE_URL = "https://usgecirqtmoldcvvwcxk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable__qbpft3pHINGK3sweQHL7w_DLc5zZMt";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (id) => document.getElementById(id);

let session = null;
let currentWeekStart = getMonday(new Date());
let menuWeekStart = new Date(currentWeekStart);
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
    `${date}-${meal === "Trưa" ? "morning" : "afternoon"}`;

  return `
    <div
      class="meal-cell"
      data-date="${date}"
      data-meal="${meal}"
    >
      <select name="${key}" class="meal-select">
  <option value="Không ăn" selected>✕ Không ăn</option>
  <option value="Đúng giờ">✓ Đúng giờ</option>
  <option value="Ăn trễ">⏰ Ăn trễ</option>
</select>
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

    const select = cell.querySelector(".meal-select");

    if (!select) return;

    select.value = row.status;
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
    const select =
  cell.querySelector(".meal-select");

if (!select || !select.value) {
  continue;
}

    const date =
      cell.dataset.date;

    const meal =
      cell.dataset.meal;

 const status =
  select.value;
    
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
    // Mặc định Không ăn.
// Nếu chưa từng đăng ký thì không cần tạo dữ liệu mới.
if (!existing && status === "Không ăn") {
  continue;
}
  

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
  const select = $("summaryDate");

  // Tạo danh sách 7 ngày của tuần
  const currentValue = select.value;

  select.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const date = addDays(currentWeekStart, i);
    const dateStr = localDateString(date);

    const option = document.createElement("option");
    option.value = dateStr;
    option.textContent =
      `${dayName(date)} - ${displayDate(date)}`;

    select.appendChild(option);
  }

  // Giữ ngày đang chọn nếu vẫn nằm trong tuần
  const exists = [...select.options]
    .some((option) => option.value === currentValue);

  if (exists) {
    select.value = currentValue;
  } else if (
    todayString() >= localDateString(currentWeekStart) &&
    todayString() <= localDateString(weekEnd())
  ) {
    select.value = todayString();
  }

  updateDailySummary();
}
function updateDailySummary() {
  const date = $("summaryDate").value;

  const rows = weekRowsData.filter(
    (row) => row.meal_date === date
  );

  const count = (meal, status) =>
    rows.filter(
      (row) =>
        row.meal === meal &&
        row.status === status
    ).length;

  $("morningOnTime").textContent =
    count("Trưa", "Đúng giờ");

  $("morningLate").textContent =
    count("Trưa", "Ăn trễ");

  $("morningNoEat").textContent =
    count("Trưa", "Không ăn");

  $("afternoonOnTime").textContent =
    count("Tối", "Đúng giờ");

  $("afternoonLate").textContent =
    count("Tối", "Ăn trễ");

  $("afternoonNoEat").textContent =
    count("Tối", "Không ăn");

  $("summaryPeopleList").innerHTML =
    "<p>Bấm vào một mục để xem ai đã đăng ký.</p>";
}
function showSummaryPeople(meal, status) {
  const date = $("summaryDate").value;

  const people = weekRowsData.filter(
    (row) =>
      row.meal_date === date &&
      row.meal === meal &&
      row.status === status
  );

  const mealName =
    meal === "Trưa" ? "🌤️ Sáng" : "🌇 Chiều";

  if (people.length === 0) {
    $("summaryPeopleList").innerHTML = `
      <h3>${mealName} - ${status}</h3>
      <p>Chưa có ai đăng ký.</p>
    `;
    return;
  }

  $("summaryPeopleList").innerHTML = `
    <h3>${mealName} - ${status}</h3>

    ${people
      .map(
        (person, index) => `
          <div class="summary-person">
            <strong>
              ${index + 1}. ${escapeHtml(person.name)}
            </strong>
            <span>${escapeHtml(person.email)}</span>
          </div>
        `
      )
      .join("")}
  `;
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

$("summaryDate").addEventListener(
  "change",
  updateDailySummary
);

document
  .querySelectorAll(".summary-item")
  .forEach((button) => {
    button.addEventListener("click", () => {
      showSummaryPeople(
        button.dataset.meal,
        button.dataset.status
      );
    });
  });
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
async function checkMemberAccess(user) {
  const email = user?.email;

  if (!email) {
    return false;
  }

  const { data, error } = await supabaseClient
    .from("members")
    .select("email, active")
    .eq("email", email.toLowerCase())
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Lỗi kiểm tra thành viên:", error);
    return false;
  }

  return !!data;
}
async function handleSession(currentSession) {
  session = currentSession;

  if (!session) {
    $("appView").classList.add("hidden");
    $("userBox").classList.add("hidden");
    $("loginView").classList.remove("hidden");
    return;
  }

  const allowed = await checkMemberAccess(session.user);

  if (!allowed) {
    await supabaseClient.auth.signOut();

    $("appView").classList.add("hidden");
    $("userBox").classList.add("hidden");
    $("loginView").classList.remove("hidden");

    alert("Tài khoản này không thuộc danh sách thành viên.");
    return;
  }

  await showApp();
}


supabaseClient.auth
  .getSession()
  .then(({ data }) => {
    handleSession(data.session);
  });


supabaseClient.auth.onAuthStateChange(
  (event, newSession) => {
    handleSession(newSession);
  }
);
// ===== ĐIỀU HƯỚNG TRANG =====
let summaryWeekStart = new Date(currentWeekStart);
async function loadWeeklySummaryData() {
  const startDate = localDateString(summaryWeekStart);
  const endDate = localDateString(addDays(summaryWeekStart, 6));

  const { data: members, error: membersError } =
    await supabaseClient
      .from("members")
      .select("email, name, active")
      .eq("active", true);

  if (membersError) {
    console.error("Lỗi tải thành viên:", membersError);
    return;
  }

  const { data: registrations, error: regError } =
    await supabaseClient
      .from("meal_registrations")
      .select("email, name, meal_date, meal, status")
      .gte("meal_date", startDate)
      .lte("meal_date", endDate);

  if (regError) {
    console.error("Lỗi tải đăng ký:", regError);
    return;
  }

  renderWeeklySummary(members, registrations);
}

function renderWeeklySummary(members, registrations) {
  const container =
    document.getElementById("weeklySummaryRows");

  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const date = addDays(summaryWeekStart, i);
    const dateStr = localDateString(date);

    const getNotEating = (meal) => {
      return members.filter((member) => {
        const reg = registrations.find(
          (r) =>
            r.email.toLowerCase() ===
              member.email.toLowerCase() &&
            r.meal_date === dateStr &&
            r.meal === meal
        );

        // Không có đăng ký = mặc định Không ăn
        if (!reg) return true;

        return reg.status === "Không ăn";
      });
    };

    const morning = getNotEating("Trưa");
    const afternoon = getNotEating("Tối");

    const names = (people) =>
      people
        .map((person) => {
          const reg = registrations.find(
            (r) =>
              r.email.toLowerCase() ===
              person.email.toLowerCase()
          );

          return person.name || reg?.name || "Chưa có tên";
        })
        .map(
          (name) =>
            `<div class="summary-name">• ${escapeHtml(name)}</div>`
        )
        .join("");

    container.innerHTML += `
      <div class="summary-day">

        <h3>
          📅 ${dayName(date)} - ${displayDate(date)}
        </h3>

        <div class="summary-meals">

          <div class="summary-meal-box">
            <strong>🌤️ Sáng</strong>

            <div>
              🚫 Không ăn:
              <b>${morning.length} người</b>
            </div>

            <div class="summary-name-list">
              ${names(morning)}
            </div>
          </div>

          <div class="summary-meal-box">
            <strong>🌇 Chiều</strong>

            <div>
              🚫 Không ăn:
              <b>${afternoon.length} người</b>
            </div>

            <div class="summary-name-list">
              ${names(afternoon)}
            </div>
          </div>

        </div>
      </div>
    `;
  }

  document.getElementById("summaryWeekLabel").textContent =
    `${shortDate(summaryWeekStart)} - ${
      shortDate(addDays(summaryWeekStart, 6))
    }`;
}
function openPage(page) {
  document.querySelectorAll(".app-page").forEach((el) => {
    el.classList.add("hidden");
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  const target = document.getElementById(`${page}Page`);

  if (target) {
    target.classList.remove("hidden");
  }
 if (page === "menu") {
  renderWeeklyMenu();
  loadWeeklyMenu();
  updateMenuAdminControls();
   loadMenuPool();
}
 if (page === "summary") {
  loadWeeklySummaryData();
}
  const activeBtn = document.querySelector(
    `.nav-btn[data-page="${page}"]`
  );

  if (activeBtn) {
    activeBtn.classList.add("active");
  }
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    openPage(btn.dataset.page);
  });
});
async function updateMenuAdminControls() {
  if (!session?.user?.email) return;

  const { data, error } = await supabaseClient
    .from("members")
    .select("is_admin")
    .eq("email", session.user.email.toLowerCase())
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Lỗi kiểm tra admin:", error);
    return;
  }

  const controls = document.getElementById("menuAdminControls");

  if (data?.is_admin === true) {
    controls?.classList.remove("hidden");
  } else {
    controls?.classList.add("hidden");
  }
}
function renderWeeklyMenu() {
  const container = document.getElementById("weeklyMenuRows");

  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < 7; i++) {
   const date = addDays(menuWeekStart, i);
    const dateStr = localDateString(date);

    container.innerHTML += `
      <div class="menu-row">
        <div class="menu-date">
          <strong>${dayName(date)}</strong>
          <span>${displayDate(date)}</span>
        </div>

        <div>
          <input
            class="menu-input"
            data-date="${dateStr}"
            data-meal="Trưa"
            placeholder="Nhập món sáng"
          >
        </div>

        <div>
          <input
            class="menu-input"
            data-date="${dateStr}"
            data-meal="Tối"
            placeholder="Nhập món chiều"
          >
        </div>
      </div>
    `;
  }

  document.getElementById("menuWeekLabel").textContent =
    `${shortDate(menuWeekStart)} - ${shortDate(addDays(menuWeekStart, 6))}`;
}
async function loadMenuPool() {
  const { data, error } = await supabaseClient
    .from("menu_pool")
    .select("dish_name")
    .eq("active", true)
    .order("id");

  if (error) {
    console.error("Lỗi tải kho món:", error);
    return;
  }

  const input = document.getElementById("menuPoolInput");

  if (input) {
    input.value = data
      .map((row) => row.dish_name)
      .join("\n");
  }
}

async function saveMenuPool() {
  const input = document.getElementById("menuPoolInput");

  const dishes = input.value
    .split("\n")
    .map((dish) => dish.trim())
    .filter((dish) => dish !== "");

  if (dishes.length === 0) {
    alert("Bạn chưa nhập món.");
    return;
  }

  const rows = dishes.map((dish) => ({
    dish_name: dish,
    active: true
  }));

  const { error } = await supabaseClient
    .from("menu_pool")
    .upsert(rows, {
      onConflict: "dish_name"
    });

  if (error) {
    console.error("Lỗi lưu kho món:", error);
    alert("Không lưu được kho món.");
    return;
  }

  alert("Đã lưu kho món ✅");
  await loadMenuPool();
}

document
  .getElementById("saveMenuPoolBtn")
  ?.addEventListener("click", saveMenuPool);
async function randomWeeklyMenu() {
  const { data, error } = await supabaseClient
    .from("menu_pool")
    .select("dish_name")
    .eq("active", true);

  if (error) {
    console.error("Lỗi tải kho món:", error);
    alert("Không tải được kho món.");
    return;
  }

  const dishes = data
    .map((row) => row.dish_name)
    .filter((dish) => dish);

  if (dishes.length === 0) {
    alert("Kho món đang trống.");
    return;
  }

  // Xáo trộn kho món
  for (let i = dishes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [dishes[i], dishes[j]] =
      [dishes[j], dishes[i]];
  }

  const inputs = [
    ...document.querySelectorAll(".menu-input")
  ];

  const rows = [];

  inputs.forEach((input, index) => {
    const dish = dishes[index % dishes.length];

    input.value = dish;

    rows.push({
      meal_date: input.dataset.date,
      meal: input.dataset.meal,
      dish_name: dish
    });
  });

  const { error: saveError } = await supabaseClient
    .from("weekly_menu")
    .upsert(rows, {
      onConflict: "meal_date,meal"
    });

  if (saveError) {
    console.error("Lỗi lưu thực đơn Random:", saveError);
    alert("Random được nhưng không lưu được.");
    return;
  }

  alert("Đã Random và lưu thực đơn tuần ✅");
}

document
  .getElementById("saveMenuBtn")
  ?.addEventListener("click", saveWeeklyMenu);
async function loadWeeklyMenu() {
  const startDate = localDateString(menuWeekStart);
  const endDate = localDateString(addDays(menuWeekStart, 6));

  const { data, error } = await supabaseClient
    .from("weekly_menu")
    .select("meal_date, meal, dish_name")
    .gte("meal_date", startDate)
    .lte("meal_date", endDate);

  if (error) {
    console.error("Lỗi tải thực đơn:", error);
    return;
  }

  data.forEach((row) => {
    const input = document.querySelector(
      `.menu-input[data-date="${row.meal_date}"][data-meal="${row.meal}"]`
    );

    if (input) {
      input.value = row.dish_name;
    }
  });
}
async function changeMenuWeek(days) {
menuWeekStart = addDays(menuWeekStart, days);

  renderWeeklyMenu();
  await loadWeeklyMenu();
}

document
  .getElementById("menuPrevWeek")
  ?.addEventListener("click", () => {
    changeMenuWeek(-7);
  });

document
  .getElementById("menuNextWeek")
  ?.addEventListener("click", () => {
    changeMenuWeek(7);
  });

