const invoiceList = document.querySelector('#invoice-list tbody');
const sumGrandTotalElement = document.getElementById('sum-grand-total');
let sumGrandTotal = 0;

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
    invoiceNumberCell.textContent = doc.id;  // Use document ID as invoice number

    // Set items (assumes items is an array)
    itemsCell.innerHTML = doc.data().items.map(item => 
        `${item.productName} (${item.qty} x ${formatNumber(item.price)})`).join('<br>');

    // Set grand total
    const grandTotal = doc.data().grandTotal;
    grandTotalCell.textContent = `Total: ${formatNumber(grandTotal)}`;

    // Update sum of grand totals
    sumGrandTotal += grandTotal;
    sumGrandTotalElement.textContent = formatNumber(sumGrandTotal);

    // Create and append delete button
    let deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete';
    deleteButton.addEventListener('click', () => {
        db.collection('invoices').doc(doc.id).delete().then(() => {
            row.remove(); // Remove row from table after deletion
            // Update sum of grand totals after deletion
            sumGrandTotal -= grandTotal;
            sumGrandTotalElement.textContent = formatNumber(sumGrandTotal);
        });
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

// Load orders on page load and sort by invoice number
function loadOrders() {
    invoiceList.innerHTML = ''; // Clear current list
    sumGrandTotal = 0; // Reset sum of grand totals

    // Query to get all invoices and order them by document ID (invoice number)
    db.collection('invoices').orderBy(firebase.firestore.FieldPath.documentId()).get()
    .then(snapshot => {
        if (snapshot.empty) {
            console.log('No matching documents.');
            return; // Exit if no documents found
        }
        snapshot.docs.forEach(doc => {
            renderInvoice(doc);
        });
    })
    .catch(error => {
        console.error('Error loading orders: ', error);
    });
}

// Load orders when the document is ready
document.addEventListener('DOMContentLoaded', loadOrders);


// Function to move invoices to a new collection named by the current date
async function archiveInvoices() {
  if (!confirm('Are you sure you want to archive all invoices? This action is irreversible.')) return;

  const dateKey = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
  const archiveCollectionName = dateKey;

  try {
    const querySnapshot = await db.collection('invoices').get();
    const batch = db.batch(); // Use Firestore batch for efficient writes

    if (querySnapshot.empty) {
      alert('No invoices to archive.');
      return;
    }

    // Iterate over all invoices and copy them to the new collection
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const invoiceRef = db.collection(archiveCollectionName).doc(doc.id); // Set same document ID in new collection
      batch.set(invoiceRef, data);
    });

    // Commit the batch to copy all documents
    await batch.commit();
    console.log(`Invoices successfully archived to collection "${archiveCollectionName}"`);

    // Delete all invoices from the original 'invoices' collection
    const deleteBatch = db.batch();
    querySnapshot.forEach((doc) => {
      deleteBatch.delete(db.collection('invoices').doc(doc.id));
    });

    // Commit the delete batch
    await deleteBatch.commit();
    console.log('Original invoices successfully deleted.');

    alert(`Invoices archived to "${archiveCollectionName}" and original invoices deleted.`);
    loadOrders(); // Reload the orders table
  } catch (error) {
    console.error('Error archiving invoices:', error);
    alert('Failed to archive invoices. Please try again.');
  }
}

// Attach event listener to the archive button
document.getElementById('archiveInvoices').addEventListener('click', archiveInvoices);
