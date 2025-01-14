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
let showCheckedOutOrders = false; // Initialize showCheckedOutOrders as false by default

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

      let productDetails = data.items ? 
        data.items.map(item => `${item.productName} (Qty: ${item.qty}, Price: ${formatPrice(item.price)})`).join('<br>') 
        : 'No items found';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${invoiceNumber}</td>
        <td>${productDetails}</td>
        <td>${grandTotal}</td>
        <td>
          <select class="status-dropdown" data-invoice="${invoiceNumber}">
            <option value="open" ${data.status === 'OPEN' ? 'selected' : ''}>OPEN</option>
            <option value="checked_out" ${data.status === 'checked_out' ? 'selected' : ''}>LUNAS</option>
          </select>
        </td>
        <td>
          <button onclick="redirectToCart('${invoiceNumber}')">Edit</button>
          <button onclick="checkoutInvoice('${invoiceNumber}')">Checkout</button>
          <button class="delete-btn" onclick="deleteInvoice('${invoiceNumber}')" style="display: ${deleteMode ? 'inline-block' : 'none'};">Delete</button>
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

// Toggle Delete Mode
document.getElementById('toggleDeleteMode').addEventListener('click', function () {
  deleteMode = !deleteMode;
  document.body.classList.toggle('delete-mode', deleteMode);
  this.textContent = `Delete Mode: ${deleteMode ? 'ON' : 'OFF'}`;
  
  const contentContainer = document.querySelector('.content');
  let deleteAllButton = document.getElementById('deleteAllButton');

  if (deleteMode) {
    // If delete mode is ON and the button doesn't exist, create it
    if (!deleteAllButton) {
      deleteAllButton = document.createElement('button');
      deleteAllButton.id = 'deleteAllButton';
      deleteAllButton.textContent = 'Delete All';
      deleteAllButton.addEventListener('click', function () {
        if (confirm('Are you sure you want to delete all orders? This action cannot be undone.')) {
          deleteAllOrders(); // Call the function to delete all orders
        }
      });
      contentContainer.appendChild(deleteAllButton);
    }
    deleteAllButton.style.display = 'inline-block'; // Ensure it's visible
  } else {
    // If delete mode is OFF, hide the button
    if (deleteAllButton) {
      deleteAllButton.style.display = 'none';
    }
  }

  loadOrders(); // Reload orders to show/hide delete buttons based on delete mode
});

// Function to delete all orders (example placeholder)
function deleteAllOrders() {
  console.log('All orders have been deleted.');
  // Add your deletion logic here
  loadOrders();
}

// Toggle Show/Hide Checked Out Orders
document.getElementById('toggleCheckedOutOrdersBtn').addEventListener('click', function() {
  showCheckedOutOrders = !showCheckedOutOrders;
  this.textContent = `Status order: ${showCheckedOutOrders ? 'OPEN/LUNAS' : 'OPEN'}`;
  loadOrders();  // Reload orders to show/hide checked-out orders based on toggle
});

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

// Function to checkout an invoice
async function checkoutInvoice(invoiceNumber) {
  try {
    if (!invoiceNumber) {
      alert('No invoice number is available!');
      return;
    }

    const invoiceDoc = await db.collection('invoices').doc(invoiceNumber).get();
    const invoiceData = invoiceDoc.data();

    if (!invoiceData || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      alert('The invoice is empty or invalid!');
      return;
    }

    // Filter out invalid items from the invoice
    const validItems = invoiceData.items.filter(item => {
      return item.productName && item.price > 0 && item.qty > 0;
    });

    if (validItems.length === 0) {
      alert('No valid items in the invoice to checkout!');
      await db.collection('invoices').doc(invoiceNumber).delete(); // Delete the empty invoice
      return;
    }

    // Update the invoice with valid items before proceeding
    await db.collection('invoices').doc(invoiceNumber).update({
      items: validItems,
    });

    // Flag to check if there's any product not found in the inventory
    let productNotFound = false;

    // Update stock for each item in the valid items list
    for (const item of validItems) {
      const docRef = db.collection('Inventory').doc(item.productName);
      const doc = await docRef.get();

      if (doc.exists) {
        const currentStock = doc.data().Stock || 0;

        // Update stock in Firestore (allow negative stock)
        await docRef.update({
          Stock: currentStock - item.qty,
        });
      } else {
        // Product not found, add it to the "no data" collection
        const noDataRef = db.collection('no data').doc(item.productName);
        await noDataRef.set({
          productName: item.productName,
          qty: item.qty,
          pricePerUnit: item.price || null,
          reason: 'Product not found in inventory during checkout',
        });
        productNotFound = true;
      }
    }

    // Get the current date as yyyy-mm-dd for the sales collection
    const currentDate = new Date().toISOString().split('T')[0];

    // Copy the invoice into the date-named sales collection
    const salesRef = db.collection(currentDate).doc(invoiceNumber);
    await salesRef.set({
      items: validItems,
      grandTotal: validItems.reduce((total, item) => total + (item.price * item.qty), 0),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Mark the invoice as checked out in the invoices collection
    await db.collection('invoices').doc(invoiceNumber).update({
      status: 'checked_out',
    });

    // Preserve localStorage for checkout.html to fetch data for printing
    localStorage.setItem('currentInvoiceNumber', invoiceNumber);

    // Redirect to checkout.html
    window.location.href = 'checkout.html';
  } catch (error) {
    console.error('Error during checkout:', error);
    alert(`Checkout failed! ${error.message}`);
  }
}


// Function to delete an invoice
async function deleteInvoice(invoiceNumber) {
  try {
    await db.collection('invoices').doc(invoiceNumber).delete();
    loadOrders();
  } catch (error) {
    console.error('Error deleting invoice:', error);
    alert('Failed to delete invoice. Please try again.');
  }
}

// Function to redirect to cart with selected invoice number
function redirectToCart(invoiceNumber) {
  localStorage.setItem('currentInvoiceNumber', invoiceNumber);
  window.location.href = 'kuitansi.html';
}

// Load orders on page load
document.addEventListener('DOMContentLoaded', loadOrders);
