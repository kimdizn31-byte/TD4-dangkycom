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
function renderEatingPeople() {
  const container = document.getElementById("eatingPeopleList");

  if (!container) return;

  let html = `<h3>👥 Người ăn trong tuần</h3>`;

  for (let i = 0; i < 7; i++) {
    const date = addDays(currentWeekStart, i);
    const dateStr = localDateString(date);

    const morningPeople = weekRowsData.filter(
      (row) =>
        row.meal_date === dateStr &&
        row.meal === "Trưa" &&
        (row.status === "Đúng giờ" || row.status === "Ăn trễ")
    );

    const afternoonPeople = weekRowsData.filter(
      (row) =>
        row.meal_date === dateStr &&
        row.meal === "Tối" &&
        (row.status === "Đúng giờ" || row.status === "Ăn trễ")
    );

    html += `
      <div class="eating-day-card">
        <div class="eating-day-title">
          <strong>${dayName(date)}</strong>
          <span>${displayDate(date)}</span>
        </div>

        <div class="eating-meals">
          <button
            type="button"
            class="eating-count-btn"
            data-date="${dateStr}"
            data-meal="Trưa"
          >
            🌤️ Sáng:
            <strong>${morningPeople.length} người</strong>
          </button>

          <button
            type="button"
            class="eating-count-btn"
            data-date="${dateStr}"
            data-meal="Tối"
          >
            🌇 Chiều:
            <strong>${afternoonPeople.length} người</strong>
          </button>
        </div>

        <div
          class="eating-names hidden"
          id="eatingNames-${dateStr}"
        ></div>
      </div>
    `;
  }

  container.innerHTML = html;
}
async function loadDailyStats(date) {
  if (!date) return;

  const title = document.getElementById("dailyStatsTitle");

  const [year, month, day] = date.split("-");

  if (title) {
    title.textContent =
      `📊 Thống kê ngày ${day}/${month}/${year}`;
  }

  // Lấy tất cả thành viên đang hoạt động
  const { data: members, error: membersError } =
    await supabaseClient
      .from("members")
      .select("id, email, name")
      .eq("active", true);

  if (membersError) {
    console.error(
      "Lỗi tải thành viên cho thống kê:",
      membersError
    );
    return;
  }

  // Lấy đăng ký đúng ngày được chọn
  const { data: registrations, error: registrationsError } =
    await supabaseClient
      .from("meal_registrations")
      .select("user_id, meal, status")
      .eq("meal_date", date);

  if (registrationsError) {
    console.error(
      "Lỗi tải thống kê ngày:",
      registrationsError
    );
    return;
  }

  const rows = registrations || [];
  const totalMembers = (members || []).length;

  const count = (meal, status) =>
    rows.filter(
      (row) =>
        row.meal === meal &&
        row.status === status
    ).length;

  const morningOnTime =
    count("Trưa", "Đúng giờ");

  const morningLate =
    count("Trưa", "Ăn trễ");

  const afternoonOnTime =
    count("Tối", "Đúng giờ");

  const afternoonLate =
    count("Tối", "Ăn trễ");

  /*
    Không ăn =
    tổng thành viên hoạt động
    - người Đúng giờ
    - người Ăn trễ

    Vì người không chọn gì cũng được xem là Không ăn.
  */
  const morningNoEat = Math.max(
    0,
    totalMembers - morningOnTime - morningLate
  );

  const afternoonNoEat = Math.max(
    0,
    totalMembers - afternoonOnTime - afternoonLate
  );

  document.getElementById(
    "dailyMorningOnTime"
  ).textContent = morningOnTime;

  document.getElementById(
    "dailyMorningLate"
  ).textContent = morningLate;

  document.getElementById(
    "dailyMorningNoEat"
  ).textContent = morningNoEat;

  document.getElementById(
    "dailyAfternoonOnTime"
  ).textContent = afternoonOnTime;

  document.getElementById(
    "dailyAfternoonLate"
  ).textContent = afternoonLate;

  document.getElementById(
    "dailyAfternoonNoEat"
  ).textContent = afternoonNoEat;
}


function setupDailyStats() {
  const input =
    document.getElementById("dailyStatsDate");

  if (!input) return;

  if (!input.value) {
    input.value = todayString();
  }

  loadDailyStats(input.value);
}
document
  .getElementById("dailyStatsDate")
  ?.addEventListener("change", (event) => {
    loadDailyStats(event.target.value);
  });
async function loadDailyStats(date) {
  if (!date) return;

  const title = document.getElementById("dailyStatsTitle");

  const [year, month, day] = date.split("-");

  if (title) {
    title.textContent =
      `📊 Thống kê ngày ${day}/${month}/${year}`;
  }

  const { data: members, error: membersError } =
    await supabaseClient
      .from("members")
      .select("id")
      .eq("active", true);

  if (membersError) {
    console.error("Lỗi tải thành viên:", membersError);
    return;
  }

  const { data: registrations, error } =
    await supabaseClient
      .from("meal_registrations")
      .select("user_id, meal, status")
      .eq("meal_date", date);

  if (error) {
    console.error("Lỗi tải thống kê ngày:", error);
    return;
  }

  const rows = registrations || [];
  const totalMembers = (members || []).length;

  const count = (meal, status) =>
    rows.filter(
      (row) =>
        row.meal === meal &&
        row.status === status
    ).length;

  const morningOnTime = count("Trưa", "Đúng giờ");
  const morningLate = count("Trưa", "Ăn trễ");

  const afternoonOnTime = count("Tối", "Đúng giờ");
  const afternoonLate = count("Tối", "Ăn trễ");

  // Ai không chọn Đúng giờ/Ăn trễ được tính là Không ăn
  const morningNoEat = Math.max(
    0,
    totalMembers - morningOnTime - morningLate
  );

  const afternoonNoEat = Math.max(
    0,
    totalMembers - afternoonOnTime - afternoonLate
  );

  document.getElementById("dailyMorningOnTime").textContent =
    morningOnTime;

  document.getElementById("dailyMorningLate").textContent =
    morningLate;

  document.getElementById("dailyMorningNoEat").textContent =
    morningNoEat;

  document.getElementById("dailyAfternoonOnTime").textContent =
    afternoonOnTime;

  document.getElementById("dailyAfternoonLate").textContent =
    afternoonLate;

  document.getElementById("dailyAfternoonNoEat").textContent =
    afternoonNoEat;
}


function setupDailyStats() {
  const input = document.getElementById("dailyStatsDate");

  if (!input) return;

  if (!input.value) {
    input.value = todayString();
  }

  loadDailyStats(input.value);
}


document
  .getElementById("dailyStatsDate")
  ?.addEventListener("change", (event) => {
    loadDailyStats(event.target.value);
  });
function showEatingNames(date, meal) {
  const box = document.getElementById(`eatingNames-${date}`);

  if (!box) return;

  const people = weekRowsData.filter(
    (row) =>
      row.meal_date === date &&
      row.meal === meal &&
      (row.status === "Đúng giờ" || row.status === "Ăn trễ")
  );

  const mealName =
    meal === "Trưa" ? "🌤️ Sáng" : "🌇 Chiều";

  if (people.length === 0) {
    box.innerHTML = `
      <strong>${mealName}</strong>
      <p>Chưa có ai ăn.</p>
    `;

    box.classList.remove("hidden");
    return;
  }

  box.innerHTML = `
    <strong>${mealName}</strong>

    ${people
      .map(
        (person, index) => `
          <div class="eating-person">
            ${index + 1}. ${escapeHtml(person.name || "Chưa có tên")}
          </div>
        `
      )
      .join("")}
  `;

  box.classList.remove("hidden");
}
document
  .getElementById("eatingPeopleList")
  ?.addEventListener("click", (event) => {
    const button = event.target.closest(".eating-count-btn");

    if (!button) return;

    showEatingNames(
      button.dataset.date,
      button.dataset.meal
    );
  });
function mealCell(date, meal) {
  const key =
    `${date}-${meal === "Trưa" ? "morning" : "afternoon"}`;

  return `
    <div
      class="meal-cell"
      data-date="${date}"
      data-meal="${meal}"
    >
      <select
        name="${key}"
        class="meal-select status-noeat"
        onchange="updateMealSelectColor(this)"
      >
        <option value="Không ăn" selected>✕ Không ăn</option>
        <option value="Đúng giờ">✓ Đúng giờ</option>
        <option value="Ăn trễ">⏰ Ăn trễ</option>
      </select>
    </div>
  `;
}

function updateMealSelectColor(select) {
  select.classList.remove(
    "status-ontime",
    "status-late",
    "status-noeat"
  );

  if (select.value === "Đúng giờ") {
    select.classList.add("status-ontime");
  } else if (select.value === "Ăn trễ") {
    select.classList.add("status-late");
  } else {
    select.classList.add("status-noeat");
  }
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
 
 setupDailyStats();

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
    updateMealSelectColor(select);
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
async function updateMemberNameFromGoogle(user) {
  const email = user?.email;

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "";

  if (!email || !fullName) return;

  const { error } = await supabaseClient
    .from("members")
    .update({
      name: fullName
    })
    .eq("email", email.toLowerCase());

  if (error) {
    console.error("Lỗi cập nhật tên thành viên:", error);
  }
}
async function updateAdminAccess() {
  if (!session?.user?.email) return;

  const { data, error } = await supabaseClient
    .from("members")
    .select("is_admin")
    .eq("email", session.user.email.toLowerCase())
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Lỗi kiểm tra quyền admin:", error);
    return;
  }

  const adminBtn = document.getElementById("adminNavBtn");

  if (data?.is_admin === true) {
    adminBtn?.classList.remove("hidden");
  } else {
    adminBtn?.classList.add("hidden");
  }
}

async function loadMembers() {
  const container = document.getElementById("membersList");

  if (!container) return;

  container.innerHTML = "<p>Đang tải danh sách...</p>";

  const { data, error } = await supabaseClient
    .from("members")
    .select("id, email, name, is_admin, active")
    .order("id", { ascending: true });

  if (error) {
    console.error("Lỗi tải thành viên:", error);
    container.innerHTML = "<p>Không tải được danh sách.</p>";
    return;
  }
 
  container.innerHTML = data.map((member) => `
    <div class="member-row">
      <div>
        <strong>
          ${escapeHtml(member.name || "Chưa có tên")}
          ${member.is_admin ? " 👑" : ""}
        </strong>

        <div>${escapeHtml(member.email)}</div>
      </div>

      <button
        class="toggle-member-btn"
        data-id="${member.id}"
        data-active="${member.active}"
        ${member.is_admin ? "disabled" : ""}
      >
        ${member.active ? "🟢 Đang hoạt động" : "⚫ Đã tắt"}
      </button>
      <button
  class="delete-member-btn"
  data-id="${member.id}"
  data-email="${escapeHtml(member.email)}"
  ${member.is_admin ? "disabled" : ""}
>
  🗑️ Xóa
</button>
    </div>
  `).join("");
}
 async function toggleMember(memberId, currentActive) {
  const { error } = await supabaseClient
    .from("members")
    .update({
      active: !currentActive
    })
    .eq("id", memberId);

  if (error) {
    console.error("Lỗi đổi trạng thái thành viên:", error);
    alert("Không đổi được trạng thái thành viên.");
    return;
  }

  await loadMembers();
}
  document
  .getElementById("membersList")
  ?.addEventListener("click", async (event) => {
    const button = event.target.closest(".toggle-member-btn");

    if (!button || button.disabled) return;

    const memberId = Number(button.dataset.id);
    const currentActive =
      button.dataset.active === "true";

    await toggleMember(memberId, currentActive);
  });
async function deleteMember(memberId, email) {
  const ok = confirm(
    `Bạn có chắc muốn xóa ${email} khỏi danh sách thành viên không?`
  );

  if (!ok) return;

  const { error } = await supabaseClient
    .from("members")
    .delete()
    .eq("id", memberId);

  if (error) {
    console.error("Lỗi xóa thành viên:", error);
    alert("Không xóa được thành viên.");
    return;
  }

  await loadMembers();
  alert("Đã xóa thành viên ✅");
}

document
  .getElementById("membersList")
  ?.addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-member-btn");

    if (!button || button.disabled) return;

    const memberId = Number(button.dataset.id);
    const email = button.dataset.email;

    await deleteMember(memberId, email);
  });

async function addMember() {
  const input = document.getElementById("newMemberEmail");
  const email = input?.value.trim().toLowerCase();

  if (!email) {
    alert("Hãy nhập Gmail.");
    return;
  }

  if (!email.includes("@")) {
    alert("Gmail không hợp lệ.");
    return;
  }

  const { error } = await supabaseClient
    .from("members")
    .upsert(
      {
        email: email,
        active: true
      },
      {
        onConflict: "email"
      }
    );

  if (error) {
    console.error("Lỗi thêm thành viên:", error);
    alert("Không thêm được thành viên.");
    return;
  }

  input.value = "";
  await loadMembers();

  alert("Đã thêm thành viên ✅");
}

document
  .getElementById("addMemberBtn")
  ?.addEventListener("click", addMember);
// ===============================
// BÁO VẮNG
// ===============================

async function sendAbsenceReport() {
  const dateInput = document.getElementById("absenceDate");
  const reasonInput = document.getElementById("absenceReason");
  const message = document.getElementById("absenceMessage");

  const absenceDate = dateInput?.value;
  const reason = reasonInput?.value.trim();

  if (!absenceDate) {
    message.textContent = "Vui lòng chọn ngày vắng.";
    return;
  }

  if (!reason) {
    message.textContent = "Vui lòng nhập lý do.";
    return;
  }

  if (!session?.user) {
    message.textContent = "Bạn chưa đăng nhập.";
    return;
  }

  message.textContent = "Đang gửi...";

  const user = session.user;

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email;

  const { error } = await supabaseClient
    .from("absence_reports")
    .insert({
      user_id: user.id,
      email: user.email,
      name: name,
      absence_date: absenceDate,
      reason: reason
    });

  if (error) {
    console.error("Lỗi gửi báo vắng:", error);
    message.textContent = "Không gửi được báo vắng.";
    return;
  }

  reasonInput.value = "";

  message.textContent = "✓ Đã gửi báo vắng thành công.";
  await loadAbsenceHistory();
}
async function loadAbsenceHistory() {
  const historyCard =
    document.getElementById("absenceHistoryCard");

  const historyBox =
    document.getElementById("absenceHistory");

  if (!historyCard || !historyBox) return;

  const { data: adminData, error: adminError } =
    await supabaseClient.rpc("is_admin_member");

  if (adminError || !adminData) {
    historyCard.classList.add("hidden");
    return;
  }

  historyCard.classList.remove("hidden");

  historyBox.innerHTML = "<p>Đang tải...</p>";

  const { data, error } = await supabaseClient
    .from("absence_reports")
    .select("id, name, email, absence_date, reason, created_at")
    .order("absence_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Lỗi tải lịch sử báo vắng:", error);
    historyBox.innerHTML =
      "<p>Không tải được lịch sử báo vắng.</p>";
    return;
  }

  if (!data || data.length === 0) {
    historyBox.innerHTML =
      "<p>Chưa có ai báo vắng.</p>";
    return;
  }

  historyBox.innerHTML = data
    .map((row) => `
      <div class="absence-history-item">
        <strong>${escapeHtml(row.name || "Chưa có tên")}</strong>

        <div>
          📅 ${escapeHtml(row.absence_date)}
        </div>

        <div>
          📝 ${escapeHtml(row.reason)}
        </div>
      </div>
    `)
    .join("");
}
document
  .getElementById("sendAbsenceBtn")
  ?.addEventListener("click", sendAbsenceReport);
async function handleSession(currentSession) {
  session = currentSession;

  if (!session) {
    $("appView").classList.add("hidden");
    $("userBox").classList.add("hidden");
    $("loginView").classList.remove("hidden");
    return;
  }

  const allowed = await checkMemberAccess(session.user);
  await updateMemberNameFromGoogle(session.user);

  if (!allowed) {
    await supabaseClient.auth.signOut();

    $("appView").classList.add("hidden");
    $("userBox").classList.add("hidden");
    $("loginView").classList.remove("hidden");

    alert("Tài khoản này không thuộc danh sách thành viên.");
    return;
  }

 await showApp();
await updateAdminAccess();
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
  const homePage = document.getElementById("homePage");

if (homePage) {
  homePage.classList.add("hidden");
}
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
  if (page === "absence") {
  const absenceDate =
    document.getElementById("absenceDate");

  if (absenceDate && !absenceDate.value) {
    absenceDate.value = todayString();
  }
    loadAbsenceHistory();
}
  if (page === "members") {
  loadMembers();
}
  const activeBtn = document.querySelector(
    `.nav-btn[data-page="${page}"]`
  );

  if (activeBtn) {
    activeBtn.classList.add("active");
  }
}
function goHome() {
  document.querySelectorAll(".app-page").forEach((el) => {
    el.classList.add("hidden");
  });

  const homePage = document.getElementById("homePage");

  if (homePage) {
    homePage.classList.remove("hidden");
  }
}

document.querySelectorAll(".app-page").forEach((page) => {
  if (page.querySelector(".back-home-btn")) return;

  const button = document.createElement("button");

  button.className = "back-home-btn";
  button.innerHTML = "← Trang chủ";

  button.addEventListener("click", goHome);

  page.prepend(button);
});

document.querySelectorAll(".home-menu-btn").forEach((btn) => {
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
const isAdmin = data?.is_admin === true;

document
  .querySelectorAll(".menu-input")
  .forEach((input) => {
    input.readOnly = !isAdmin;
  });
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

const dishes = [
  ...new Set(
    input.value
      .split("\n")
      .map((dish) => dish.trim())
      .filter((dish) => dish !== "")
  )
];
  // Tắt toàn bộ món cũ trước
  const { error: disableError } = await supabaseClient
    .from("menu_pool")
    .update({
      active: false
    })
    .eq("active", true);

  if (disableError) {
    console.error("Lỗi cập nhật kho món:", disableError);
    alert("Không lưu được kho món.");
    return;
  }

  // Nếu đã xóa hết món thì dừng ở đây
  if (dishes.length === 0) {
    alert("Đã xóa toàn bộ món trong kho ✅");
    await loadMenuPool();
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

  alert(
    "Lỗi lưu kho món:\n" +
    "Code: " + (error.code || "không có") + "\n" +
    "Message: " + (error.message || "không có") + "\n" +
    "Details: " + (error.details || "không có")
  );

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
  .getElementById("randomMenuBtn")
  ?.addEventListener("click", randomWeeklyMenu);

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
async function changeSummaryWeek(days) {
  summaryWeekStart = addDays(summaryWeekStart, days);
  await loadWeeklySummaryData();
}

document
  .getElementById("summaryPrevWeek")
  ?.addEventListener("click", () => {
    changeSummaryWeek(-7);
  });

document
  .getElementById("summaryNextWeek")
  ?.addEventListener("click", () => {
    changeSummaryWeek(7);
  });
// =====================================
// XEM DANH SÁCH NGƯỜI THEO THỐNG KÊ NGÀY
// =====================================

async function showDailyPeople(meal, status) {
  const dateInput = document.getElementById("dailyStatsDate");
  const box = document.getElementById("dailyPeopleDetails");

  if (!dateInput || !box) return;

  const date = dateInput.value;

  // Lấy danh sách thành viên
  const { data: members, error: membersError } =
    await supabaseClient
      .from("members")
      .select("id, email, name")
      .eq("active", true);

  if (membersError) {
    console.error("Lỗi tải thành viên:", membersError);
    return;
  }

  // Lấy đăng ký của ngày + buổi đang chọn
  const { data: registrations, error: registrationsError } =
    await supabaseClient
      .from("meal_registrations")
      .select("user_id, email, name, meal, status")
      .eq("meal_date", date)
      .eq("meal", meal);

  if (registrationsError) {
    console.error("Lỗi tải đăng ký:", registrationsError);
    return;
  }

  const rows = registrations || [];
  let people = [];

  // KHÔNG ĂN
  if (status === "Không ăn") {
    people = (members || []).filter((member) => {
      const registration = rows.find((row) =>
        row.email?.toLowerCase() === member.email?.toLowerCase()
      );

      return !registration || registration.status === "Không ăn";
    });
  }

  // ĐÚNG GIỜ / ĂN TRỄ
  else {
    people = rows
      .filter((row) => row.status === status)
      .map((row) => ({
        name: row.name || row.email || "Chưa có tên"
      }));
  }

  const mealName =
    meal === "Trưa" ? "🌤️ Sáng" : "🌇 Chiều";

  const [year, month, day] = date.split("-");

  let html = `
    <div class="daily-people-title">
      <strong>${mealName} · ${escapeHtml(status)}</strong>
      <span>${day}/${month}/${year}</span>
    </div>
  `;

  if (people.length === 0) {
    html += `
      <div class="daily-person-empty">
        Không có ai.
      </div>
    `;
  } else {
    html += `
      <div class="daily-person-list">
        ${people.map((person, index) => `
          <div class="daily-person-row">
            <span>${index + 1}.</span>
            <strong>
              ${escapeHtml(
                person.name ||
                person.email ||
                "Chưa có tên"
              )}
            </strong>
          </div>
        `).join("")}
      </div>
    `;
  }

  box.innerHTML = html;
  box.classList.remove("hidden");
}


// BẤM VÀO 6 Ô THỐNG KÊ
document.addEventListener("click", (event) => {
  const item = event.target.closest(".daily-stat-item");

  if (!item) return;

  showDailyPeople(
    item.dataset.meal,
    item.dataset.status
  );
});
