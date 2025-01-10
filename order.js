const invoiceList = document.querySelector('#invoice-list tbody');
const sumGrandTotalElement = document.getElementById('sum-grand-total');
const transferOrdersButton = document.getElementById('transfer-orders-button');
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

// Transfer orders to a new collection
function transferOrders() {
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    const newCollectionRef = db.collection(currentDate);

    // Fetch all invoices and transfer to the new collection
    db.collection('invoices').get().then(snapshot => {
        if (!snapshot.empty) {
            snapshot.docs.forEach(doc => {
                newCollectionRef.doc(doc.id).set(doc.data()).then(() => {
                    // Once the data is transferred, delete from the invoices collection
                    db.collection('invoices').doc(doc.id).delete();
                }).catch(error => {
                    console.error('Error transferring invoice: ', error);
                });
            });
        }
    }).then(() => {
        alert('Orders transferred successfully.');
        loadOrders(); // Refresh the list after transfer
    }).catch(error => {
        console.error('Error transferring orders: ', error);
    });
}

// Load orders when the document is ready
document.addEventListener('DOMContentLoaded', loadOrders);

// Add event listener to transfer button
transferOrdersButton.addEventListener('click', transferOrders);
