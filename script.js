let grandTotal = 0;
let items = [];
let selectedItemIndex = -1;


document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setDate();
    fetchInvoiceNumbers();
    setupEventListeners();
    populateInvoiceNumberFromLocalStorage();
}
// Populate invoice number from local storage
function populateInvoiceNumberFromLocalStorage() {
    const storedInvoiceNumber = localStorage.getItem('currentInvoiceNumber');
    if (storedInvoiceNumber) {
        const invoiceNumberInput = document.getElementById('invoiceNumber');
        invoiceNumberInput.value = storedInvoiceNumber;
        loadInvoiceDetails(); // Automatically load the invoice details
    }
}

function setupEventListeners() {
    const invoiceNumberInput = document.getElementById('invoiceNumber');
    const addItemButton = document.getElementById('addItemButton');
    const checkoutButton = document.getElementById('checkoutButton'); // Checkout button

    invoiceNumberInput.addEventListener('input', () => {
        invoiceNumberInput.value = invoiceNumberInput.value.replace(/[a-z]/g, char => char.toUpperCase());
    });

    addItemButton.addEventListener('click', addItem);
    checkoutButton.addEventListener('click', () => {
        const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
        checkoutInvoice(invoiceNumber);
    });
    
    setupProductSuggestions();
    loadInventoryFromLocalStorage();
}

// Set current date and time
function setDate() {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: '2-digit' });
    const formattedTime = now.toTimeString().slice(0, 8);
    document.getElementById('invoiceDate').textContent = `${formattedDate}, ${formattedTime}`;
}

// Fetch and display invoice numbers
function fetchInvoiceNumbers() {
    const datalist = document.getElementById('invoiceNumbers');
    datalist.innerHTML = '';

    db.collection('invoices').get().then(snapshot => {
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            datalist.appendChild(option);
        });
    }).catch(error => console.error("Error fetching invoice numbers:", error));
}

// Load invoice details by number
function loadInvoiceDetails() {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();

    if (!invoiceNumber) return alert('Please enter an invoice number.');

    db.collection('invoices').doc(invoiceNumber).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            items = data.items || [];
            grandTotal = data.grandTotal || 0;
            updateInvoiceItems();
            document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
        } else {
            alert('Invoice not found.');
        }
    }).catch(error => console.error("Error fetching invoice details:", error));
}

// Save an edited item
function saveEditedItem() {
    const productName = document.getElementById('product').value.trim();
    const qty = parseFloat(document.getElementById('qty').value);
    const price = parseFloat(document.getElementById('price').value);

    if (!productName || isNaN(qty) || isNaN(price) || selectedItemIndex < 0) {
        return alert('Please fill out all fields with valid values.');
    }

    const item = items[selectedItemIndex];
    const newTotalPrice = qty * price;
    grandTotal += newTotalPrice - item.totalPrice;

    items[selectedItemIndex] = { productName: productName.toUpperCase(), qty, price, totalPrice: newTotalPrice };
    updateInvoiceUI();
    saveInvoiceToFirestore();
}

// Update invoice UI and save to Firestore
function updateInvoiceUI() {
    updateInvoiceItems();
    document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
    clearItemInputs();
    setDate();
}

function saveInvoiceToFirestore() {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    if (!invoiceNumber) return;

    db.collection('invoices').doc(invoiceNumber).set({ items, grandTotal })
        .then(() => console.log("Invoice updated successfully!"))
        .catch(error => console.error("Error updating invoice:", error));
}

// Update displayed invoice items
function updateInvoiceItems() {
    const invoiceItems = document.getElementById('invoiceItems');
    invoiceItems.innerHTML = '';

    items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.qty}</td>
            <td>${item.productName}</td>
            <td class="total-price">${formatNumber(item.totalPrice)}</td>
            <td><button onclick="editItem(${index})">Edit</button></td>
            <td><button onclick="deleteItem(${index})">Delete</button></td>`;
        invoiceItems.appendChild(row);
    });
}

// Add a new item to the invoice
async function addItem() {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    const productName = document.getElementById('product').value.trim();
    const qty = parseFloat(document.getElementById('qty').value);
    const price = parseFloat(document.getElementById('price').value);

    if (!invoiceNumber || !productName || isNaN(qty) || isNaN(price)) {
        return ;
    }

    const itemTotalPrice = qty * price;
    const newItem = { productName: productName.toUpperCase(), qty, price, totalPrice: itemTotalPrice };

    let existingItemIndex = items.findIndex(item => item.productName === newItem.productName);
    if (existingItemIndex >= 0) {
        grandTotal -= items[existingItemIndex].totalPrice;
        items[existingItemIndex] = newItem;
    } else {
        items.push(newItem);
    }

    grandTotal += itemTotalPrice;
    updateInvoiceUI();
    saveInvoiceToFirestore();
}

async function checkoutInvoice(invoiceNumber) {
    if (!invoiceNumber || typeof invoiceNumber !== 'string') {
        alert('Invalid invoice number!');
        return;
    }

    try {
        const invoiceDoc = await db.collection('invoices').doc(invoiceNumber).get();
        if (!invoiceDoc.exists) {
            alert('Invoice not found!');
            return;
        }

        const invoiceData = invoiceDoc.data();
        if (!invoiceData || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
            alert('The invoice is empty or invalid!');
            return;
        }

        for (const item of invoiceData.items) {
            if (!item.productName || typeof item.productName !== 'string') {
                console.error('Invalid product name:', item.productName);
                alert('Invalid product name found in the invoice.');
                return;
            }
            if (typeof item.qty !== 'number') {
                console.error('Invalid quantity for product:', item);
                alert('Invalid quantity found in the invoice.');
                return;
            }

            const inventoryRef = db.collection('Inventory').doc(item.productName);
            const inventoryDoc = await inventoryRef.get();

            if (inventoryDoc.exists) {
                const currentStock = inventoryDoc.data().Stock || 0;
                if (typeof currentStock !== 'number') {
                    console.error('Invalid stock value in inventory:', currentStock);
                    alert('Invalid stock value found for a product in the inventory.');
                    return;
                }
                await inventoryRef.update({ Stock: currentStock - item.qty });
                console.log(`Stock for ${item.productName} updated: ${currentStock} -> ${currentStock - item.qty}`);
            } else {
                // Product not found, add it to the "no data" collection
                const noDataRef = db.collection('no data').doc(item.productName);
                await noDataRef.set({
                  productName: item.productName,
                  qty: item.qty,
                  pricePerUnit: item.price || null, // Include price if available
                  reason: 'Product not found in inventory during checkout',
                });
                console.log(`Product ${item.productName} added to 'no data' collection with price info.`);
        
                // Set the flag to true
                productNotFound = true;
              }
            }

        const currentDate = new Date().toISOString().split('T')[0];
        await db.collection(currentDate).doc(invoiceNumber).set({
            items: invoiceData.items,
            grandTotal: invoiceData.items.reduce((total, item) => total + (item.price * item.qty), 0),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('invoices').doc(invoiceNumber).update({ status: 'checked_out' });
        localStorage.setItem('currentInvoiceNumber', invoiceNumber);
        window.location.href = 'checkout.html';
    } catch (error) {
        console.error('Error during checkout:', error);
        alert(`Checkout failed! ${error.message}`);
    }
}



// Reset the invoice form after checkout
function resetInvoice() {
    document.getElementById('invoiceNumber').value = '';
    document.getElementById('invoiceItems').innerHTML = '';
    document.getElementById('grandTotal').textContent = '0';
    items = [];
    grandTotal = 0;
    clearItemInputs();
    setDate();
}

// Edit an existing item
function editItem(index) {
    const item = items[index];
    document.getElementById('product').value = item.productName;
    document.getElementById('qty').value = item.qty;
    document.getElementById('price').value = item.price;
    selectedItemIndex = index;
    grandTotal -= item.totalPrice;
}

// Delete an item
function deleteItem(index) {
    const item = items.splice(index, 1)[0];
    grandTotal -= item.totalPrice;
    updateInvoiceUI();
    saveInvoiceToFirestore();
}

// Format number for display
function formatNumber(number) {
    return number.toLocaleString('id-ID');
}

// Clear input fields
function clearItemInputs() {
    document.getElementById('product').value = '';
    document.getElementById('qty').value = '';
    document.getElementById('price').value = '';
    selectedItemIndex = -1;
}

// Suggestions for product input
function setupProductSuggestions() {
    const productInput = document.getElementById('product');
    const suggestionsBox = document.getElementById('suggestions');

    productInput.addEventListener('input', debounce(async () => {
        const query = productInput.value.trim();
        if (!query) {
            suggestionsBox.innerHTML = '';
            return;
        }

        const inventory = await fetchAndCacheInventory();
        const suggestions = inventory.filter(item => item.id.toLowerCase().includes(query.toLowerCase()));

        suggestionsBox.innerHTML = '';
        suggestions.forEach(item => {
            const option = document.createElement('div');
            option.textContent = `${item.id} (Stock: ${item.data.Stock})`;
            option.addEventListener('click', () => {
                productInput.value = item.id;
                document.getElementById('price').value = item.data['Selling Price'];
                suggestionsBox.innerHTML = '';
            });
            suggestionsBox.appendChild(option);
        });
    }, 300));

    document.addEventListener('click', event => {
        if (!suggestionsBox.contains(event.target) && event.target !== productInput) {
            suggestionsBox.innerHTML = '';
        }
    });
}


// Debounce helper
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Fetch and cache inventory
async function fetchAndCacheInventory() {
    const cachedData = localStorage.getItem('inventoryCache');
    if (cachedData) {
        console.log('Loaded inventory from localStorage');
        inventoryCache = JSON.parse(cachedData);
        lastQueryTime = Date.now();
        return inventoryCache;
    }

    console.log('Fetching inventory from Firestore');
    const snapshot = await db.collection('Inventory').get();
    inventoryCache = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    localStorage.setItem('inventoryCache', JSON.stringify(inventoryCache));
    lastQueryTime = Date.now();
    return inventoryCache;
}

// Load inventory from localStorage
function loadInventoryFromLocalStorage() {
    const cachedData = localStorage.getItem('inventoryCache');
    if (cachedData) {
        inventoryCache = JSON.parse(cachedData);
        console.log('Inventory loaded from localStorage');
    } else {
        console.log('No inventory data in localStorage');
    }
}
