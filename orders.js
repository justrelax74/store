<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order</title>
  <link rel="stylesheet" href="orders.css"> 
</head>
<body>
  <nav class="navbar">
    <div class="navbar-container">
        <a href="orderhp.html" class="navbar-logo">
            <h1>MEGA MAS MOTOR</h1>  <!-- This link will no longer look like a hyperlink -->
        </a>
        <button class="navbar-toggle" onclick="toggleMenu()">
            &#9776; <!-- Hamburger Icon -->
        </button>
        <ul class="navbar-menu" id="navbarMenu">
          <li class="navbar-item"><a href="kuitansi.html">Buat Kuitansi</a></li>
            <li class="navbar-item"><a href="inventory.html">Inventory</a></li>
            <li class="navbar-item"><a href="orders.html">Order</a></li>

        </ul>
    </div>
  </nav>

  <h1>Order</h1>

  <div class="content">
      <!-- Start New Order Button -->
  <button id="startNewOrderBtn">(+) Tambah order</button>
  <span id="customerNumber"></span>
  

  

  <table id="ordersTable">
    <thead>
      <tr>
        <th>Nomor order</th>
        <th>Tipe Mobil</th>
        <th>Nomor Polisi</th>
        <th>Produk</th>
        <th>Grand Total</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      <!-- Orders will be dynamically added here -->
    </tbody>
  </table>
</div>

  <!-- Load Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/8.6.8/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/8.6.8/firebase-firestore.js"></script>
  <script src="orders.js"></script>
</body>
</>
