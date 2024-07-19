let grandTotal = 0;
let items = [];
let selectedItemIndex = -1;

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

function updateInvoiceNumberDisplay() {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    if (invoiceNumber) {
        document.getElementById('invoiceNumberDisplay').textContent = `Invoice Number: ${invoiceNumber}`;
    }
}

function fetchInvoiceNumbers() {
    const datalist = document.getElementById('invoiceNumbers');
    db.collection('invoices').get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const option = document.createElement('option');
            option.value = doc.id;
            datalist.appendChild(option);
        });
    }).catch((error) => {
        console.error("Error fetching invoice numbers: ", error);
    });
}

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
                updateInvoiceNumberDisplay();
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
    const productName = document.getElementById('productName').value.trim();
    const qty = parseInt(document.getElementById('qty').value, 10);
    const price = parseFloat(document.getElementById('price').value);
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();

    // Validate qty and price
    if (productName && !isNaN(qty) && !isNaN(price) && selectedItemIndex >= 0) {
        const item = items[selectedItemIndex];
        const totalPrice = qty * price;
        grandTotal += totalPrice - item.totalPrice;

        item.productName = productName.toUpperCase();
        item.qty = qty;
        item.price = price;
        item.totalPrice = totalPrice;

        updateInvoiceItems();
        document.getElementById('grandTotal').textContent = formatNumber(grandTotal);

        setDate();
        updateInvoiceNumberDisplay();

        document.getElementById('productName').value = '';
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
    invoiceItems.innerHTML = '';

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

function editItem(index) {
    const item = items[index];
    document.getElementById('productName').value = item.productName;
    document.getElementById('qty').value = item.qty;
    document.getElementById('price').value = item.price;
    selectedItemIndex = index;
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

function addItemToInvoiceBox(name, qty, totalPrice) {
    const invoiceItems = document.getElementById('invoiceItems');
    const row = document.createElement('tr');

    const qtyCell = document.createElement('td');
    qtyCell.innerText = qty;
    row.appendChild(qtyCell);

    const nameCell = document.createElement('td');
    nameCell.innerText = name;
    row.appendChild(nameCell);

    const priceCell = document.createElement('td');
    priceCell.innerText = formatNumber(totalPrice); // Use totalPrice here
    row.appendChild(priceCell);

    invoiceItems.appendChild(row);
}

async function addItem() {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    const productName = document.getElementById('productName').value.trim();
    const qty = parseInt(document.getElementById('qty').value, 10);
    const price = parseFloat(document.getElementById('price').value);

    if (!invoiceNumber) {
        alert('Please enter an invoice number.');
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
            grandTotal: 0 // Initialize grandTotal
        };
    }

    const itemTotalPrice = qty * price;
    const item = {
        productName: productName.toUpperCase(),
        qty: qty,
        price: price,
        totalPrice: itemTotalPrice // Calculate and store the total price for the item
    };

    invoiceData.items.push(item);
    invoiceData.grandTotal += itemTotalPrice; // Update grandTotal with item total price

    await invoiceDocRef.set(invoiceData);

    addItemToInvoiceBox(productName, qty, itemTotalPrice); // Pass the total price to the function
    document.getElementById('grandTotal').innerText = formatNumber(invoiceData.grandTotal);

    // Clear input fields
    document.getElementById('productName').value = '';
    document.getElementById('qty').value = '';
    document.getElementById('price').value = '';
}

function printInvoice() {
    window.print();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('passwordPrompt').classList.remove('hide');
    document.getElementById('content').classList.remove('show');
    updateInvoiceNumberDisplay();
    fetchInvoiceNumbers(); // Fetch existing invoice numbers on load
});

async function generateNewInvoiceNumber() {
  try {
      const snapshot = await db.collection('invoices').get();
      let maxInvoiceNumber = 0;

      snapshot.forEach(doc => {
          const invoiceNumber = parseInt(doc.id, 10); // Ensure invoiceNumber is parsed as an integer
          if (invoiceNumber > maxInvoiceNumber) {
              maxInvoiceNumber = invoiceNumber;
          }
      });

      const newInvoiceNumber = maxInvoiceNumber + 1; // Increment the max invoice number by 1
      return newInvoiceNumber;

  } catch (error) {
      console.error("Error fetching invoice numbers: ", error);
      return null;
  }
}

async function addNewInvoiceNumber() {
  const newInvoiceNumber = await generateNewInvoiceNumber();
  if (newInvoiceNumber !== null) {
      document.getElementById('newInvoiceNumber').value = newInvoiceNumber;

      try {
          await db.collection('invoices').doc(newInvoiceNumber.toString()).set({
              date: new Date().toLocaleDateString(),
              items: [],
              grandTotal: 0
          });
          alert("New invoice number added successfully!");
      } catch (error) {
          console.error("Error adding new invoice number: ", error);
          alert("Error adding new invoice number.");
      }
  }
}

// Ensure you have Firebase initialization code here or somewhere in your script.js

document.addEventListener('DOMContentLoaded', () => {
  fetchInvoiceNumbers(); // Fetch existing invoice numbers on load
  generateNewInvoiceNumber(); // Generate a new invoice number on load
});
