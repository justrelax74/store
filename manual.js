let grandTotal = 0;
let items = [];
let selectedItemIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    setDate();
});

// Set the current date and time
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

// Format number to local string
function formatNumber(number) {
    return number.toLocaleString('id-ID');
}

// Load invoice details manually (without Firestore)
function loadInvoiceDetails() {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    if (invoiceNumber) {
        // Simulate loading invoice details from local data
        const data = {}; // Replace with actual local data
        items = data.items || [];
        grandTotal = data.grandTotal || 0;
        updateInvoiceItems();
        document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
    } else {
        alert('Please enter an invoice number.');
    }
}

// Save edited item
function saveEditedItem() {
    const productName = document.getElementById('product').value.trim();
    const qty = parseInt(document.getElementById('qty').value, 10);
    const price = parseFloat(document.getElementById('price').value);

    if (productName && !isNaN(qty) && !isNaN(price) && selectedItemIndex >= 0) {
        const oldItem = items[selectedItemIndex];
        const newTotalPrice = qty * price;
        grandTotal += newTotalPrice - oldItem.totalPrice; // Update grandTotal

        // Remove the old item being edited
        items.splice(selectedItemIndex, 1);

        // Create a new item object with updated details
        const updatedItem = {
            productName: productName.toUpperCase(),
            qty: qty,
            price: price,
            totalPrice: newTotalPrice
        };

        // Add the updated item back to the items array
        items.push(updatedItem);

        // Update display
        updateInvoiceItems();
        document.getElementById('grandTotal').textContent = formatNumber(grandTotal);

        setDate();

        // Clear input fields
        document.getElementById('product').value = '';
        document.getElementById('qty').value = '';
        document.getElementById('price').value = '';
        selectedItemIndex = -1; // Reset index
    } else {
        alert('Please fill out all fields with valid values.');
    }
}

// Update invoice items display
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

// Print the invoice
function printInvoice() {
    window.print();
}

// Edit an item
function editItem(index) {
    const item = items[index];

    document.getElementById('product').value = item.productName;
    document.getElementById('qty').value = item.qty;
    document.getElementById('price').value = item.price;

    selectedItemIndex = index; // Set selectedItemIndex for update

    // Remove the item from the array temporarily
    items.splice(index, 1);
    updateInvoiceItems(); // Update display to remove the item

    grandTotal -= item.totalPrice; // Update grandTotal
    document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
}

// Delete an item
function deleteItem(index) {
    const item = items[index];
    grandTotal -= item.totalPrice;

    items.splice(index, 1);
    updateInvoiceItems();
    document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
}

// Add an item to the invoice
function addItem() {
    const productName = document.getElementById('product').value.trim();
    const qty = parseInt(document.getElementById('qty').value, 10);
    const price = parseFloat(document.getElementById('price').value);

    if (!productName || isNaN(qty) || isNaN(price)) {
        alert('Please fill out all fields with valid values.');
        return;
    }

    const itemTotalPrice = qty * price;
    const newItem = {
        productName: productName.toUpperCase(),
        qty: qty,
        price: price,
        totalPrice: itemTotalPrice
    };

    if (selectedItemIndex >= 0) {
        // Update the item if editing
        items[selectedItemIndex] = newItem;
        selectedItemIndex = -1; // Reset index after update
    } else {
        // Add new item
        items.push(newItem);
    }

    // Update grandTotal
    grandTotal = items.reduce((total, item) => total + item.totalPrice, 0);

    // Update the display immediately
    updateInvoiceItems(); // Refresh the invoice items display
    document.getElementById('grandTotal').innerText = formatNumber(grandTotal);

    // Clear input fields
    document.getElementById('product').value = '';
    document.getElementById('qty').value = '';
    document.getElementById('price').value = '';
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addItemButton').addEventListener('click', addItem);
});

// Generate a new invoice number
function generateNewInvoiceNumber() {
    const newInvoiceNumber = Math.floor(Math.random() * 1000000);
    return newInvoiceNumber;
}

// Add a new invoice number
function addNewInvoiceNumber() {
    const newInvoiceNumber = generateNewInvoiceNumber();
    document.getElementById('invoiceNumber').value = newInvoiceNumber;
    alert("New invoice number added successfully!");
}

// Add event listener for the new invoice number button
document.getElementById('addInvoiceNumberButton').addEventListener('click', addNewInvoiceNumber);

// Function to toggle the mobile menu
function toggleMenu() {
    const menu = document.getElementById('navbarMenu');
    menu.classList.toggle('show');
}

// Product search functionality
const productInput = document.getElementById('product');
const suggestionsBox = document.getElementById('suggestions');
const priceInput = document.getElementById('price');

productInput.addEventListener('input', () => {
    const query = productInput.value.trim().toLowerCase();
    suggestionsBox.innerHTML = '';

    if (query.length === 0) return;

    // Simulate fetching from a local list of products
    const products = [
        { name: 'Product 1', price: 1000 },
        { name: 'Product 2', price: 2000 },
        { name: 'Product 3', price: 3000 }
    ];

    products.forEach(product => {
        if (product.name.toLowerCase().includes(query)) {
            const suggestionItem = document.createElement('div');
            suggestionItem.textContent = product.name;
            suggestionItem.onclick = () => selectProduct(product);
            suggestionsBox.appendChild(suggestionItem);
        }
    });
});

// Select a product from suggestions
function selectProduct(product) {
    productInput.value = product.name;
    priceInput.value = product.price;
    suggestionsBox.innerHTML = '';
}
