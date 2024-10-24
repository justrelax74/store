<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mega Mas Motor | Order</title>
    <link rel="icon" href="favicon.ico" type="image/x-icon">
    <link rel="stylesheet" href="order.css">
</head>
<body>
<!-- Navigation Bar -->
<nav class="navbar">
    <div class="navbar-container">
        <a href="index.html" class="navbar-logo">
            <h1>MEGA MAS MOTOR</h1>
        </a>
        <button class="navbar-toggle" onclick="toggleMenu()">
            &#9776; <!-- Hamburger Icon -->
        </button>
        <ul class="navbar-menu" id="navbarMenu">
            <li class="navbar-item"><a href="kuitansi.html">Buat Kuitansi</a></li>
            <li class="navbar-item"><a href="inventory.html">Inventory</a></li>
            <li class="navbar-item"><a href="order.html">Order</a></li>
            <li class="navbar-item"><a href="sales.html">Sales</a></li>
        </ul>
    </div>
</nav>

<h1>Order</h1>
<div class="content">
    <div id="invoice-list-container">
        <table id="invoice-list">
            <thead>
                <tr>
                    <th data-field="invoiceNumber">Invoice Numbers</th>
                    <th data-field="items">Items</th>
                    <th data-field="grandTotal">Grand Total</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <!-- Table rows will be dynamically added here -->
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2">Total sales:</td>
                    <td id="sum-grand-total">0</td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>

<!-- Firebase SDK and Initialization -->
<script src="https://www.gstatic.com/firebasejs/9.9.3/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.9.3/firebase-analytics-compat.js"></script>
<script>
    // Your web app's Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyANCk_iM4XtSX0VW6iETK-tJdWHGAWMbS0",
        authDomain: "megamasmotor-4008c.firebaseapp.com",
        projectId: "megamasmotor-4008c",
        storageBucket: "megamasmotor-4008c.appspot.com",
        messagingSenderId: "874673615212",
        appId: "1:874673615212:web:7f0ecdeee47fed60aa0349",
        measurementId: "G-LF6NB7ZKLE"
    };

    // Initialize Firebase
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const analytics = firebase.analytics();
    db.settings({ timestampsInSnapshots: true });
</script>
<script src="order.js"></script>

</body>
</html>
