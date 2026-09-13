<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đăng ký suất cơm</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>ĐĂNG KÝ SUẤT CƠM</h1>
    </header>

    <main class="main-content">
      <!-- FORM ĐĂNG KÝ -->
      <section class="card form-card">
        <form id="mealForm">
          <input type="hidden" id="name" name="name">
          <input type="hidden" id="selectedDate" name="selectedDate">

          <!-- Chọn Thứ trong tuần -->
          <div class="field">
            <label class="label">Chọn ngày ăn (Tuần này)</label>
            <div class="week-selector" id="weekSelector"></div>
          </div>

          <!-- Buổi ăn -->
          <div class="field">
            <label class="label">Buổi ăn</label>
            <div class="toggle-group" id="mealTypeGroup">
              <button type="button" class="btn-toggle active" data-value="Trưa">☀️ Trưa</button>
              <button type="button" class="btn-toggle" data-value="Tối">🌙 Tối</button>
            </div>
            <input type="hidden" id="mealType" value="Trưa">
          </div>

          <!-- Thời gian ăn -->
          <div class="field">
            <label class="label">Thời gian</label>
            <div class="toggle-group" id="mealTimeGroup">
              <button type="button" class="btn-toggle active" data-value="Đúng giờ">⏰ Đúng giờ</button>
              <button type="button" class="btn-toggle" data-value="Ăn trễ">⌛ Ăn trễ</button>
            </div>
            <input type="hidden" id="mealTime" value="Đúng giờ">
          </div>

          <button type="submit" id="btnSubmit" class="btn-primary">+ Đăng ký ngay</button>
          <div id="formMessage" class="message"></div>
        </form>
      </section>

      <!-- DANH SÁCH ĐĂNG KÝ -->
      <section class="card list-card">
        <div class="list-header">
          <h2>Danh sách đăng ký</h2>
          <button id="btnRefresh" class="btn-secondary">↺ Làm mới</button>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-num" id="statTotal">0</span>
            <span class="stat-label">Tổng suất</span>
          </div>
          <div class="stat-box">
            <span class="stat-num" id="statLunch">0</span>
            <span class="stat-label">Trưa</span>
          </div>
          <div class="stat-box">
            <span class="stat-num" id="statDinner">0</span>
            <span class="stat-label">Tối</span>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tên</th>
                <th>Ngày</th>
                <th>Buổi</th>
                <th>Giờ</th>
              </tr>
            </thead>
            <tbody id="mealTableBody">
              <tr><td colspan="4" class="text-center">Đang tải...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
  <script src="app.js"></script>
</body>
</html>
