// 1) Sau khi tạo Supabase, điền 2 giá trị bên dưới.
const SUPABASE_URL = "https://usgecirqtmoldcvvwcxk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__qbpft3pHINGK3sweQHL7w_DLc5zZMt";

const configured = !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_ANON_KEY.startsWith("YOUR_");
const sb = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = id => document.getElementById(id);
const today = new Date().toISOString().slice(0,10);
$("date").value = today;
$("filterDate").value = today;

document.querySelectorAll('input[name="meal"]').forEach(x => x.addEventListener("change", refreshChoices));
document.querySelectorAll('input[name="time"]').forEach(x => x.addEventListener("change", refreshChoices));
$("filterDate").addEventListener("change", loadMeals);
$("filterMeal").addEventListener("change", loadMeals);
$("refresh").addEventListener("click", loadMeals);

function refreshChoices(){
  document.querySelectorAll(".choice").forEach(el => {
    const input = el.querySelector("input");
    el.classList.toggle("active", input.checked);
  });
}

$("mealForm").addEventListener("submit", async e => {
  e.preventDefault();
  if(!configured){
    $("status").textContent = "⚠️ Chưa cấu hình Supabase. Hãy điền URL và anon key trong app.js.";
    return;
  }

  const payload = {
    name: $("name").value.trim(),
    meal_date: $("date").value,
    meal: document.querySelector('input[name="meal"]:checked').value,
    time_type: document.querySelector('input[name="time"]:checked').value,
    quantity: Number($("quantity").value),
    note: $("note").value.trim() || null
  };

  $("status").textContent = "Đang đăng ký...";
  const { error } = await sb.from("meal_registrations").insert(payload);

  if(error){
    $("status").textContent = "❌ " + error.message;
    return;
  }

  $("status").textContent = "✅ Đăng ký thành công!";
  $("name").value = "";
  $("note").value = "";
  $("quantity").value = 1;
  await loadMeals();
});

async function loadMeals(){
  if(!configured){
    $("rows").innerHTML = '<tr><td colspan="6" class="empty">Chưa kết nối database. Cấu hình app.js trước.</td></tr>';
    return;
  }

  let query = sb.from("meal_registrations").select("*").order("meal_date",{ascending:true}).order("created_at",{ascending:false});
  const date = $("filterDate").value;
  const meal = $("filterMeal").value;
  if(date) query = query.eq("meal_date", date);
  if(meal) query = query.eq("meal", meal);

  const { data, error } = await query;
  if(error){
    $("rows").innerHTML = `<tr><td colspan="6" class="empty">❌ ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  render(data || []);
}

function render(data){
  let total=0,lunch=0,dinner=0;
  data.forEach(x => {
    total += x.quantity;
    if(x.meal === "Trưa") lunch += x.quantity;
    if(x.meal === "Tối") dinner += x.quantity;
  });
  $("total").textContent=total; $("lunch").textContent=lunch; $("dinner").textContent=dinner;

  if(!data.length){
    $("rows").innerHTML='<tr><td colspan="6" class="empty">Chưa có đăng ký cho bộ lọc này.</td></tr>';
    return;
  }

  $("rows").innerHTML = data.map(x => `
    <tr>
      <td><b>${escapeHtml(x.name)}</b></td>
      <td>${formatDate(x.meal_date)}</td>
      <td><span class="badge ${x.meal==="Trưa"?"lunch":"dinner"}">${x.meal==="Trưa"?"☀️":"🌙"} ${x.meal}</span></td>
      <td><span class="badge ${x.time_type==="Đúng giờ"?"ontime":"late"}">${x.time_type==="Đúng giờ"?"⏰":"🕐"} ${x.time_type}</span></td>
      <td><b>${x.quantity}</b></td>
      <td>${escapeHtml(x.note || "")}</td>
    </tr>`).join("");
}

function formatDate(v){
  const [y,m,d]=v.split("-");
  return `${d}/${m}/${y}`;
}
function escapeHtml(v){
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

refreshChoices();
loadMeals();

// --- Xử lý Đăng nhập Google & Tự động tạo nút ---
const mealForm = $("mealForm");
if (mealForm && !$("btn-google-login")) {
  mealForm.insertAdjacentHTML("afterbegin", `
    <button id="btn-google-login" type="button" style="background-color: #4285F4; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; width: 100%; font-weight: bold; margin-bottom: 15px;">
      Đăng nhập bằng Gmail
    </button>
  `);
}

const googleBtn = $("btn-google-login");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    if (!configured || !sb) {
      alert("Chưa cấu hình Supabase!");
      return;
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href
      }
    });
    if (error) alert("Lỗi đăng nhập: " + error.message);
  });
}

// Tự động điền tên từ Google sau khi đăng nhập thành công
async function checkUserSession() {
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user) {
    const userFullName = session.user.user_metadata?.full_name || session.user.email;
    const nameInput = $("name");
    if (nameInput) {
      nameInput.value = userFullName;
    }
  }
}

checkUserSession();
