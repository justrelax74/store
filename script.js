let grandTotal = 0;
let items = [];
let selectedItemIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    setDate();
    fetchInvoiceNumbers(); // Fetch existing invoice numbers on load
});

function setDate() {
    const now = new Date();

    const optionsDate = { year: 'numeric', month: 'short', day: '2-digit' };
    const formattedDate = now.toLocaleDateString('id-ID', optionsDate);

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    const fullFormattedDate = `${formattedDate}, ${formattedTime}`;
    document.getElementById('invoiceDate').textContent = fullFormattedDate;
}


function formatNumber(number) {
    return number.toLocaleString('id-ID');
}

function fetchInvoiceNumbers() {
    const datalist = document.getElementById('invoiceNumbers');
    db.collection('invoices').get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const option = document.createElement('option');
            option.value = doc.id;
            datalist.appendChild(option);
        });
    }).catch((error) => {
        console.error("Error fetching invoice numbers: ", error);
    });
}

function loadInvoiceDetails() {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    if (invoiceNumber) {
        db.collection('invoices').doc(invoiceNumber).get().then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                items = data.items || [];
                grandTotal = data.grandTotal || 0;

                // Verify if items and productName are correctly retrieved
                console.log(items);

                updateInvoiceItems();
                document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
     
            } else {
                alert('Invoice not found.');
            }
        }).catch((error) => {
            console.error("Error fetching invoice details: ", error);
        });
    } else {
        alert('Please enter an invoice number.');
    }
}

function saveEditedItem() {
    const productName = document.getElementById('productName').value.trim();
    const qty = parseInt(document.getElementById('qty').value, 10);
    const price = parseFloat(document.getElementById('price').value);
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();

    if (productName && !isNaN(qty) && !isNaN(price) && selectedItemIndex >= 0) {
        const item = items[selectedItemIndex];
        const totalPrice = qty * price;
        grandTotal += totalPrice - item.totalPrice; // Update grandTotal

        // Remove the item being edited
        items.splice(selectedItemIndex, 1);

        // Create a new item object with updated details
        const updatedItem = {
            productName: productName.toUpperCase(),
            qty: qty,
            price: price,
            totalPrice: totalPrice
        };

        // Add the updated item back to the items array
        items.push(updatedItem);

        // Update display and Firestore
        updateInvoiceItems();
        document.getElementById('grandTotal').textContent = formatNumber(grandTotal);

        setDate();

        document.getElementById('productName').value = '';
        document.getElementById('qty').value = '';
        document.getElementById('price').value = '';
        selectedItemIndex = -1; // Reset index

        // Save to Firestore
        db.collection('invoices').doc(invoiceNumber).set({
            items: items,
            grandTotal: grandTotal
        }).then(() => {
            console.log("Invoice updated successfully!");
        }).catch((error) => {
            console.error("Error updating invoice: ", error);
        });
    } else {
        alert('Please fill out all fields with valid values.');
    }
}

function updateInvoiceItems() {
    const invoiceItems = document.getElementById('invoiceItems');
    invoiceItems.innerHTML = ''; // Clear existing items

    items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.qty}</td>
            <td>${item.productName}</td>
            <td class="total-price">${formatNumber(item.totalPrice)}</td>
            <td><button onclick="editItem(${index})">Edit</button></td>
            <td><button onclick="deleteItem(${index})">Delete</button></td>
        `;
        invoiceItems.appendChild(row);
    });
}


function printInvoice() {
    window.print();
}

function editItem(index) {
    const item = items[index];
    items.splice(index, 1); // Remove the item from the array
    updateInvoiceItems(); // Update display to remove the item

    document.getElementById('product').value = item.productName;
    document.getElementById('qty').value = item.qty;
    document.getElementById('price').value = item.price;

    selectedItemIndex = index; // Set selectedItemIndex for update
    isUpdating = true; // Set flag to true as we're editing an item

    grandTotal -= item.totalPrice; // Update grandTotal
    document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
}
function deleteItem(index) {
    const item = items[index];
    grandTotal -= item.totalPrice;

    items.splice(index, 1);
    updateInvoiceItems();
    document.getElementById('grandTotal').textContent = formatNumber(grandTotal);

    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    if (invoiceNumber) {
        // Save to Firestore
        db.collection('invoices').doc(invoiceNumber).set({
            items: items,
            grandTotal: grandTotal
        }).then(() => {
            console.log("Invoice updated successfully!");
        }).catch((error) => {
            console.error("Error updating invoice: ", error);
        });
    }
}




async function addItem() {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    const productName = document.getElementById('product').value.trim();
    const qty = parseInt(document.getElementById('qty').value, 10);
    const price = parseFloat(document.getElementById('price').value);

    if (!invoiceNumber) {
        alert('Please enter an invoice number.');
        return;
    }

    if (!productName || isNaN(qty) || isNaN(price)) {
        alert('Please fill out all fields with valid values.');
        return;
    }

    const invoiceDocRef = db.collection('invoices').doc(invoiceNumber);
    const invoiceDoc = await invoiceDocRef.get();

    let invoiceData;
    if (invoiceDoc.exists) {
        invoiceData = invoiceDoc.data();
    } else {
        invoiceData = {
            date: new Date().toLocaleDateString(),
            items: [],
            grandTotal: 0
        };
    }

    const itemTotalPrice = qty * price;
    const updatedItem = {
        productName: productName.toUpperCase(),
        qty: qty,
        price: price,
        totalPrice: itemTotalPrice
    };

    if (selectedItemIndex >= 0) {
        // Remove the old item if updating
        invoiceData.items.splice(selectedItemIndex, 1);
        selectedItemIndex = -1; // Reset index after removal
    }

    // Check if the item already exists in the invoice
    const existingItemIndex = invoiceData.items.findIndex(item => item.productName === updatedItem.productName);
    
    if (existingItemIndex >= 0) {
        // Update existing item
        invoiceData.items[existingItemIndex] = updatedItem;
    } else {
        // Add new item
        invoiceData.items.push(updatedItem);
    }

    // Update grandTotal
    invoiceData.grandTotal = invoiceData.items.reduce((total, item) => total + item.totalPrice, 0);

    try {
        // Save to Firestore
        await invoiceDocRef.set(invoiceData);
        console.log("Invoice updated successfully!");
    } catch (error) {
        console.error("Error updating invoice: ", error);
    }

    // Update the display immediately
    items = invoiceData.items; // Update local items array
    grandTotal = invoiceData.grandTotal; // Update local grandTotal
    updateInvoiceItems(); // Refresh the invoice items display
    document.getElementById('grandTotal').innerText = formatNumber(grandTotal);

    // Clear input fields
    document.getElementById('product').value = '';
    document.getElementById('qty').value = '';
    document.getElementById('price').value = '';
}

// Make sure this code is executed when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addItemButton').addEventListener('click', addItem);
});





async function generateNewInvoiceNumber() {
    try {
        const snapshot = await db.collection('invoices').get();
        let maxInvoiceNumber = 0;

        snapshot.forEach(doc => {
            const invoiceNumber = parseInt(doc.id, 10); // Ensure invoiceNumber is parsed as an integer
            if (invoiceNumber > maxInvoiceNumber) {
                maxInvoiceNumber = invoiceNumber;
            }
        });

        const newInvoiceNumber = maxInvoiceNumber + 1; // Increment the max invoice number by 1
        return newInvoiceNumber;

    } catch (error) {
        console.error("Error fetching invoice numbers: ", error);
        return null;
    }
}

async function addNewInvoiceNumber() {
    const newInvoiceNumber = await generateNewInvoiceNumber();
    if (newInvoiceNumber !== null) {
        // Set the new invoice number in the input field
        document.getElementById('invoiceNumber').value = newInvoiceNumber;

        try {
            // Add the new invoice number to Firestore
            await db.collection('invoices').doc(newInvoiceNumber.toString()).set({
                date: new Date().toLocaleDateString(),
                items: [],
                grandTotal: 0
            });
            alert("New invoice number added successfully!");
        } catch (error) {
            console.error("Error adding new invoice number: ", error);
            alert("Error adding new invoice number.");
        }
    }
}

// Add event listener for the button
document.getElementById('addInvoiceNumberButton').addEventListener('click', addNewInvoiceNumber);

// Function to toggle the mobile menu
function toggleMenu() {
    const menu = document.getElementById('navbarMenu');
    menu.classList.toggle('show');
}

 const productInput = document.getElementById('product');
    const suggestionsBox = document.getElementById('suggestions');
    const priceInput = document.getElementById('price');

    productInput.addEventListener('input', async () => {
      const query = productInput.value.trim().toLowerCase();
      suggestionsBox.innerHTML = '';

      if (query.length === 0) return;

      const inventoryRef = db.collection('Inventory');
      const snapshot = await inventoryRef.get();

      snapshot.docs.forEach(doc => {
        const productName = doc.id.toLowerCase();
        if (productName.includes(query)) {
          const suggestionItem = document.createElement('div');
          suggestionItem.textContent = doc.id;
          suggestionItem.onclick = () => selectProduct(doc);
          suggestionsBox.appendChild(suggestionItem);
        }
      });
    });

    function selectProduct(doc) {
      productInput.value = doc.id;
      priceInput.value = doc.data()["Selling Price"];
      suggestionsBox.innerHTML = '';
    }

