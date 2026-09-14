const SUPABASE_URL = "https://usgecirqtmoldcvvwcxk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable__qbpft3pHINGK3sweQHL7w_DLc5zZMt";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
let session = null, selectedMeal = "Trưa", selectedStatus = "Đúng giờ", rows = [];

function localDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date())}
function nowVN(){return new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Ho_Chi_Minh"}))}
function minutesNow(){const d=nowVN();return d.getHours()*60+d.getMinutes()}
function timeText(){const d=nowVN();return d.toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})+" • "+d.toLocaleDateString("vi-VN")}
function statusWindow(meal){return meal==="Trưa"?"trước 10:30":"trước 17:30"}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function showApp(){
  $("loginView").classList.add("hidden");$("appView").classList.remove("hidden");$("userBox").classList.remove("hidden");
  $("userEmail").textContent=session.user.email||"Đã đăng nhập";
  $("mealDate").value=localDate();$("filterDate").value=localDate();
  updateClock();setInterval(updateClock,1000);updateNotice();loadRows();
}
function updateClock(){$("clockBox").innerHTML=`${timeText()}<small>Giờ Việt Nam</small>`;$("todayLabel").textContent=localDate();$("summaryDate").textContent=$("filterDate").value}
function updateNotice(){
  const date=$("mealDate").value||localDate();
  let t=date===localDate()?"Đăng ký mới hôm nay chỉ được thực hiện trước 08:00.":"Bạn đang chọn ngày khác.";
  t+=` Đổi Đúng giờ/Ăn trễ: Trưa ${statusWindow("Trưa")}; Tối ${statusWindow("Tối")}.`;
  $("notice").textContent=t;
}
async function login(){
  $("loginError").textContent="";
 const {error}=await supabaseClient.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname}});
  if(error)$("loginError").textContent=error.message;
}
async function logout(){await supabaseClient.auth.signOut();location.reload()}

async function loadRows(){
  const date=$("filterDate").value||localDate(),meal=$("filterMeal").value;
 let q=supabaseClient.from("meal_registrations")
  if(meal)q=q.eq("meal",meal);
  const {data,error}=await q;
  if(error){$("registrationTable").innerHTML=`<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`;return}
  rows=data||[];renderRows();renderStats();
}
function renderRows(){
  if(!rows.length){$("registrationTable").innerHTML='<tr><td colspan="6" class="empty">Chưa có đăng ký</td></tr>';return}
  $("registrationTable").innerHTML=rows.map(r=>`<tr>
    <td><strong>${escapeHtml(r.name)}</strong></td><td>${escapeHtml(r.email)}</td>
    <td>${escapeHtml(r.meal_date)}</td><td>${r.meal==="Trưa"?"☀️":"🌙"} ${escapeHtml(r.meal)}</td>
    <td><span class="badge">${escapeHtml(r.status)}</span></td>
    <td>${new Date(r.created_at).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</td>
  </tr>`).join("");
}
function renderStats(){
  $("totalCount").textContent=rows.length;
  $("onTimeCount").textContent=rows.filter(x=>x.status==="Đúng giờ").length;
  $("lateCount").textContent=rows.filter(x=>x.status==="Ăn trễ").length;
  $("noEatCount").textContent=rows.filter(x=>x.status==="Không ăn").length;
  $("lunchCount").textContent=rows.filter(x=>x.meal==="Trưa").length;
  $("dinnerCount").textContent=rows.filter(x=>x.meal==="Tối").length;
  $("summaryDate").textContent=$("filterDate").value;
}

async function registerOrUpdate(){
  $("formMessage").textContent="";
  const date=$("mealDate").value;
  if(!date){$("formMessage").textContent="Hãy chọn ngày ăn.";return}
  if(date<localDate()){$("formMessage").textContent="Không thể đăng ký ngày đã qua.";return}

 const {data:existing,error:findError}=await supabaseClient.from("meal_registrations")
    .select("id,status").eq("user_id",session.user.id).eq("meal_date",date).eq("meal",selectedMeal).maybeSingle();
  if(findError){$("formMessage").textContent=findError.message;return}

  if(existing){
    if(selectedStatus==="Không ăn"){$("formMessage").textContent="Đã đăng ký rồi thì không thể đổi sang 'Không ăn'.";return}
    const currentMinutes = minutesNow();
    const deadline = selectedMeal==="Trưa" ? 10*60+30 : 17*60+30;
    if(date===localDate() && currentMinutes >= deadline){
      $("formMessage").textContent=`Đã quá giờ đổi trạng thái (${selectedMeal==="Trưa"?"10:30":"17:30"}).`;
      return;
    }
    const {error}=await supabaseClient.from("meal_registrations").update({status:selectedStatus}).eq("id",existing.id);
    $("formMessage").textContent=error?error.message:"Đã cập nhật trạng thái.";
    loadRows();return;
  }

  const name=session.user.user_metadata?.full_name||session.user.user_metadata?.name||session.user.email?.split("@")[0]||"Người dùng";
  const {error}=await supabaseClient.from("meal_registrations").insert({
    user_id:session.user.id,email:session.user.email,name,meal_date:date,meal:selectedMeal,status:selectedStatus
  });
  $("formMessage").textContent=error?error.message:"Đăng ký thành công!";
  if(!error){$("filterDate").value=date;loadRows()}
}
function selectMeal(btn){selectedMeal=btn.dataset.meal;document.querySelectorAll(".choice").forEach(x=>x.classList.toggle("active",x===btn));updateNotice()}
function selectStatus(btn){selectedStatus=btn.dataset.status;document.querySelectorAll(".status-choice").forEach(x=>x.classList.toggle("active",x===btn))}

$("googleLoginBtn").addEventListener("click",login);
$("logoutBtn").addEventListener("click",logout);
document.querySelectorAll(".choice").forEach(b=>b.addEventListener("click",()=>selectMeal(b)));
document.querySelectorAll(".status-choice").forEach(b=>b.addEventListener("click",()=>selectStatus(b)));
$("registerBtn").addEventListener("click",registerOrUpdate);
$("refreshBtn").addEventListener("click",loadRows);
$("filterDate").addEventListener("change",()=>{updateClock();loadRows()});
$("filterMeal").addEventListener("change",loadRows);
$("mealDate").addEventListener("change",updateNotice);

supabaseClient.auth.getSession().then(({data})=>{
  session=data.session;
  if(session) showApp();
});

supabaseClient.auth.onAuthStateChange((_event,newSession)=>{
  session=newSession;
  if(session) showApp();
});
