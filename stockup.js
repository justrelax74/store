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
  
  inventoryCollection.onSnapshot((snapshot) => {
    inventoryTable.innerHTML = "";
    
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
// 2. Create Inventory Row
// ======================
function createInventoryRow(productName, data) {
  const row = document.createElement("tr");
  const stock = data.Stock || 0;
  const threshold = data.Threshold || 0;
  const stockup = Math.max(0, threshold - stock);
  
  if (stock < threshold) row.classList.add("low-stock");
  
  row.innerHTML = `
    <td data-original="${productName}">${productName}</td>
    <td data-original="${data.Category || "Uncategorized"}">${data.Category || "Uncategorized"}</td>
    <td><input type="number" min="0" class="stock-input" value="${stock}" data-id="${productName}"></td>
    <td><input type="number" min="0" class="threshold-input" value="${threshold}" data-id="${productName}"></td>
    <td><input type="number" class="stockup-input" value="${stockup}" data-id="${productName}" readonly></td>
  `;
  
  return row;
}

// ======================
// 3. Search Functionality
// ======================
function addSearchBar() {
  const container = document.querySelector(".container");
  const searchDiv = document.createElement("div");
  searchDiv.className = "search-container";
  
  searchDiv.innerHTML = `
    <input 
      type="text" 
      id="search-input" 
      placeholder="Search products or categories..." 
      class="search-input"
    >
    <button id="clear-search" class="clear-search-btn">×</button>
  `;
  
  container.insertBefore(searchDiv, container.firstChild);
  
  // Debounced search
  let searchTimeout;
  const searchInput = document.getElementById("search-input");
  
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterInventory(e.target.value);
    }, 300);
  });
  
  document.getElementById("clear-search").addEventListener("click", () => {
    searchInput.value = "";
    filterInventory("");
  });
}

function filterInventory(query) {
  const rows = inventoryTable.querySelectorAll("tr");
  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
  
  rows.forEach(row => {
    const productCell = row.querySelector("td:nth-child(1)");
    const categoryCell = row.querySelector("td:nth-child(2)");
    const productName = productCell.getAttribute("data-original").toLowerCase();
    const category = categoryCell.getAttribute("data-original").toLowerCase();
    
    const isMatch = searchTerms.length === 0 || 
                   searchTerms.every(term => 
                     productName.includes(term) || 
                     category.includes(term)
                   );
    
    row.style.display = isMatch ? "" : "none";
    
    if (isMatch && searchTerms.length > 0) {
      highlightMatches(productCell, searchTerms);
      highlightMatches(categoryCell, searchTerms);
    } else {
      restoreOriginalText(productCell);
      restoreOriginalText(categoryCell);
    }
  });
}

function highlightMatches(cell, searchTerms) {
  const originalText = cell.getAttribute("data-original");
  let highlightedText = originalText;
  
  searchTerms.forEach(term => {
    const regex = new RegExp(`(${escapeRegExp(term)})`, "gi");
    highlightedText = highlightedText.replace(regex, '<span class="highlight">$1</span>');
  });
  
  cell.innerHTML = highlightedText;
}

function restoreOriginalText(cell) {
  cell.textContent = cell.getAttribute("data-original");
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ======================
// 4. Input Handling
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
  row.classList.toggle("low-stock", stock < threshold);
}

// ======================
// 5. Save Updates
// ======================
async function saveUpdates() {
  showLoading(true);
  disableSaveButton(true);
  
  try {
    const batch = db.batch();
    const stockupBatch = db.batch();
    const rows = inventoryTable.querySelectorAll("tr");
    
    for (const row of rows) {
      const docId = row.querySelector(".stock-input").dataset.id;
      const stock = parseInt(row.querySelector(".stock-input").value) || 0;
      const threshold = parseInt(row.querySelector(".threshold-input").value) || 0;
      const stockup = parseInt(row.querySelector(".stockup-input").value) || 0;

      const inventoryRef = inventoryCollection.doc(docId);
      batch.update(inventoryRef, {
        Stock: stock,
        Threshold: threshold,
        Stockup: stockup,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });

      if (stockup > 0) {
        const stockupRef = stockupCollection.doc(docId);
        stockupBatch.set(stockupRef, {
          ProductName: docId,
          Category: row.querySelector("td:nth-child(2)").getAttribute("data-original"),
          Stock: stock,
          Threshold: threshold,
          Stockup: stockup,
          date: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }

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
// 6. Sorting
// ======================
// ======================
// Sorting Implementation (Final Fix)
// ======================
function setupSorting() {
  document.querySelectorAll(".sortable").forEach((header) => {
    // Add arrow elements
    header.innerHTML = `
      ${header.textContent}
      <span class="sort-arrow asc">↑</span>
      <span class="sort-arrow desc">↓</span>
    `;
    
    header.addEventListener("click", () => sortTable(header));
  });
}

function sortTable(header) {
  const columnIndex = Array.from(header.parentNode.children).indexOf(header);
  const rows = Array.from(inventoryTable.querySelectorAll("tr"));
  const isNumeric = header.classList.contains("numeric");
  const currentDirection = header.getAttribute("data-sort-direction");
  
  // Determine new direction
  const newDirection = currentDirection === "asc" ? "desc" : "asc";
  
  // Reset all headers
  document.querySelectorAll(".sortable").forEach(h => {
    h.removeAttribute("data-sort-direction");
  });
  
  // Set new direction
  header.setAttribute("data-sort-direction", newDirection);
  
  // Sort the rows
  rows.sort((a, b) => {
    const aValue = a.querySelector(`td:nth-child(${columnIndex + 1})`).textContent;
    const bValue = b.querySelector(`td:nth-child(${columnIndex + 1})`).textContent;
    
    if (isNumeric) {
      return newDirection === "asc" 
        ? (parseInt(aValue) - parseInt(bValue))
        : (parseInt(bValue) - parseInt(aValue));
    }
    return newDirection === "asc"
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  // Update the table
  inventoryTable.innerHTML = "";
  rows.forEach(row => inventoryTable.appendChild(row));
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
