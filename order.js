const invoiceList = document.querySelector('#invoice-list tbody');
const form = document.querySelector('#add-invoice-form');

// Function to format numbers with commas
function formatNumber(number) {
    return number.toLocaleString();
}

// Create element & render invoice
function renderInvoice(doc) {
    let row = document.createElement('tr');
    row.setAttribute('data-id', doc.id);

    // Create cells
    let invoiceNumberCell = document.createElement('td');
    let itemsCell = document.createElement('td');
    let grandTotalCell = document.createElement('td');
    let actionsCell = document.createElement('td');

    // Set invoice number
    invoiceNumberCell.textContent = doc.id;
    invoiceNumberCell.className = 'invoice-number';

    // Set items
    itemsCell.innerHTML = doc.data().items.map(item => 
        `${item.productName} (${item.qty} x ${formatNumber(item.price)})`).join('<br>');
    itemsCell.className = 'item-name';

    // Set grand total
    grandTotalCell.textContent = `Total: ${formatNumber(doc.data().grandTotal)}`;
    grandTotalCell.className = 'item-details';

    // Create and append delete button
    let deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete';
    deleteButton.addEventListener('click', () => {
        db.collection('invoices').doc(doc.id).delete();
    });
    actionsCell.appendChild(deleteButton);

    // Append cells to row
    row.appendChild(invoiceNumberCell);
    row.appendChild(itemsCell);
    row.appendChild(grandTotalCell);
    row.appendChild(actionsCell);

    // Append row to table body
    invoiceList.appendChild(row);
}

// Getting data
db.collection('invoices').orderBy('grandTotal', 'desc').get().then(snapshot => {
    snapshot.docs.forEach(doc => {
        renderInvoice(doc);
    });
});

// Saving data
form.addEventListener('submit', function (e) {
    e.preventDefault();
    const items = JSON.parse(document.querySelector('#items-input').value);
    const grandTotal = parseFloat(document.querySelector('#grandTotal-input').value);

    db.collection('invoices').add({
        items: items,
        grandTotal: grandTotal
    }).then(() => {
        // Clear form fields
        document.querySelector('#items-input').value = '';
        document.querySelector('#grandTotal-input').value = '';
    }).catch(error => {
        console.error('Error adding document: ', error);
    });
});

// Real-time listener
db.collection('invoices').orderBy('grandTotal', 'desc').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
            renderInvoice(change.doc);
        } else if (change.type === 'removed') {
            let row = invoiceList.querySelector(`[data-id="${change.doc.id}"]`);
            if (row) {
                invoiceList.removeChild(row);
            }
        }
    });
});

// Function to toggle the mobile menu
function toggleMenu() {
    const menu = document.getElementById('navbarMenu');
    menu.classList.toggle('show');
}

// Create element & render invoice
function renderInvoice(doc) {
    let row = document.createElement('tr');
    row.setAttribute('data-id', doc.id);

    // Create cells
    let invoiceNumberCell = document.createElement('td');
    let itemsCell = document.createElement('td');
    let grandTotalCell = document.createElement('td');
    let actionsCell = document.createElement('td');

    // Set invoice number
    invoiceNumberCell.textContent = doc.id;
    invoiceNumberCell.className = 'invoice-number';

    // Set items
    itemsCell.innerHTML = doc.data().items.map(item => 
        `${item.productName} (${item.qty} x ${formatNumber(item.price)})`).join('<br>');
    itemsCell.className = 'item-name';

    // Set grand total
    grandTotalCell.textContent = `Total: ${formatNumber(doc.data().grandTotal)}`;
    grandTotalCell.className = 'item-details';

    // Create and append delete button
    let deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete';
    deleteButton.addEventListener('click', () => {
        // Show confirmation dialog
        if (confirm('Are you sure you want to delete this invoice?')) {
            db.collection('invoices').doc(doc.id).delete().then(() => {
                console.log('Document successfully deleted!');
            }).catch(error => {
                console.error('Error removing document: ', error);
            });
        }
    });
    actionsCell.appendChild(deleteButton);

    // Append cells to row
    row.appendChild(invoiceNumberCell);
    row.appendChild(itemsCell);
    row.appendChild(grandTotalCell);
    row.appendChild(actionsCell);

    // Append row to table body
    invoiceList.appendChild(row);
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
        const inventoryDocRef = db.collection('Inventory').doc(item.name); // Assuming item.name matches the product name in inventory
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
  