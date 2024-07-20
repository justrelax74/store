import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyANCk_iM4XtSX0VW6iETK-tJdWHGAWMbS0",
  authDomain: "megamasmotor-4008c.firebaseapp.com",
  projectId: "megamasmotor-4008c",
  storageBucket: "megamasmotor-4008c.appspot.com",
  messagingSenderId: "874673615212",
  appId: "1:874673615212:web:7f0ecdeee47fed60aa0349",
  measurementId: "G-LF6NB7ZKLE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchInvoices() {
    console.log("Fetching invoices...");
    const invoiceTableBody = document.getElementById('invoiceTableBody');
    const invoicesCollection = collection(db, 'invoices');

    try {
        const invoiceSnapshot = await getDocs(invoicesCollection);
        console.log("Invoices fetched:", invoiceSnapshot.size);
        
        invoiceSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Invoice data:", data);
            const row = document.createElement('tr');

            const invoiceNumberCell = document.createElement('td');
            invoiceNumberCell.textContent = doc.id;
            row.appendChild(invoiceNumberCell);

            const dateCell = document.createElement('td');
            dateCell.textContent = data.date || 'N/A';
            row.appendChild(dateCell);

            const itemsCell = document.createElement('td');
            itemsCell.textContent = data.items ? data.items.map(item => `${item.qty} x ${item.productName}`).join(', ') : 'N/A';
            row.appendChild(itemsCell);

            const grandTotalCell = document.createElement('td');
            grandTotalCell.textContent = data.grandTotal !== undefined ? formatNumber(data.grandTotal) : 'N/A';
            row.appendChild(grandTotalCell);

            invoiceTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error fetching invoices:", error);
    }
}

function formatNumber(number) {
    return number.toLocaleString('id-ID');
}

document.addEventListener('DOMContentLoaded', fetchInvoices);
