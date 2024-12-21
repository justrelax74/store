// Firebase initialization
const firebaseConfig = {
  apiKey: "AIzaSyANCk_iM4XtSX0VW6iETK-tJdWHGAWMbS0",
  authDomain: "megamasmotor-4008c.firebaseapp.com",
  projectId: "megamasmotor-4008c",
  storageBucket: "megamasmotor-4008c.appspot.com",
  messagingSenderId: "874673615212",
  appId: "1:874673615212:web:7f0ecdeee47fed60aa0349",
  measurementId: "G-LF6NB7ZKLE"
};
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let cart = [];
let currentInvoiceNumber = localStorage.getItem('currentInvoiceNumber');
let productCache = JSON.parse(localStorage.getItem('productCache')) || [];
let lastFetchTime = localStorage.getItem('lastFetchTime') ? new Date(localStorage.getItem('lastFetchTime')) : null;

// Formatting price
function formatPrice(price) {
  return new Intl.NumberFormat('en-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

// Loading invoice data from Firestore
document.addEventListener('DOMContentLoaded', () => {
  if (!currentInvoiceNumber) {
    alert('No active invoice. Please start a new order.');
    window.location.href = 'orders.html';
  } else {
    loadInvoiceDetails(currentInvoiceNumber);
  }
});
document.addEventListener('DOMContentLoaded', () => {
  if (!currentInvoiceNumber) {
    alert('No active invoice. Please start a new order.');
    window.location.href = 'orders.html';
  } else {
    // Display the invoice number
    document.getElementById('invoiceNumber').textContent = currentInvoiceNumber;
    
    loadInvoiceDetails(currentInvoiceNumber);
  }
});


async function loadInvoiceDetails(invoiceNumber) {
  try {
    const invoiceDoc = await db.collection('invoices').doc(invoiceNumber).get();
    if (invoiceDoc.exists) {
      const invoiceData = invoiceDoc.data();
      cart = invoiceData.items || [];
      renderCart();
      updateGrandTotal();
    } else {
      alert('Invoice not found.');
      window.location.href = 'orders.html';
    }
  } catch (error) {
    console.error('Error loading invoice details:', error);
  }
}

// Update grand total
function updateGrandTotal() {
  const grandTotal = cart.reduce((total, item) => total + item.price * item.qty, 0);
  document.getElementById('grandTotal').textContent = formatPrice(grandTotal);
  saveInvoice();  // Save invoice data to Firestore after total update
}

// Adding product to cart
function addToCart(productName, price, sku) {
  const existingProduct = cart.find(item => item.sku === sku);
  if (existingProduct) {
    existingProduct.qty++;
  } else {
    cart.push({ sku, productName, price, qty: 1 });
  }
  renderCart();
  updateGrandTotal();
}

// Render cart table
function renderCart() {
  const cartTableBody = document.querySelector('#cartTable tbody');
  cartTableBody.innerHTML = ''; // Clear previous items
  cart.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.productName}</td>
      <td>${formatPrice(item.price)}</td>
      <td><input type="number" value="${item.qty}" min="1" class="qty-input" data-index="${index}"></td>
      <td>${formatPrice(item.price * item.qty)}</td>
      <td><button class="remove-btn" data-index="${index}">Remove</button></td>
    `;
    cartTableBody.appendChild(row);
  });

  // Attach event listeners for remove and quantity input
  document.querySelectorAll('.remove-btn').forEach(button => {
    button.addEventListener('click', removeItemFromCart);
  });
  document.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', updateCartItemQuantity);
  });
}

// Remove item from cart
function removeItemFromCart(event) {
  const index = event.target.getAttribute('data-index');
  cart.splice(index, 1);
  renderCart();
  updateGrandTotal();
}

// Update quantity of cart item
function updateCartItemQuantity(event) {
  const index = event.target.getAttribute('data-index');
  const newQty = parseInt(event.target.value);
  if (newQty > 0) {
    cart[index].qty = newQty;
    renderCart();
    updateGrandTotal();
  }
}

// Fetch products from Firestore with caching
async function fetchProducts() {
  const currentTime = new Date();
  if (!lastFetchTime || (currentTime - lastFetchTime) > 3 * 60 * 60 * 1000) {
    try {
      const querySnapshot = await db.collection('Inventory').get();
      productCache = [];
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        productCache.push({
          productName: doc.id,
          price: productData['Selling Price'],
          sku: productData['SKU'],
          stock: productData['Stock']
        });
      });
      localStorage.setItem('productCache', JSON.stringify(productCache));
      localStorage.setItem('lastFetchTime', currentTime.toISOString());
      lastFetchTime = currentTime;
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }
}

// Autocomplete suggestions based on input
async function autocomplete(input) {
  await fetchProducts();  // Ensure the product cache is updated
  const suggestions = productCache.filter(product =>
    product.productName.toLowerCase().includes(input.toLowerCase()) ||
    product.sku.toLowerCase().includes(input.toLowerCase())
  );
  return suggestions;
}

// Display autocomplete suggestions
async function showAutocompleteSuggestions() {
  const input = document.getElementById('barcodeInput').value;
  const suggestionBox = document.getElementById('autocompleteResults');
  suggestionBox.innerHTML = '';  // Clear previous suggestions

  if (input.length < 3) return;  // Trigger only when input length is 3 or more

  const suggestions = await autocomplete(input);
  if (suggestions.length === 0) {
    suggestionBox.innerHTML = '<div>No results found</div>';
  } else {
    suggestions.forEach((suggestion) => {
      const suggestionItem = document.createElement('div');
      suggestionItem.textContent = `${suggestion.productName} (${suggestion.sku}) - ${formatPrice(suggestion.price)}`;
      suggestionItem.classList.add('autocomplete-item');
      suggestionItem.addEventListener('click', () => {
        addToCart(suggestion.productName, suggestion.price, suggestion.sku);
        document.getElementById('barcodeInput').value = '';  // Clear input
        suggestionBox.innerHTML = '';  // Clear suggestions
      });
      suggestionBox.appendChild(suggestionItem);
    });
  }
}

// Debounce function to limit how often autocomplete is called
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Event listener for barcode input to show autocomplete suggestions
const barcodeInput = document.getElementById('barcodeInput');
barcodeInput.addEventListener('input', debounce(showAutocompleteSuggestions, 300));

// Save invoice data to Firestore
async function saveInvoice() {
  if (!currentInvoiceNumber) return;

  try {
    await db.collection('invoices').doc(currentInvoiceNumber).set({
      items: cart,
      grandTotal: cart.reduce((total, item) => total + item.price * item.qty, 0),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving invoice:', error);
  }
}

// Checkout button handler
document.getElementById('checkoutButton').addEventListener('click', async () => {
  try {
    if (!currentInvoiceNumber) {
      alert('No invoice available!');
      return;
    }
    for (const item of cart) {
      const productDoc = await db.collection('Inventory').doc(item.productName).get();
      if (!productDoc.exists) {
        alert(`Product not found: ${item.productName}`);
        return;
      }

      const productData = productDoc.data();
      const updatedStock = productData['Stock'] - item.qty;
      if (updatedStock < 0) {
      
        return;
      }

      await db.collection('Inventory').doc(item.productName).update({ Stock: updatedStock });
    }

    await db.collection('invoices').doc(currentInvoiceNumber).update({ status: 'checked_out' });
    window.location.href = 'checkout.html';  // Redirect to checkout page
  } catch (error) {
    console.error('Error during checkout:', error);
    alert('An error occurred during checkout.');
  }
});
// Function to fetch products from Firestore and update the cache
async function fetchProducts() {
  const currentTime = new Date();

  // Check if the last fetch was more than 3 hours ago
  if (!lastFetchTime || (currentTime - lastFetchTime) > 3 * 60 * 60 * 1000) {
    try {
      console.log('Fetching products from Firestore...'); // Debugging log
      const querySnapshot = await db.collection('Inventory').get();
      productCache = []; // Clear the previous cache

      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        productCache.push({
          productName: doc.id, // Using document ID as product name
          price: productData['Selling Price'],
          sku: productData['SKU'],
          stock: productData['Stock']
        });
      });

      // Store the new product data in localStorage
      localStorage.setItem('productCache', JSON.stringify(productCache));
      localStorage.setItem('lastFetchTime', currentTime.toISOString());
      lastFetchTime = currentTime; // Update last fetch time
      console.log('Product cache updated from Firestore at:', currentTime); // Debugging log
    } catch (error) {
      console.error('Error fetching products for cache:', error);
    }
  } else {
    console.log('Using cached product data from localStorage'); // Debugging log
  }
}
// Checkout button logic
document.getElementById('checkoutButton').addEventListener('click', async () => {
  try {
    if (!currentInvoiceNumber) {
      alert('No invoice number is available!');
      return;
    }

    // Validate cart data
    if (!Array.isArray(cart) || cart.length === 0) {
      alert('The cart is empty or invalid!');
      return;
    }

    // Flag to check if there's any product not found in the inventory
    let productNotFound = false;

    // Update stock for each item in the cart
    for (const item of cart) {
      if (!item.productName || item.qty === undefined) {
        alert(`Invalid item in cart: ${JSON.stringify(item)}`);
        return;
      }

      const docRef = db.collection('Inventory').doc(item.productName); // Use product name as document ID
      const doc = await docRef.get();

      if (doc.exists) {
        const currentStock = doc.data().Stock || 0; // Default to 0 if stock is undefined

        // Update stock in Firestore (allow negative stock)
        await docRef.update({
          Stock: currentStock - item.qty,
        });
        console.log(
          `Stock for ${item.productName} updated: ${currentStock} -> ${currentStock - item.qty}`
        );
      } else {
        // Product not found, add it to the "no data" collection
        const noDataRef = db.collection('no data').doc(item.productName);
        await noDataRef.set({
          productName: item.productName,
          qty: item.qty,
          reason: 'Product not found in inventory during checkout'
        });
        console.log(`Product ${item.productName} added to 'no data' collection.`);

        // Set the flag to true
        productNotFound = true;
      }
    }

    // Save the invoice with the current invoice number
    await saveInvoice();

    // Get the current date as yyyy-mm-dd for the sales collection
    const currentDate = new Date().toISOString().split('T')[0];

    // Copy the invoice into the date-named sales collection
    const salesRef = db.collection(currentDate).doc(currentInvoiceNumber);
    await salesRef.set({
      items: cart,
      grandTotal: cart.reduce((total, item) => total + (item.price * item.qty), 0),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Invoice ${currentInvoiceNumber} copied successfully to collection ${currentDate}.`);

    // Mark the invoice as checked out in the invoices collection
    const invoiceRef = db.collection('invoices').doc(currentInvoiceNumber);
    await invoiceRef.update({
      status: 'checked_out',
    });
    console.log(`Invoice ${currentInvoiceNumber} status updated to 'checked out' in invoices collection.`);

    // Do not clear localStorage
    console.log('LocalStorage preserved for checkout.html to fetch data for printing.');

    // Redirect to checkout.html
    window.location.href = 'checkout.html';

  } catch (error) {
    console.error('Error during checkout:', error);

    if (productNotFound) {
      alert('Some products were not found in the inventory. Please check the "no data" collection for details.');
    } else {
      alert('Error during checkout. Please try again.');
    }
  }
});
