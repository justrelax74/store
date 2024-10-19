// Initialize Firebase and Firestore
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
let currentInvoiceNumber = null;

// Function to format price with currency and no decimals
function formatPrice(price) {
  return new Intl.NumberFormat('en-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
}

// Function to update the grand total
function updateGrandTotal() {
  const grandTotalElement = document.getElementById('grandTotal');
  const grandTotal = cart.reduce((total, item) => total + (item.price * item.qty), 0);
  grandTotalElement.textContent = formatPrice(grandTotal);
  saveInvoice(); // Save the invoice whenever the grand total is updated
}

// Function to add product to cart
function addToCart(productName, price, sku) {
  const existingProduct = cart.find(item => item.sku === sku);

  if (existingProduct) {
    existingProduct.qty++;
  } else {
    cart.push({ sku: sku, name: productName, price: price, qty: 1 });
  }

  renderCart();
  updateGrandTotal();
}

// Function to render the cart table
function renderCart() {
  const cartTableBody = document.querySelector('#cartTable tbody');
  cartTableBody.innerHTML = ''; // Clear existing items

  cart.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${formatPrice(item.price)}</td>
      <td>
        <input type="number" value="${item.qty}" min="1" data-index="${index}" class="qty-input">
      </td>
      <td>${formatPrice(item.price * item.qty)}</td>
      <td><button data-index="${index}" class="remove-btn">Remove</button></td>
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

// Function to remove an item from the cart
function removeItemFromCart(event) {
  const index = event.target.getAttribute('data-index');
  cart.splice(index, 1);
  renderCart();
  updateGrandTotal();
}

// Function to update the quantity of a cart item
function updateCartItemQuantity(event) {
  const index = event.target.getAttribute('data-index');
  const newQty = parseInt(event.target.value);

  if (newQty > 0) {
    cart[index].qty = newQty;
    renderCart();
    updateGrandTotal();
  }
}

// Product lookup and add to cart logic
const barcodeInput = document.getElementById('barcodeInput');
barcodeInput.addEventListener('change', async (event) => {
  const barcode = event.target.value.trim();
  const productNameElement = document.getElementById('productName');
  const productPriceElement = document.getElementById('productPrice');
  const productStockElement = document.getElementById('productStock'); // Stock element
  let productFound = false;

  try {
    const querySnapshot = await db.collection('Inventory').where('SKU', '==', barcode).get();
    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        const productName = doc.id; // Assuming the product ID is the name
        const productPrice = productData['Selling Price'];
        const sku = productData['SKU'];
        const productStock = productData['Stock']; // Fetching the stock

        productNameElement.textContent = productName;
        productPriceElement.textContent = formatPrice(productPrice);
        productStockElement.textContent = `Stock: ${productStock}`; // Displaying the stock

        // Add the product to the cart
        addToCart(productName, productPrice, sku);
        productFound = true;
      });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
  }

  if (!productFound) {
    alert('Product not found!');
  }

  barcodeInput.value = ''; // Clear the input
});

// Checkout button logic
document.getElementById('checkoutButton').addEventListener('click', async () => {
  try {
    // Ensure currentInvoiceNumber is set
    if (!currentInvoiceNumber) {
      alert('No invoice number is available!'); // Alert if invoice number is missing
      return;
    }

    // Update stock for each item in the cart, allowing stock to go negative
    for (const item of cart) {
      // Query the inventory collection to find the document with matching SKU
      const querySnapshot = await db.collection('Inventory').where('SKU', '==', item.sku).get();

      if (!querySnapshot.empty) {
        querySnapshot.forEach(async (doc) => {
          const productData = doc.data();
          const currentStock = productData.Stock; // Get the current stock
          const newStock = currentStock - item.qty; // Calculate new stock value, allowing negative stock

          console.log(`Updating stock for SKU: ${item.sku}`);
          console.log(`Current stock: ${currentStock}, Quantity: ${item.qty}, New stock: ${newStock}`);

          // Update the stock in Firestore
          await db.collection('Inventory').doc(doc.id).update({ Stock: newStock });
          console.log(`Stock updated for SKU: ${item.sku}`);
        });
      } else {
        console.error(`Product not found for SKU: ${item.sku}`);
        alert(`Product not found for SKU: ${item.sku}`);
      }
    }

    // Update invoice status to "checked_out"
    await db.collection('invoices').doc(currentInvoiceNumber).update({
      status: 'checked_out'
    });

    // Redirect to checkout page
    window.location.href = 'checkout.html';
  } catch (error) {
    console.error('Error during checkout:', error);
    alert('Checkout failed. Please try again.');
  }
});


// Function to save the invoice
async function saveInvoice() {
  if (!currentInvoiceNumber) return; // Ensure there's an invoice number
  try {
    await db.collection('invoices').doc(currentInvoiceNumber).set({
      items: cart,
      grandTotal: cart.reduce((total, item) => total + (item.price * item.qty), 0)
    });
    console.log('Invoice has been successfully saved.');
  } catch (error) {
    console.error('Error saving invoice:', error);
    alert('Failed to save invoice. Please try again.');
  }
}

// Function to load an invoice
async function loadInvoice(invoiceNumber) {
  try {
    const doc = await db.collection('invoices').doc(invoiceNumber).get();
    if (doc.exists) {
      const data = doc.data();
      cart = data.items || [];
      updateGrandTotal();
      renderCart();
    } else {
      cart = []; // Clear the cart if the invoice does not exist
      renderCart();
      updateGrandTotal();
    }
  } catch (error) {
    console.error('Error loading invoice:', error);
    alert('Failed to load invoice. Please try again.');
  }
}

// Load invoice on invoice number input change
document.getElementById('invoiceNumberInput').addEventListener('change', (event) => {
  const invoiceNumber = event.target.value.trim();
  if (invoiceNumber) {
    currentInvoiceNumber = invoiceNumber;
    loadInvoice(invoiceNumber);
  }
});

// Function to load an invoice based on input
document.getElementById('loadInvoiceButton').addEventListener('click', () => {
  const invoiceNumber = document.getElementById('invoiceNumberInput').value.trim();
  if (invoiceNumber) {
    currentInvoiceNumber = invoiceNumber; // Set the invoice number
    localStorage.setItem('currentInvoiceNumber', currentInvoiceNumber); // Save to localStorage
    loadInvoice(invoiceNumber); // Load the invoice if necessary
  } else {
    alert('Please enter an invoice number.');
  }
});

// If an invoice number is available in localStorage, set it
if (currentInvoiceNumber) {
  console.log('Setting invoice number:', currentInvoiceNumber);
  localStorage.setItem('currentInvoiceNumber', currentInvoiceNumber);
} else {
  console.error('Invoice number not found.');
}
