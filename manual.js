let grandTotal = 0;
let items = [];
let selectedItemIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    setDate();
    // fetchInvoiceNumbers(); // Remove Firestore fetch on load
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

// Remove Firestore-related functions
function fetchInvoiceNumbers() {
    // const datalist = document.getElementById('invoiceNumbers');
    // db.collection('invoices').get().then((querySnapshot) => {
    //     querySnapshot.forEach((doc) => {
    //         const option = document.createElement('option');
    //         option.value = doc.id;
    //         datalist.appendChild(option);
    //     });
    // }).catch((error) => {
    //     console.error("Error fetching invoice numbers: ", error);
    // });
}

function loadInvoiceDetails() {
    // This function is now for manual loading
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    if (invoiceNumber) {
        // Simulate loading invoice details from local data
        const data = {}; // Replace with actual local data
        items = data.items || [];
        grandTotal = data.grandTotal || 0;

        // Verify if items and productName are correctly retrieved
        console.log(items);

        updateInvoiceItems();
        document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
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

        // Update display
        updateInvoiceItems();
        document.getElementById('grandTotal').textContent = formatNumber(grandTotal);

        setDate();

        document.getElementById('productName').value = '';
        document.getElementById('qty').value = '';
        document.getElementById('price').value = '';
        selectedItemIndex = -1; // Reset index
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

    grandTotal -= item.totalPrice; // Update grandTotal
    document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
}

function deleteItem(index) {
    const item = items[index];
    grandTotal -= item.totalPrice;

    items.splice(index, 1);
    updateInvoiceItems();
    document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
}

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
        // Remove the old item if updating
        items.splice(selectedItemIndex, 1);
        selectedItemIndex = -1; // Reset index after removal
    }

    items.push(newItem);

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

// Make sure this code is executed when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addItemButton').addEventListener('click', addItem);
});

function generateNewInvoiceNumber() {
    // Simulate generating a new invoice number
    const newInvoiceNumber = Math.floor(Math.random() * 1000000);
    return newInvoiceNumber;
}

function addNewInvoiceNumber() {
    const newInvoiceNumber = generateNewInvoiceNumber();
    document.getElementById('invoiceNumber').value = newInvoiceNumber;
    alert("New invoice number added successfully!");
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

function selectProduct(product) {
    productInput.value = product.name;
    priceInput.value = product.price;
    suggestionsBox.innerHTML = '';
}
