let grandTotal = 0;
let items = [];
let selectedItemIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    setDate();
    fetchInvoiceNumbers(); // Fetch existing invoice numbers on load
    document.getElementById('invoiceNumber').addEventListener('input', function() {
        this.value = this.value.replace(/[a-z]/g, (char) => char.toUpperCase());
    });
    document.getElementById('addItemButton').addEventListener('click', addItem);
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

// Format numbers for display
function formatNumber(number) {
    return number.toLocaleString('id-ID');
}

// Fetch existing invoice numbers from Firestore
function fetchInvoiceNumbers() {
    const datalist = document.getElementById('invoiceNumbers');
    datalist.innerHTML = ''; // Clear existing options to avoid duplicates

    const uniqueInvoices = new Set(); // Create a Set to hold unique invoice numbers

    db.collection('invoices').get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            if (!uniqueInvoices.has(doc.id)) {
                uniqueInvoices.add(doc.id); // Add invoice to Set if it isn't already present

                const option = document.createElement('option');
                option.value = doc.id;
                datalist.appendChild(option);
            }
        });
    }).catch((error) => {
        console.error("Error fetching invoice numbers: ", error);
    });
}

// Load invoice details when an invoice number is entered
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
    const productName = document.getElementById('product').value.trim();
    const qty = parseFloat(document.getElementById('qty').value);
    const price = parseFloat(document.getElementById('price').value);
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();

    if (productName && !isNaN(qty) && !isNaN(price) && selectedItemIndex >= 0) {
        const item = items[selectedItemIndex];
        const oldTotalPrice = item.totalPrice;
        const newTotalPrice = qty * price;

        // Update item with new values
        items[selectedItemIndex] = {
            productName: productName.toUpperCase(),
            qty: qty,
            price: price,
            totalPrice: newTotalPrice
        };

        // Update grandTotal
        grandTotal += newTotalPrice - oldTotalPrice;
        console.log(`Updated Grand Total: ${grandTotal}`);

        // Update display
        updateInvoiceItems();
        document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
        setDate();

        // Clear input fields
        document.getElementById('product').value = '';
        document.getElementById('qty').value = '';
        document.getElementById('price').value = '';
        selectedItemIndex = -1;

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
        row.innerHTML = 
            `<td>${item.qty}</td>
            <td>${item.productName}</td>
            <td class="total-price">${formatNumber(item.totalPrice)}</td>
            <td><button onclick="editItem(${index})">Edit</button></td>
            <td><button onclick="deleteItem(${index})">Delete</button></td>`;
        invoiceItems.appendChild(row);
    });
}

function printInvoice() {
    window.print();
}

function editItem(index) {
    const item = items[index];
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
    const qty = parseFloat(document.getElementById('qty').value);
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
    const newItem = {
        productName: productName.toUpperCase(),
        qty: qty,
        price: price,
        totalPrice: itemTotalPrice
    };

    let existingItemIndex = invoiceData.items.findIndex(item => item.productName === newItem.productName);
    
    if (existingItemIndex >= 0) {
        // Update existing item
        grandTotal -= invoiceData.items[existingItemIndex].totalPrice;
        invoiceData.items[existingItemIndex] = newItem;
    } else {
        // Add new item
        invoiceData.items.push(newItem);
    }

    // Update grandTotal
    grandTotal = invoiceData.items.reduce((total, item) => total + item.totalPrice, 0);
    console.log(`Updated Grand Total: ${grandTotal}`);

    try {
        // Save to Firestore
        await invoiceDocRef.set({ items: invoiceData.items, grandTotal: grandTotal });
        console.log("Invoice updated successfully!");
    } catch (error) {
        console.error("Error updating invoice: ", error);
    }

    // Update the display immediately
    items = invoiceData.items; // Update local items array
    updateInvoiceItems(); // Refresh the invoice items display
    document.getElementById('grandTotal').textContent = formatNumber(grandTotal);

    // Clear input fields
    document.getElementById('product').value = '';
    document.getElementById('qty').value = '';
    document.getElementById('price').value = '';
}

let inventoryCache = null;
let lastQueryTime = 0;
const cacheDuration = 10800000; // 3 hours in milliseconds
const debounceDelay = 300; // Define the debounce delay in milliseconds

// Function to fetch inventory and store it in localStorage
async function fetchAndCacheInventory() {
    const now = Date.now();

    // Check if cache is valid and return cached data if so
    if (inventoryCache && (now - lastQueryTime < cacheDuration)) {
        console.log("Using cached inventory data from localStorage");
        return inventoryCache;
    }

    console.log("Fetching inventory data from Firestore");
    const inventoryRef = db.collection('Inventory');
    const snapshot = await inventoryRef.get();

    // Cache the fetched inventory data
    inventoryCache = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    lastQueryTime = now;

    // Store in localStorage
    localStorage.setItem('inventoryCache', JSON.stringify(inventoryCache));

    console.log("Inventory data fetched and cached:", inventoryCache);
    return inventoryCache;
}

// Load inventory from localStorage
function loadInventoryFromLocalStorage() {
    const cachedData = localStorage.getItem('inventoryCache');
    if (cachedData) {
        inventoryCache = JSON.parse(cachedData);
        lastQueryTime = Date.now(); // Update the last query time to now
        console.log("Loaded inventory from localStorage:", inventoryCache);
    } else {
        console.log("No inventory data found in localStorage.");
    }
}

// Load inventory on page load
loadInventoryFromLocalStorage();

const productInput = document.getElementById('product');
const suggestionsBox = document.getElementById('suggestions');
const priceInput = document.getElementById('price');

// Debounce the input for inventory suggestions
productInput.addEventListener('input', debounce(async () => {
    const query = productInput.value.trim();
    if (query) {
        const inventory = await fetchAndCacheInventory(); // Fetch inventory from Firestore or localStorage
        const suggestions = inventory.filter(item =>
            item.id.toLowerCase().includes(query.toLowerCase())
        );

        // Log the suggestions found
        console.log("Suggestions found:", suggestions);

        suggestionsBox.innerHTML = ''; // Clear previous suggestions
        suggestions.forEach(item => {
            const option = document.createElement('div');
            option.classList.add('suggestion-item');
            option.textContent = `${item.id} (Stock: ${item.data.Stock})`;
            option.addEventListener('click', () => {
                productInput.value = item.id;
                priceInput.value = item.data['Selling Price'];
                suggestionsBox.innerHTML = ''; // Clear suggestions after selection
            });
            suggestionsBox.appendChild(option);
        });
    } else {
        suggestionsBox.innerHTML = ''; // Clear suggestions if the input is empty
    }
}, debounceDelay));

// Close suggestions box if clicking outside of it
document.addEventListener('click', (event) => {
    if (!suggestionsBox.contains(event.target) && event.target !== productInput) {
        suggestionsBox.innerHTML = '';
    }
});

// Debounce function to limit the rate of function calls
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
}
