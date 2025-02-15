// Check if Firebase is already initialized
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "AIzaSyANCk_iM4XtSX0VW6iETK-tJdWHGAWMbS0",
    authDomain: "megamasmotor-4008c.firebaseapp.com",
    projectId: "megamasmotor-4008c",
    storageBucket: "megamasmotor-4008c.appspot.com",
    messagingSenderId: "874673615212",
    appId: "1:874673615212:web:7f0ecdeee47fed60aa0349",
    measurementId: "G-LF6NB7ZKLE"
  };
  firebase.initializeApp(firebaseConfig);
}


const db = firebase.firestore();  // Initialize Firestore after Firebase is initialized
let deleteMode = false; // Initialize delete mode as false by default
let showCheckedOutOrders = false; // Initialize showCheckedOutOrders as false by defaults


// Function to start a new order
async function startNewOrder() {
  try {
    const querySnapshot = await db.collection('invoices').get();
    let lastInvoiceNumber = "00";

    if (!querySnapshot.empty) {
      const invoiceNumbers = querySnapshot.docs.map(doc => doc.id);
      invoiceNumbers.sort((a, b) => parseInt(a) - parseInt(b));
      lastInvoiceNumber = invoiceNumbers[invoiceNumbers.length - 1];
    }

    const newInvoiceNumber = String(parseInt(lastInvoiceNumber) + 1).padStart(2, '0');
    await db.collection('invoices').doc(newInvoiceNumber).set({
      grandTotal: 0,
      status: 'OPEN',
      items: []
    });

    localStorage.setItem('currentInvoiceNumber', newInvoiceNumber);
    window.location.href = 'kuitansi.html';
  } catch (error) {
    console.error('Error starting new order:', error);
    alert('Failed to start a new order. Please try again.');
  }
}


function toggleMenu() {
  const menu = document.getElementById("navbarMenu");
  menu.classList.toggle("active");
}

// Attach the function to the "Start New Order" button click event
document.getElementById('startNewOrderBtn').addEventListener('click', startNewOrder);

// Function to load orders from Firestore and render them in the table
async function loadOrders() {
  try {
    const querySnapshot = await db.collection('invoices').get();
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    ordersTableBody.innerHTML = '';

    querySnapshot.forEach(async (doc) => {
      const data = doc.data();
      const invoiceNumber = doc.id;
      const grandTotal = data.grandTotal ? formatPrice(data.grandTotal) : 'N/A';
      const status = data.status === 'checked_out' ? 'LUNAS' : 'OPEN';
    
      // Skip rendering checked-out orders if showCheckedOutOrders is false
      if (!showCheckedOutOrders && data.status === 'checked_out') {
        return;
      }
    
      // Auto delete invoice if grand total is 'N/A' and has no content
      if (grandTotal === 'N/A' || !data.items || data.items.length === 0) {
        await deleteInvoice(invoiceNumber);
        return; // Skip further rendering of this order
      }
    
      let productDetails = data.items 
        ? data.items.map(item => `${item.productName} (Qty: ${item.qty}, Price: ${formatPrice(item.price)})`).join('<br>') 
        : 'No items found';
    
      const carType = data.carType || 'N/A';
      const policeNumber = data.policeNumber || 'N/A';
    
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${invoiceNumber}</td>
        <td>${carType}</td>
        <td>${policeNumber}</td>
        <td>${productDetails}</td>
        <td>${grandTotal}</td>
        <td>
         
        </td>
        <td>
          <button onclick="redirectToCart('${invoiceNumber}')">Edit</button>
       
        </td>
      `;
      ordersTableBody.appendChild(row);
    });
    

    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
      dropdown.addEventListener('change', updateOrderStatus);
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    alert('Failed to load orders. Please try again.');
  }
}






// Format price with currency (IDR) and no decimals
function formatPrice(price) {
  return new Intl.NumberFormat('en-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

// Function to update the order status in Firestore
async function updateOrderStatus(event) {
  const invoiceNumber = event.target.getAttribute('data-invoice');
  const newStatus = event.target.value;
  try {
    await db.collection('invoices').doc(invoiceNumber).update({ status: newStatus });
  } catch (error) {
    console.error(`Error updating order ${invoiceNumber}:`, error);
    alert('Failed to update order status. Please try again.');
  }
}







// Function to redirect to cart with selected invoice number
function redirectToCart(invoiceNumber) {
  localStorage.setItem('currentInvoiceNumber', invoiceNumber);
  window.location.href = 'kuitansi.html';
}

// Load orders on page load
document.addEventListener('DOMContentLoaded', loadOrders);
