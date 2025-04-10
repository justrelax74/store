// Firebase configuration
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "AIzaSyANCk_iM4XtSX0VW6iETK-tJdWHGAWMbS0",
    authDomain: "megamasmotor-4008c.firebaseapp.com",
    projectId: "megamasmotor-4008c",
    storageBucket: "megamasmotor-4008c.appspot.com",
    messagingSenderId: "874673615212",
    appId: "1:874673615212:web:7f0ecdeee47fed60aa0349",
    measurementId: "G-LF6NB7ZKLE",
  };
  firebase.initializeApp(firebaseConfig);
}

// Firestore reference
const db = firebase.firestore();

// Load "no data" collection
async function loadNoData() {
  try {
    const querySnapshot = await db.collection("no data").get();
    const tableBody = document.querySelector("#data-table tbody");
    tableBody.innerHTML = "";

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const row = document.createElement("tr");

      // Product Name (ID column)
      const productNameCell = document.createElement("td");
      const productNameInput = document.createElement("input");
      productNameInput.type = "text";
      productNameInput.value = doc.id;
      productNameInput.onchange = () => updateDocumentField(doc.id, "productName", productNameInput.value);
      productNameCell.appendChild(productNameInput);
      row.appendChild(productNameCell);

      // Category (editable)
      const categoryCell = document.createElement("td");
      const categoryInput = document.createElement("input");
      categoryInput.type = "text";
      categoryInput.value = data.category || "";
      categoryInput.onchange = () => updateDocumentField(doc.id, "category", categoryInput.value);
      categoryCell.appendChild(categoryInput);
      row.appendChild(categoryCell);

      // Stock (editable)
      const stockCell = document.createElement("td");
      const stockInput = document.createElement("input");
      stockInput.type = "number";
      stockInput.value = data.stock || 0;
      stockInput.onchange = () => updateDocumentField(doc.id, "stock", parseInt(stockInput.value) || 0);
      stockCell.appendChild(stockInput);
      row.appendChild(stockCell);

      // Buying Price (editable)
      const buyingPriceCell = document.createElement("td");
      const buyingPriceInput = document.createElement("input");
      buyingPriceInput.type = "number";
      buyingPriceInput.value = data.buyingPrice || 0;
      buyingPriceInput.onchange = () => updateDocumentField(doc.id, "buyingPrice", parseFloat(buyingPriceInput.value) || 0);
      buyingPriceCell.appendChild(buyingPriceInput);
      row.appendChild(buyingPriceCell);

      // Price Per Unit (editable)
      const priceCell = document.createElement("td");
      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.value = data.pricePerUnit || "";
      priceInput.onchange = () => updateDocumentField(doc.id, "pricePerUnit", parseFloat(priceInput.value) || null);
      priceCell.appendChild(priceInput);
      row.appendChild(priceCell);

      // Actions (Delete and Upload buttons)
      const actionCell = document.createElement("td");

      // Delete Button
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.onclick = () => deleteDocument(doc.id);
      actionCell.appendChild(deleteButton);

      // Upload Button
      const uploadButton = document.createElement("button");
      uploadButton.textContent = "Upload";
      uploadButton.onclick = () => uploadProductToInventory(doc.id, data);
      actionCell.appendChild(uploadButton);

      row.appendChild(actionCell);
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading 'no data' collection:", error);
    alert("Failed to load data. Please try again.");
  }
}

// Update a specific field in Firestore
async function updateDocumentField(docId, fieldName, value) {
  try {
    const updateData = { [fieldName]: value };

    // Update productName in Firestore
    if (fieldName === "productName") {
      const docData = await db.collection("no data").doc(docId).get();
      const oldData = docData.data();

      // Delete old document and create a new one with updated name
      await db.collection("no data").doc(docId).delete();
      await db.collection("no data").doc(value).set(oldData);
      alert(`Product name updated successfully to ${value}.`);
    } else {
      await db.collection("no data").doc(docId).update(updateData);
      alert(`${fieldName} updated successfully.`);
    }

    loadNoData(); // Reload the table after update
  } catch (error) {
    console.error(`Error updating document ${docId}:`, error);
    alert("Failed to update the document. Please try again.");
  }
}

// Delete a document from Firestore
async function deleteDocument(docId) {
  if (confirm(`Are you sure you want to delete the document with Product Name: ${docId}?`)) {
    try {
      await db.collection("no data").doc(docId).delete();
      alert(`Document with Product Name: ${docId} has been deleted.`);
      loadNoData(); // Reload the table after deletion
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete the document. Please try again.");
    }
  }
}

// Upload a specific product to "Inventory"
async function uploadProductToInventory(docId, data) {
  try {
    const inventoryDoc = {
      SKU: "",
      "Selling Price": data.pricePerUnit || 0,
      "Buying Price": data.buyingPrice || 0,
      Stock: data.stock || 0,
      Category: data.category || "Uncategorized",
    };

    // Add to Inventory
    await db.collection("Inventory").doc(docId).set(inventoryDoc);

    // ✅ Save alias for future typo protection
    await db.collection("aliases").doc(docId.toLowerCase()).set({
      realName: docId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      source: "no data",
    });

    // Delete from no data
    await db.collection("no data").doc(docId).delete();
    alert(`Product "${docId}" uploaded and alias created.`);

    loadNoData();
  } catch (error) {
    console.error(`Error uploading product "${docId}" to Inventory:`, error);
    alert(`Failed to upload product "${docId}" to Inventory.`);
  }
}


// Load data when DOM is ready
document.addEventListener("DOMContentLoaded", loadNoData);
