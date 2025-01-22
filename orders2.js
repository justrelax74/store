import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Optional, if you use Firebase Storage

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCCk1TTc-p5_ncdzi_VDkGm-T3BeeyCY8U",
  authDomain: "megamas-2a861.firebaseapp.com",
  projectId: "megamas-2a861",
  storageBucket: "megamas-2a861.firebasestorage.app",
  messagingSenderId: "166611278041",
  appId: "1:166611278041:web:c23c22be420f4e28d846c8",
  measurementId: "G-QR8TPPPYZG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let deleteMode = false;
let showCheckedOutOrders = false;

// Start a new order
async function startNewOrder() {
  try {
    const invoicesCollection = collection(db, 'invoices');
    const snapshot = await getDocs(invoicesCollection);
    let lastInvoiceNumber = "00";

    if (!snapshot.empty) {
      const invoiceNumbers = snapshot.docs.map(doc => doc.id);
      invoiceNumbers.sort((a, b) => parseInt(a) - parseInt(b));
      lastInvoiceNumber = invoiceNumbers[invoiceNumbers.length - 1];
    }

    const newInvoiceNumber = String(parseInt(lastInvoiceNumber) + 1).padStart(2, '0');
    const newInvoiceRef = doc(invoicesCollection, newInvoiceNumber);

    await setDoc(newInvoiceRef, {
      grandTotal: 0,
      status: 'OPEN',
      items: []
    });

    localStorage.setItem('currentInvoiceNumber', newInvoiceNumber);
    window.location.href = 'kuitansi1.html';
  } catch (error) {
    console.error('Error starting new order:', error);
    alert('Failed to start a new order. Please try again.');
  }
}

// Load orders
async function loadOrders() {
  try {
    const invoicesCollection = collection(db, 'invoices');
    const snapshot = await getDocs(invoicesCollection);
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    ordersTableBody.innerHTML = '';

    snapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const invoiceNumber = docSnapshot.id;
      const grandTotal = data.grandTotal ? formatPrice(data.grandTotal) : 'N/A';

      // Check for empty orders
      if (grandTotal === 'N/A' || !data.items || data.items.length === 0) {
        deleteInvoice(invoiceNumber);
        return;
      }

      const productDetails = data.items
        ? data.items.map(item => `${item.productName} (Qty: ${item.qty}, Price: ${formatPrice(item.price)})`).join('<br>')
        : 'No items found';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${invoiceNumber}</td>
        <td>${data.carType || 'N/A'}</td>
        <td>${data.policeNumber || 'N/A'}</td>
        <td>${productDetails}</td>
        <td>${grandTotal}</td>
        <td>${data.status === 'checked_out' ? 'LUNAS' : 'OPEN'}</td>
        <td>
          <button onclick="editOrder('${invoiceNumber}')">Edit</button>
          <button onclick="deleteInvoice('${invoiceNumber}')">Delete</button>
        </td>
      `;
      ordersTableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    alert('Failed to load orders. Please try again.');
  }
}

// Delete an invoice
async function deleteInvoice(invoiceNumber) {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceNumber);
    await deleteDoc(invoiceRef);
    loadOrders();
  } catch (error) {
    console.error('Error deleting invoice:', error);
    alert('Failed to delete invoice. Please try again.');
  }
}

// Utility to format prices
function formatPrice(price) {
  return new Intl.NumberFormat('en-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

// Attach event listeners
document.getElementById('startNewOrderBtn').addEventListener('click', startNewOrder);
document.addEventListener('DOMContentLoaded', loadOrders);
