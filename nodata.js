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

const db = firebase.firestore();

// Load "no data" collection
async function loadNoData() {
  const tableBody = document.querySelector("#data-table tbody");
  tableBody.innerHTML = "";
  const snapshot = await db.collection("no data").get();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const row = document.createElement("tr");

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = doc.id;
    nameInput.onchange = () => updateDocumentField(doc.id, "productName", nameInput.value);
    row.appendChild(td(nameInput));

    const categoryInput = input("text", data.category || "", val => updateDocumentField(doc.id, "category", val));
    row.appendChild(td(categoryInput));

    const stockInput = input("number", data.stock || 0, val => updateDocumentField(doc.id, "stock", parseInt(val) || 0));
    row.appendChild(td(stockInput));

    const buyingPriceInput = input("number", data.buyingPrice || 0, val => updateDocumentField(doc.id, "buyingPrice", parseFloat(val) || 0));
    row.appendChild(td(buyingPriceInput));

    const priceInput = input("number", data.pricePerUnit || 0, val => updateDocumentField(doc.id, "pricePerUnit", parseFloat(val) || null));
    row.appendChild(td(priceInput));

    const actionCell = document.createElement("td");
    const deleteBtn = button("Delete", () => deleteDocument(doc.id));
    const uploadBtn = button("Upload", () => uploadProductToInventory(doc.id, data));
    actionCell.appendChild(deleteBtn);
    actionCell.appendChild(uploadBtn);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  });
}

function td(child) {
  const cell = document.createElement("td");
  cell.appendChild(child);
  return cell;
}

function input(type, value, onChange) {
  const el = document.createElement("input");
  el.type = type;
  el.value = value;
  el.onchange = () => onChange(el.value);
  return el;
}

function button(label, onClick) {
  const el = document.createElement("button");
  el.textContent = label;
  el.onclick = onClick;
  return el;
}

// Update field or rename doc
async function updateDocumentField(docId, field, value) {
  const docRef = db.collection("no data").doc(docId);
  const snap = await docRef.get();
  if (!snap.exists) return;

  if (field === "productName") {
    const newName = value.trim().toUpperCase();
    const oldName = docId.trim().toUpperCase();
    if (newName === oldName) return;

    const oldData = snap.data();

    await db.collection("aliases").doc(oldName.toLowerCase()).set({
      realName: newName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      source: "manual rename from no data"
    });

    await db.collection("no data").doc(oldName).delete();
    await db.collection("no data").doc(newName).set(oldData);
    alert(`Renamed "${oldName}" → "${newName}" with alias.`);
  } else {
    await docRef.update({ [field]: value });
  }

  loadNoData();
}

async function deleteDocument(docId) {
  if (confirm(`Delete product: ${docId}?`)) {
    await db.collection("no data").doc(docId).delete();
    loadNoData();
  }
}

// Safe upload with merge
async function uploadProductToInventory(docId, data) {
  const updateFields = {
    "Selling Price": data.pricePerUnit || 0,
    "Buying Price": data.buyingPrice || 0,
    Stock: data.stock || 0,
    Category: data.category || "Uncategorized"
  };

  await db.collection("Inventory").doc(docId).set(updateFields, { merge: true });
  await db.collection("no data").doc(docId).delete();
  alert(`Uploaded "${docId}" to Inventory.`);
  loadNoData();
}

document.addEventListener("DOMContentLoaded", loadNoData);
