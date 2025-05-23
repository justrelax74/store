// ======================
// DOM Elements & Firebase
// ======================
const inventoryTable = document.getElementById("inventory-table").getElementsByTagName("tbody")[0];
const saveButton = document.querySelector(".save-button") || createSaveButton();
const loadingSpinner = document.getElementById("loading-spinner");
const inventoryCollection = db.collection("Inventory");
const stockupCollection = db.collection("stockup");

// ======================
// Initialize
// ======================
document.addEventListener("DOMContentLoaded", () => {
  loadInventory();
  setupSorting();
   addSearchBar(); 
});

// ======================
// 1. Load Inventory (with Real-Time Updates)
// ======================
function loadInventory() {
  showLoading(true);
  
  // Real-time listener for changes
  inventoryCollection.onSnapshot((snapshot) => {
    inventoryTable.innerHTML = ""; // Clear table
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const row = createInventoryRow(doc.id, data);
      inventoryTable.appendChild(row);
    });
    
    attachInputListeners();
    showLoading(false);
  }, (error) => {
    console.error("Error loading inventory:", error);
    showLoading(false);
    alert("Failed to load inventory. Check console for details.");
  });
}

// ======================
// 2. Create Inventory Row (with Low-Stock Highlighting)
// ======================
function createInventoryRow(productName, data) {
  const row = document.createElement("tr");
  const stock = data.Stock || 0;
  const threshold = data.Threshold || 0;
  const stockup = Math.max(0, threshold - stock);
  
  // Highlight row if stock is below threshold
  if (stock < threshold) row.classList.add("low-stock");
  
  row.innerHTML = `
    <td>${productName}</td>
    <td>${data.Category || "Uncategorized"}</td>
    <td><input type="number" min="0" class="stock-input" value="${stock}" data-id="${productName}"></td>
    <td><input type="number" min="0" class="threshold-input" value="${threshold}" data-id="${productName}"></td>
    <td><input type="number" class="stockup-input" value="${stockup}" data-id="${productName}" readonly></td>
  `;
  
  return row;
}

// ======================
// 3. Input Handling (Live Updates)
// ======================
function attachInputListeners() {
  document.querySelectorAll(".stock-input, .threshold-input").forEach((input) => {
    input.addEventListener("input", handleInputChange);
  });
}

function handleInputChange(event) {
  const row = event.target.closest("tr");
  const stockInput = row.querySelector(".stock-input");
  const thresholdInput = row.querySelector(".threshold-input");
  const stockupInput = row.querySelector(".stockup-input");

  const stock = parseInt(stockInput.value) || 0;
  const threshold = parseInt(thresholdInput.value) || 0;
  const stockup = Math.max(0, threshold - stock);

  stockupInput.value = stockup;
  
  // Update row highlighting
  row.classList.toggle("low-stock", stock < threshold);
}

// ======================
// 4. Save Updates (Batch Write + Error Handling)
// ======================
async function saveUpdates() {
  showLoading(true);
  disableSaveButton(true);
  
  try {
    const batch = db.batch();
    const stockupBatch = db.batch();
    const rows = inventoryTable.querySelectorAll("tr");
    const updates = [];

    // Prepare all updates
    for (const row of rows) {
      const docId = row.querySelector(".stock-input").dataset.id;
      const stock = parseInt(row.querySelector(".stock-input").value) || 0;
      const threshold = parseInt(row.querySelector(".threshold-input").value) || 0;
      const stockup = parseInt(row.querySelector(".stockup-input").value) || 0;

      // Update Inventory
      const inventoryRef = inventoryCollection.doc(docId);
      batch.update(inventoryRef, {
        Stock: stock,
        Threshold: threshold,
        Stockup: stockup,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Prepare stockup data (if needed)
      if (stockup > 0) {
        const stockupRef = stockupCollection.doc(docId);
        stockupBatch.set(stockupRef, {
          ProductName: docId,
          Category: row.querySelector("td:nth-child(2)").innerText,
          Stock: stock,
          Threshold: threshold,
          Stockup: stockup,
          date: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // Execute batches
    await Promise.all([batch.commit(), stockupBatch.commit()]);
    window.location.href = "stockupsummary.html";
    
  } catch (error) {
    console.error("Save failed:", error);
    alert(`Save failed: ${error.message}\n\nTry again or check console.`);
  } finally {
    showLoading(false);
    disableSaveButton(false);
  }
}

// ======================
// 5. Sorting (All Columns)
// ======================
function setupSorting() {
  document.querySelectorAll(".sortable").forEach((header) => {
    header.addEventListener("click", () => sortTable(header));
  });
}

function sortTable(header) {
  const columnIndex = Array.from(header.parentNode.children).indexOf(header);
  const rows = Array.from(inventoryTable.querySelectorAll("tr"));
  const isNumeric = header.classList.contains("numeric");
  const sortDirection = header.getAttribute("data-sort") || "asc";

  rows.sort((a, b) => {
    const aValue = a.querySelector(`td:nth-child(${columnIndex + 1})`).innerText;
    const bValue = b.querySelector(`td:nth-child(${columnIndex + 1})`).innerText;
    
    return sortDirection === "asc" 
      ? compareValues(aValue, bValue, isNumeric) 
      : compareValues(bValue, aValue, isNumeric);
  });

  // Update UI
  inventoryTable.innerHTML = "";
  rows.forEach(row => inventoryTable.appendChild(row));
  
  // Toggle sort direction
  header.setAttribute("data-sort", sortDirection === "asc" ? "desc" : "asc");
  updateSortArrow(header);
}

function compareValues(a, b, isNumeric) {
  if (isNumeric) return (parseInt(a) || 0) - (parseInt(b) || 0);
  return a.localeCompare(b);
}

function updateSortArrow(header) {
  document.querySelectorAll(".sortable").forEach(h => h.innerHTML = h.innerHTML.replace(/↑|↓/, ""));
  header.innerHTML += header.getAttribute("data-sort") === "asc" ? " ↑" : " ↓";
}

// ======================
// Helper Functions
// ======================
function showLoading(show) {
  loadingSpinner.style.display = show ? "block" : "none";
}

function disableSaveButton(disable) {
  saveButton.disabled = disable;
  saveButton.textContent = disable ? "Saving..." : "Save Changes";
}

function createSaveButton() {
  const button = document.createElement("button");
  button.className = "save-button";
  button.textContent = "Save Changes";
  button.addEventListener("click", saveUpdates);
  document.querySelector(".container").appendChild(button);
  return button;
}

// ======================
// Fuzzy Search Function
// ======================
function fuzzySearch(text, query) {
  if (!query) return true; // Show all if no search term
  
  const searchTerms = query.toLowerCase().split(/\s+/);
  const textLower = text.toLowerCase();
  
  // Check if ALL search terms exist in the text (order doesn't matter)
  return searchTerms.every(term => textLower.includes(term));
}

// ======================
// Filter Inventory Table
// ======================
function filterInventory(searchQuery) {
  const rows = inventoryTable.querySelectorAll("tr");
  
  rows.forEach(row => {
    const productName = row.querySelector("td:nth-child(1)").textContent;
    const category = row.querySelector("td:nth-child(2)").textContent;
    
    // Combine fields for searching
    const searchText = `${productName} ${category}`;
    const isMatch = fuzzySearch(searchText, searchQuery);
    
    row.style.display = isMatch ? "" : "none";
    
    // Highlight matching keywords (optional)
    if (isMatch && searchQuery) {
      highlightMatches(row, searchQuery);
    }
  });
}

// ======================
// Highlight Search Matches
// ======================
function highlightMatches(row, query) {
  const cells = row.querySelectorAll("td");
  const searchTerms = query.toLowerCase().split(/\s+/);
  
  cells.forEach(cell => {
    let text = cell.textContent;
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, "gi");
      text = text.replace(regex, '<span class="highlight">$1</span>');
    });
    cell.innerHTML = text;
  });
}

// ======================
// Add Search Bar to UI
// ======================
function addSearchBar() {
  const container = document.querySelector(".container");
  
  const searchDiv = document.createElement("div");
  searchDiv.className = "search-container";
  
  searchDiv.innerHTML = `
    <input 
      type="text" 
      id="search-input" 
      placeholder="Search by product or category (e.g. 'oil engine')" 
      class="search-input"
    >
    <button id="clear-search" class="clear-search-btn">×</button>
  `;
  
  container.insertBefore(searchDiv, container.firstChild);
  
  // Add event listeners
  document.getElementById("search-input").addEventListener("input", (e) => {
    filterInventory(e.target.value);
  });
  
  document.getElementById("clear-search").addEventListener("click", () => {
    const searchInput = document.getElementById("search-input");
    searchInput.value = "";
    filterInventory("");
    removeHighlights();
  });
}

