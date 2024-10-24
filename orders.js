// Check if Firebase is already initialized
if (!firebase.apps.length) {
  // Initialize Firebase
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

// Format price with currency (IDR) and no decimals
function formatPrice(price) {
  return new Intl.NumberFormat('en-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

// Function to load orders from Firestore and render them in the table
async function loadOrders() {
  try {
    const querySnapshot = await db.collection('invoices').get();
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    ordersTableBody.innerHTML = ''; // Clear existing rows

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const invoiceNumber = doc.id;
      const grandTotal = data.grandTotal ? formatPrice(data.grandTotal) : 'N/A';
      const status = data.status === 'checked_out' ? 'Checked Out' : 'Open';

      let productDetails = '';
      if (data.items) {
        productDetails = data.items.map(item => {
          return `${item.productName} (Qty: ${item.qty}, Price: ${formatPrice(item.price)})`;
        }).join('<br>');
      } else {
        productDetails = 'No items found';
      }

      // Create table row for each order/invoice
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${invoiceNumber}</td>
        <td>${productDetails}</td>
        <td>${grandTotal}</td>
        <td>
          <select class="status-dropdown" data-invoice="${invoiceNumber}">
            <option value="open" ${data.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="checked_out" ${data.status === 'checked_out' ? 'selected' : ''}>Checked Out</option>
          </select>
        </td>
        <td>
          <button onclick="checkoutInvoice('${invoiceNumber}')">Checkout</button>
          <button class="delete-btn" onclick="deleteInvoice('${invoiceNumber}')">Delete</button>
        </td>
      `;
      ordersTableBody.appendChild(row);
    });

    // Attach event listeners for status changes
    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
      dropdown.addEventListener('change', updateOrderStatus);
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    alert('Failed to load orders. Please try again.');
  }
}

// Function to update the order status in Firestore
async function updateOrderStatus(event) {
  const invoiceNumber = event.target.getAttribute('data-invoice');
  const newStatus = event.target.value;

  try {
    await db.collection('invoices').doc(invoiceNumber).update({ status: newStatus });
    console.log(`Order ${invoiceNumber} status updated to ${newStatus}`);
  } catch (error) {
    console.error(`Error updating order ${invoiceNumber}:`, error);
    alert('Failed to update order status. Please try again.');
  }
}

// Function to checkout an invoice (and update status to 'checked_out')
async function checkoutInvoice(invoiceNumber) {
  try {
    // Get the invoice data to update stock
    const invoiceDoc = await db.collection('invoices').doc(invoiceNumber).get();
    const invoiceData = invoiceDoc.data();

    // Update stock for each item in the invoice
    const stockUpdatePromises = invoiceData.items.map(async (item) => {
      const inventoryDocRef = db.collection('Inventory').doc(item.productName); // Assuming item.name matches the product name in inventory
      await inventoryDocRef.update({
        Stock: firebase.firestore.FieldValue.increment(-item.qty) // Decrease stock by the quantity in the invoice
      });
    });

    // Wait for all stock updates to complete
    await Promise.all(stockUpdatePromises);

    // Update the status to 'checked_out' in Firestore
    await db.collection('invoices').doc(invoiceNumber).update({
      status: 'checked_out'
    });

    console.log(`Order ${invoiceNumber} status updated to 'checked_out'`);

    // Save the invoice number in localStorage for reference
    localStorage.setItem('currentInvoiceNumber', invoiceNumber);

    // Redirect to checkout page
    window.location.href = 'checkout.html';
  } catch (error) {
    console.error('Error during checkout:', error);
    alert('Checkout failed. Please try again.');
  }
}

// Function to delete an invoice
async function deleteInvoice(invoiceNumber) {
  // If delete mode is on, delete without confirmation
  if (deleteMode) {
    try {
      await db.collection('invoices').doc(invoiceNumber).delete();
      loadOrders(); // Refresh the orders list after deletion
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice. Please try again.');
    }
  } else {
    // If delete mode is off, ask for confirmation
    if (confirm("Are you sure you want to delete this order?")) {
      try {
        await db.collection('invoices').doc(invoiceNumber).delete();
        loadOrders(); // Refresh the orders list after deletion
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice. Please try again.');
      }
    }
  }
}


// Toggle Delete Mode (Show/Hide Delete Buttons)
let deleteMode = false;
document.getElementById('toggleDeleteMode').addEventListener('click', function() {
  deleteMode = !deleteMode;  // Toggle delete mode
  document.body.classList.toggle('delete-mode', deleteMode);  // Toggle the delete-mode class
  this.textContent = `Delete Mode: ${deleteMode ? 'ON' : 'OFF'}`;  // Update button text
});

// Load orders on page load
document.addEventListener('DOMContentLoaded', loadOrders);
