let currentUserIsAdmin = false;


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



auth.onAuthStateChanged(user => {
  if (user) {
    user.getIdTokenResult().then(idTokenResult => {
      const isAdmin = idTokenResult.claims.admin;

      // Show or hide admin buttons (edit, delete, toggle buttons)
      document.querySelectorAll(".admin-button").forEach(button => {
        button.style.display = isAdmin ? "inline-block" : "none";
      });

      // Show or hide the admin panel
      document.querySelectorAll(".adminPanel").forEach(panel => {
        panel.style.display = isAdmin ? "flex" : "none";
      });

      // Show or hide the status column in table rows
      document.querySelectorAll(".status-column").forEach(column => {
        column.style.display = isAdmin ? "table-cell" : "none";
      });

      // Show or hide the status <th> header
      const statusHeader = document.getElementById("status-header");
      if (statusHeader) {
        statusHeader.style.display = isAdmin ? "table-cell" : "none";
      }

      // Hide "Toggle Checked Out Orders" button if not admin
      const toggleCheckedOutOrdersBtn = document.getElementById("toggleCheckedOutOrdersBtn");
      if (toggleCheckedOutOrdersBtn) {
        toggleCheckedOutOrdersBtn.style.display = isAdmin ? "inline-block" : "none";
      }
    });
  }
});




function toggleMenu() {
  const menu = document.getElementById("navbarMenu");
  menu.classList.toggle("active");
}

// Function to start a new order
async function startNewOrder() {
  try {
    const querySnapshot = await db.collection('invoices').get();
    let lastInvoiceNumber = "00";

    if (!querySnapshot.empty) {
      const invoiceNumbers = querySnapshot.docs
        .map(doc => doc.id)
        .filter(id => /^\d+$/.test(id)) // Keep only numeric IDs
        .map(id => parseInt(id, 10));

      if (invoiceNumbers.length > 0) {
        invoiceNumbers.sort((a, b) => a - b);
        lastInvoiceNumber = invoiceNumbers[invoiceNumbers.length - 1];
      }
    }

    const newInvoiceNumber = String(parseInt(lastInvoiceNumber) + 1).padStart(2, '0');
    await db.collection('invoices').doc(newInvoiceNumber).set({
      grandTotal: 0,
      status: 'OPEN',
      items: [],
      createdTimestamp: firebase.firestore.FieldValue.serverTimestamp()
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
        return;
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
        <td class="status-column">
          <select class="status-dropdown admin-button" data-invoice="${invoiceNumber}">
            <option value="open" ${data.status === 'OPEN' ? 'selected' : ''}>OPEN</option>
            <option value="checked_out" ${data.status === 'checked_out' ? 'selected' : ''}>LUNAS</option>
          </select>
        </td>
        <td>
          <button  onclick="redirectToCart('${invoiceNumber}')">Edit</button>
          <button class="admin-button" onclick="checkoutInvoice('${invoiceNumber}')">Checkout</button>
          <button class="delete-btn admin-button" onclick="deleteInvoice('${invoiceNumber}')" style="display: ${deleteMode ? 'inline-block' : 'none'};">Delete</button>
        </td>
      `;
      ordersTableBody.appendChild(row);
    });

    // Check admin status and hide admin elements if user is not an admin
    auth.onAuthStateChanged(user => {
      if (user) {
        user.getIdTokenResult().then(idTokenResult => {
          if (!idTokenResult.claims.admin) {
            // Hide admin buttons
            document.querySelectorAll(".admin-button").forEach(button => {
              button.style.display = "none";
            });

            // Hide status column and header
            document.querySelectorAll(".status-column").forEach(column => {
              column.style.display = "none";
            });
            const statusHeader = document.querySelector("#status-header");
            if (statusHeader) {
              statusHeader.style.display = "none";
            }
          }
        });
      }
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

    const invoiceRef = db.collection('invoices').doc(invoiceNumber);
    const invoiceDoc = await invoiceRef.get();
    const invoiceData = invoiceDoc.data();

    if (!invoiceData || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      alert('The invoice is empty or invalid!');
      return;
    }

    const validItems = invoiceData.items.filter(item =>
      item.productName && item.price > 0 && item.qty > 0
    );

    if (validItems.length === 0) {
      alert('No valid items in the invoice to checkout!');
      await invoiceRef.delete();
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const salesRef = db.collection(currentDate).doc(invoiceNumber);
    const salesDoc = await salesRef.get();

    // If re-checkout, restore previous stock
    if (invoiceData.status === 'checked_out' && salesDoc.exists) {
      const oldItems = salesDoc.data().items || [];
      for (const item of oldItems) {
        const invRef = db.collection('Inventory').doc(item.productName);
        const invDoc = await invRef.get();
        if (invDoc.exists) {
          const currentStock = invDoc.data().Stock || 0;
          await invRef.update({
            Stock: currentStock + item.qty
          });
        }
      }
    }

    // Process each item - add to "no data" if not found, subtract stock if found
    for (const item of validItems) {
      const invRef = db.collection('Inventory').doc(item.productName);
      const invDoc = await invRef.get();

      if (!invDoc.exists) {
        // Add to "no data" collection
        await db.collection('no data').doc(item.productName).set({
          productName: item.productName,
          qty: item.qty,
          pricePerUnit: item.price || null,
          reason: 'Product not found in inventory during checkout',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Subtract from inventory
        const currentStock = invDoc.data().Stock || 0;
        await invRef.update({
          Stock: currentStock - item.qty
        });
      }
    }

    // Save sale to daily collection
    await salesRef.set({
      items: validItems,
      grandTotal: validItems.reduce((total, item) => total + (item.price * item.qty), 0),
      carType: invoiceData.carType || 'N/A',
      policeNumber: invoiceData.policeNumber || 'N/A',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update invoice status
    await invoiceRef.update({
      items: validItems,
      status: 'checked_out'
    });

    localStorage.setItem('currentInvoiceNumber', invoiceNumber);
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

// Function to auto-delete previous day checked out invoices
async function autoDeleteOldCheckedOutInvoices() {
  try {
    console.log('autoDeleteOldCheckedOutInvoices function triggered');

    const startOfYesterday = new Date();
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    console.log('Start of yesterday:', startOfYesterday);

    const endOfYesterday = new Date(startOfYesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    console.log('End of yesterday:', endOfYesterday);

    const querySnapshot = await db.collection('invoices')
      .where('status', '==', 'checked_out')
      .where('createdTimestamp', '>=', firebase.firestore.Timestamp.fromDate(startOfYesterday))
      .where('createdTimestamp', '<=', firebase.firestore.Timestamp.fromDate(endOfYesterday))
      .get();

    console.log('Invoices found:', querySnapshot.size);

    const batch = db.batch();
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log('Previous day checked out invoices successfully deleted.');
  } catch (error) {
    console.error('Error auto-deleting old checked out invoices:', error);
  }
}
// Function to load orders and add missing timestamps
async function loadOrders() {
  try {
    const querySnapshot = await db.collection('invoices').get();
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    ordersTableBody.innerHTML = '';

    querySnapshot.forEach(async (doc) => {
      const data = doc.data();
      const invoiceNumber = doc.id;

      // If createdTimestamp is missing, add it
      if (!data.createdTimestamp) {
        await db.collection('invoices').doc(invoiceNumber).update({
          createdTimestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      const grandTotal = data.grandTotal ? formatPrice(data.grandTotal) : 'N/A';
      const status = data.status === 'checked_out' ? 'LUNAS' : 'OPEN';

      if (!showCheckedOutOrders && data.status === 'checked_out') {
        return;
      }

      if (grandTotal === 'N/A' || !data.items || data.items.length === 0) {
        await deleteInvoice(invoiceNumber);
        return;
      }

      let productDetails = data.items ? data.items.map(item => `${item.productName} (Qty: ${item.qty}, Price: ${formatPrice(item.price)})`).join('<br>') : 'No items found';
      const carType = data.carType || 'N/A';
      const policeNumber = data.policeNumber || 'N/A';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${invoiceNumber}</td>
        <td>${carType}</td>
        <td>${policeNumber}</td>
        <td>${productDetails}</td>
        <td>${grandTotal}</td>
        <td class="status-column">
          <select class="status-dropdown admin-button" data-invoice="${invoiceNumber}">
            <option value="open" ${data.status === 'OPEN' ? 'selected' : ''}>OPEN</option>
            <option value="checked_out" ${data.status === 'checked_out' ? 'selected' : ''}>LUNAS</option>
          </select>
        </td>
        <td>
          <button onclick="redirectToCart('${invoiceNumber}')">Edit</button>
          <button class="admin-button" onclick="checkoutInvoice('${invoiceNumber}')">Checkout</button>
          <button class="delete-btn admin-button" onclick="deleteInvoice('${invoiceNumber}')" style="display: ${deleteMode ? 'inline-block' : 'none'};">Delete</button>
        </td>
      `;
      ordersTableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    alert('Failed to load orders. Please try again.');
  }
}

// Load orders on page load, autodeletes previous orders
document.addEventListener('DOMContentLoaded', () => {
  loadOrders();
  autoDeleteOldCheckedOutInvoices(); // Trigger the auto-delete function on page load
});


// Attach event listener for Add Bonds button
// Make sure your HTML has: <button id="addBonds">Add Bond</button>
document.getElementById('addBonds').addEventListener('click', startNewBond);

// Function to start a new Bond invoice
async function startNewBond() {
  try {
    const querySnapshot = await db.collection('invoices').get();
    let lastBondNumber = 0;

    if (!querySnapshot.empty) {
      const bondNumbers = querySnapshot.docs
        .map(doc => doc.id)
        .filter(id => id.startsWith('BON '))
        .map(id => parseInt(id.replace('BON ', '')))
        .filter(num => !isNaN(num));

      if (bondNumbers.length > 0) {
        bondNumbers.sort((a, b) => a - b);
        lastBondNumber = bondNumbers[bondNumbers.length - 1];
      }
    }

    const newBondNumber = lastBondNumber + 1;
    const newInvoiceId = `BON ${newBondNumber}`;

    await db.collection('invoices').doc(newInvoiceId).set({
      grandTotal: 0,
      status: 'OPEN',
      items: [],
      createdTimestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    localStorage.setItem('currentInvoiceNumber', newInvoiceId);
    window.location.href = 'kuitansi.html';

  } catch (error) {
    console.error('Error starting new bond:', error);
    alert('Failed to start a new bond. Please try again.');
  }
}
