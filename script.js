let grandTotal = 0;
let items = [];
let inventoryCache = [];
let lastQueryTime = 0;

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Main initialization function
function initializeApp() {
    console.log("Initializing application...");
    setDate();
    fetchInvoiceNumbers();
    populateInvoiceNumberFromLocalStorage(); // Ensure this is called to load the invoice number during initialization
    loadInventoryFromLocalStorage();
}

// Populate invoice number from local storage
function populateInvoiceNumberFromLocalStorage() {
    const storedInvoiceNumber = localStorage.getItem('currentInvoiceNumber');
    if (storedInvoiceNumber) {
        const invoiceNumberInput = document.getElementById('invoiceNumber');
        invoiceNumberInput.value = storedInvoiceNumber;
        loadInvoiceDetails(); // Automatically load the invoice details
    } else {
        console.log('No invoice number found in local storage.');
    }
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

// Fetch and cache inventory
async function fetchAndCacheInventory() {
    const cacheDuration = 3 * 60 * 60 * 1000; // 3 hours
    const now = Date.now();

    if (inventoryCache.length && (now - lastQueryTime < cacheDuration)) {
        console.log('Using cached inventory');
        return inventoryCache;
    }

    console.log('Fetching inventory from Firestore');
    const snapshot = await db.collection('Inventory').get();
    inventoryCache = snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data(),
    }));
    localStorage.setItem('inventoryCache', JSON.stringify(inventoryCache));
    lastQueryTime = now;

    return inventoryCache;
}

// Load inventory from localStorage
function loadInventoryFromLocalStorage() {
    const cachedData = localStorage.getItem('inventoryCache');
    if (cachedData) {
        inventoryCache = JSON.parse(cachedData);
        console.log('Inventory loaded from localStorage');
    } else {
        console.log('No inventory data in localStorage. Fetching from Firestore...');
        fetchAndCacheInventory();
    }
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
            renderEditableInvoiceItems();
            document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
            localStorage.setItem('currentInvoiceNumber', invoiceNumber); // Ensure it's saved to local storage
        } else {
            alert('Invoice not found.');
        }
    }).catch(error => console.error("Error fetching invoice details:", error));
}

// Render invoice items as editable rows
function renderEditableInvoiceItems() {
    const invoiceItems = document.getElementById('invoiceItems');
    invoiceItems.innerHTML = '';

    items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="text" class="product-input" value="${item.productName}" placeholder="Product Name" list="productSuggestions" autocomplete="off">
                <div class="suggestions-box"></div>
            </td>
            <td>
                <input type="number" class="qty-input" value="${item.qty}" placeholder="Qty" min="1">
            </td>
            <td>
                <input type="number" class="price-input" value="${item.price}" placeholder="Price/Item" min="0">
            </td>
            <td>
                <input type="number" class="subtotal-input" value="${item.totalPrice}" readonly>
            </td>
            <td>
                <button class="delete-row-button">Delete</button>
            </td>
        `;

        invoiceItems.appendChild(row);
        setupAutocomplete(row.querySelector('.product-input'), row.querySelector('.suggestions-box'));
        setupRowListeners(row);
    });

    calculateGrandTotal();
    autosaveInvoice();
}

// Add a new row dynamically
document.getElementById('addRowButton').addEventListener('click', () => {
    addNewRow();
});

function addNewRow() {
    const invoiceItems = document.getElementById('invoiceItems');
    const row = document.createElement('tr');

    row.innerHTML = `
        <td>
            <input type="text" class="product-input" placeholder="Product Name" list="productSuggestions" autocomplete="off">
            <div class="suggestions-box"></div>
        </td>
        <td>
            <input type="number" class="qty-input" placeholder="Qty" min="1" value="1">
        </td>
        <td>
            <input type="number" class="price-input" placeholder="Price/Item" min="0">
        </td>
        <td>
            <input type="number" class="subtotal-input" readonly>
        </td>
        <td>
            <button class="delete-row-button">Delete</button>
        </td>
    `;

    invoiceItems.appendChild(row);

    setupAutocomplete(row.querySelector('.product-input'), row.querySelector('.suggestions-box'));
    setupRowListeners(row);
    autosaveInvoice();
}

function setupRowListeners(row) {
    row.querySelector('.qty-input').addEventListener('input', (event) => {
        updateSubtotal(event);
        autosaveInvoice();
    });
    row.querySelector('.price-input').addEventListener('input', (event) => {
        updateSubtotal(event);
        autosaveInvoice();
    });
    row.querySelector('.product-input').addEventListener('input', () => autosaveInvoice());
    row.querySelector('.delete-row-button').addEventListener('click', () => {
        deleteRow(row);
        autosaveInvoice();
    });
}

function updateSubtotal(event) {
    const row = event.target.closest('tr');
    const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
    const price = parseFloat(row.querySelector('.price-input').value) || 0;
    const subtotal = qty * price;
    row.querySelector('.subtotal-input').value = subtotal.toFixed(2);
    calculateGrandTotal();
}

function calculateGrandTotal() {
    let total = 0;
    document.querySelectorAll('.subtotal-input').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('grandTotal').textContent = total.toLocaleString('id-ID');
    autosaveInvoice();
}

function deleteRow(row) {
    row.remove();
    calculateGrandTotal();
    autosaveInvoice();
}

// Autocomplete for product input
function setupAutocomplete(input, suggestionsBox) {
    // Automatically capitalize the input
    input.style.textTransform = 'uppercase'; // Set CSS style for auto-capitalization
    input.addEventListener('input', debounce(() => {
        const query = input.value.trim().toUpperCase();
        if (!query) {
            suggestionsBox.innerHTML = '';
            return;
        }

        // Filter inventory cache for matching products
        const suggestions = inventoryCache.filter(item =>
            item.id.toUpperCase().includes(query)
        );

        suggestionsBox.innerHTML = ''; // Clear previous suggestions
        suggestions.forEach(item => {
            const option = document.createElement('div');
            option.textContent = `${item.id} (Stock: ${item.data.Stock})`;
            option.style.cursor = 'pointer';

            option.addEventListener('click', () => {
                const row = input.closest('tr');
                input.value = item.id;
                row.querySelector('.price-input').value = item.data['Selling Price'] || 0;
                suggestionsBox.innerHTML = ''; // Clear suggestions after selection
                updateSubtotal({ target: row.querySelector('.price-input') });
                autosaveInvoice();
            });

            suggestionsBox.appendChild(option);
        });
    }, 300));

    // Close suggestions when clicking outside
    document.addEventListener('click', (event) => {
        if (!suggestionsBox.contains(event.target) && event.target !== input) {
            suggestionsBox.innerHTML = '';
        }
    });
}



// Autosave the invoice details
function autosaveInvoice() {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    if (!invoiceNumber) return;

    const updatedItems = [];
    document.querySelectorAll('#invoiceItems tr').forEach(row => {
        const productName = row.querySelector('.product-input').value.toUpperCase(); // Capitalize product name
        const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
        const price = parseFloat(row.querySelector('.price-input').value) || 0;
        const totalPrice = parseFloat(row.querySelector('.subtotal-input').value) || 0;

        updatedItems.push({ productName, qty, price, totalPrice });
    });

    const grandTotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    db.collection('invoices').doc(invoiceNumber).set({
        items: updatedItems,
        grandTotal
    }).then(() => console.log('Invoice autosaved successfully.'))
    .catch(error => console.error('Error autosaving invoice:', error));

    // Save current invoice number in local storage
    localStorage.setItem('currentInvoiceNumber', invoiceNumber);
}

// Format number for display
function formatNumber(number) {
    return number.toLocaleString('id-ID', { minimumFractionDigits: 2 });
}

// Debounce function
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Checkout button logic
document.getElementById('checkoutButton').addEventListener('click', async () => {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    if (!invoiceNumber) {
        alert("Invoice number is required.");
        return;
    }

    try {
        // Fetch invoice data from Firestore
        const invoiceDoc = await db.collection('invoices').doc(invoiceNumber).get();
        if (!invoiceDoc.exists) {
            alert("Invoice not found!");
            return;
        }

        const invoiceData = invoiceDoc.data();
        if (!Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
            alert("The invoice is empty or invalid!");
            return;
        }

        const updatedItems = [];
        let productNotFound = false;

        // Process each item in the invoice
        for (const item of invoiceData.items) {
            if (!item.productName || item.qty === undefined) {
                alert(`Invalid item in invoice: ${JSON.stringify(item)}`);
                return;
            }

            const productRef = db.collection('Inventory').doc(item.productName);
            const productDoc = await productRef.get();

            if (productDoc.exists) {
                const currentStock = productDoc.data().Stock || 0;

                // Update stock (allow negative stock)
                await productRef.update({
                    Stock: currentStock - item.qty,
                });

                console.log(
                    `Stock for ${item.productName} updated: ${currentStock} -> ${currentStock - item.qty}`
                );
            } else {
                // Add product to "no data" collection
                await db.collection('no data').doc(item.productName).set({
                    productName: item.productName,
                    qty: item.qty,
                    pricePerUnit: item.price || null,
                    reason: "Product not found in inventory during checkout",
                });

                console.log(
                    `Product ${item.productName} added to 'no data' collection with price info.`
                );

                productNotFound = true;
            }

            updatedItems.push({
                productName: item.productName,
                qty: item.qty,
                price: item.price || 0,
                totalPrice: item.qty * (item.price || 0),
            });
        }

        // Calculate the grand total
        const grandTotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);

        // Save the invoice to the sales collection
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        await db.collection(today).doc(invoiceNumber).set({
            items: updatedItems,
            grandTotal,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Invoice ${invoiceNumber} saved to sales collection (${today}).`);

        // Update the invoice status
        await db.collection('invoices').doc(invoiceNumber).update({
            status: "checked_out",
        });

        console.log(`Invoice ${invoiceNumber} marked as 'checked_out' in invoices collection.`);

        // Store invoice number in localStorage
        localStorage.setItem('currentInvoiceNumber', invoiceNumber);

        // Notify user and redirect
        alert("Checkout successful!");
        window.location.href = 'checkout.html';
    } catch (error) {
        console.error("Error during checkout:", error);
        alert(`Checkout failed! ${error.message}`);
    }
});

