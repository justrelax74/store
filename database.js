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
db.collection('invoices').orderBy('grandTotal').get().then(snapshot => {
    snapshot.docs.forEach(doc => {
        renderInvoice(doc);
    });
});

// Saving data
form.addEventListener('submit', (e) => {
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
db.collection('invoices').orderBy('grandTotal').onSnapshot(snapshot => {
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
