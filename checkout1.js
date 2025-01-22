// Initialize Firebase and Firestore (ensure this matches your firebaseConfig)
checkout.html

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentInvoiceNumber = localStorage.getItem('currentInvoiceNumber'); // Retrieve the current invoice number

// Format price as currency in Indonesian Rupiah (IDR)
function formatPrice(price) {
  return new Intl.NumberFormat('en-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

// Function to load and display the invoice
async function loadInvoice(invoiceNumber) {
  try {
    const doc = await db.collection('invoices').doc(invoiceNumber).get();
    if (doc.exists) {
      const data = doc.data();
      displayReceipt(data, invoiceNumber);
    } else {
      alert('Invoice not found.');
      window.location.href = 'orders2.html'; // Redirect if invoice not found
    }
  } catch (error) {
    console.error('Error loading invoice:', error);
    alert('Failed to load invoice. Please try again.');
  }
}

// Function to display the receipt
function displayReceipt(invoiceData, invoiceNumber) {
  const invoiceNumberElement = document.getElementById('invoiceNumber');
  const dateElement = document.getElementById('date');
  const policeNumberElement = document.getElementById('policeNumber');
  const receiptTableBody = document.querySelector('#receiptTable tbody');
  const grandTotalElement = document.getElementById('grandTotal');

  // Display the invoice number and the current date/time
  invoiceNumberElement.textContent = invoiceNumber;
  dateElement.textContent = new Date().toLocaleString(); // Current date and time

  // Display the police number, leave it blank if "N/A"
  const policeNumber = invoiceData.policeNumber;
  policeNumberElement.textContent = policeNumber !== "N/A" ? policeNumber : "";

  // Clear any previous receipt rows
  receiptTableBody.innerHTML = '';

  let grandTotal = 0;

  // Iterate over each item in the invoice
  invoiceData.items.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.productName}</td>
      <td>${formatPrice(item.price)}</td>
      <td>${item.qty}</td>
      <td>${formatPrice(item.price * item.qty)}</td>
    `;
    receiptTableBody.appendChild(row);
    grandTotal += item.price * item.qty;
  });

  // Display the grand total
  grandTotalElement.textContent = formatPrice(grandTotal);
}

// Function to print the receipt
function printReceipt() {
  window.print();
}

// Function to go back to the cart page
function goBack() {
  window.location.href = 'kuitansi2.html';
}
//back to order page
function home() {
  window.location.href = 'orders2.html';
}

document.addEventListener('DOMContentLoaded', () => {
  currentInvoiceNumber = localStorage.getItem('currentInvoiceNumber');

  // Debugging: Log the currentInvoiceNumber to check if it's set correctly
  console.log('Loaded invoice number from localStorage:', currentInvoiceNumber);

  if (currentInvoiceNumber) {
    loadInvoice(currentInvoiceNumber);
  } else {
    alert('No invoice number found. Please try again.');
    window.location.href = 'orders2.html'; // Redirect if no invoice number is available
  }
});
