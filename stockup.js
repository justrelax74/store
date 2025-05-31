// ======================
// DOM Elements & Firebase
// ======================
const inventoryTable = document.getElementById("inventory-table").getElementsByTagName("tbody")[0];
const saveButton = document.querySelector(".save-button") || createSaveButton();
const loadingSpinner = document.getElementById("loading-spinner");
const inventoryCollection = db.collection("Inventory");
const stockupCollection = db.collection("stockup");
let categories = []; // To store all available categories

// ====================== 
// Initialize
// ======================
document.addEventListener("DOMContentLoaded", () => {
  addSearchBar();
  loadInventory();
  setupSorting();
});

// ======================
// Combined Search and Category Filter
// ======================
function addSearchBar() {
  const container = document.querySelector(".container");
  const searchDiv = document.createElement("div");
  searchDiv.className = "search-filter-container";
  
  searchDiv.innerHTML = `
    <div class="search-wrapper">
      <input 
        type="text" 
        id="search-input" 
        placeholder="Search products or categories..." 
        class="search-input"
      >
      <button id="clear-search" class="clear-search-btn">×</button>
    </div>
    <div class="filter-wrapper">
      <select id="category-filter" class="category-filter">
        <option value="all">All Categories</option>
      </select>
    </div>
  `;
  
  const title = document.querySelector('.page-title') || container.firstChild;
  container.insertBefore(searchDiv, title.nextSibling);
  
  setupSearchAndFilter();
  loadCategories();
}

function setupSearchAndFilter() {
  const searchInput = document.getElementById("search-input");
  let searchTimeout;
  
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
  
  document.getElementById("category-filter").addEventListener("change", () => {
    filterInventory(searchInput.value);
  });
}

// ======================
// Load Categories
// ======================
function loadCategories() {
  const categoryFilter = document.getElementById("category-filter");
  
  if (!categoryFilter) {
    console.warn("Category filter element not found");
    return;
  }
  
  while (categoryFilter.options.length > 1) {
    categoryFilter.remove(1);
  }
  
  inventoryCollection.get().then((snapshot) => {
    const uniqueCategories = new Set(["Uncategorized"]);
    
    snapshot.forEach((doc) => {
      const category = doc.data().Category || "Uncategorized";
      uniqueCategories.add(category);
    });
    
    Array.from(uniqueCategories)
      .sort()
      .forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
      });
  }).catch(error => {
    console.error("Error loading categories:", error);
  });
}

// ======================
// Inventory Functions (REVISED)
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
  });
}

function createInventoryRow(productName, data) {
  const row = document.createElement("tr");
  const stock = parseInt(data.Stock) || 0;
  const threshold = data.Threshold !== undefined && data.Threshold !== null ? parseInt(data.Threshold) : null;
  const category = data.Category || "Uncategorized";
  
  // Initialize stockup from data (regardless of threshold)
  let stockup = data.Stockup !== undefined && data.Stockup !== null ? parseInt(data.Stockup) : "";
  let isAutofilled = false;
  
  // Only autofill if threshold exists and is > 0, and stock is below threshold
  if (threshold !== null && threshold > 0 && stock < threshold) {
    if (!data.wasManuallyEdited && stockup === "") {
      stockup = threshold - stock; // Auto-calculate only if not manually set
      isAutofilled = true;
    }
  }
  
  // Highlight row if low stock
  if (threshold !== null && threshold > 0 && stock < threshold) {
    row.classList.add("low-stock");
  }
  
  row.innerHTML = `
    <td data-original="${productName}">${productName}</td>
    <td data-original="${category}">${category}</td>
    <td><input type="number" min="0" class="stock-input" value="${stock}" data-id="${productName}"></td>
    <td><input type="number" min="0" class="threshold-input" value="${threshold !== null ? threshold : ''}" data-id="${productName}"></td>
    <td>
      <input 
        type="number" 
        min="0" 
        class="stockup-input" 
        value="${stockup}" 
        data-id="${productName}"
        ${isAutofilled ? 'data-autofilled="true" style="color: red;"' : ''}
      >
    </td>
  `;
  
  return row;
}


// ======================
// Filtering Functions
// ======================
function filterInventory(query) {
  const rows = inventoryTable.querySelectorAll("tr");
  const selectedCategory = document.getElementById("category-filter").value;
  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
  
  rows.forEach(row => {
    const productCell = row.querySelector("td:nth-child(1)");
    const categoryCell = row.querySelector("td:nth-child(2)");
    const productName = productCell.getAttribute("data-original").toLowerCase();
    const category = categoryCell.getAttribute("data-original").toLowerCase();
    
    const categoryMatch = selectedCategory === "all" || 
                         categoryCell.getAttribute("data-original") === selectedCategory;
    
    const searchMatch = searchTerms.length === 0 || 
                       searchTerms.every(term => 
                         productName.includes(term) || 
                         category.includes(term)
                       );
    
    row.style.display = (categoryMatch && searchMatch) ? "" : "none";
    
    if (searchMatch && searchTerms.length > 0) {
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
// Input Handling (REVISED)
// ======================
function handleInputChange(event) {
  const row = event.target.closest("tr");
  const stockInput = row.querySelector(".stock-input");
  const thresholdInput = row.querySelector(".threshold-input");
  const stockupInput = row.querySelector(".stockup-input");

  const stock = parseInt(stockInput.value) || 0;
  const threshold = thresholdInput.value === "" ? null : parseInt(thresholdInput.value);
  const isStockupAutofilled = stockupInput.hasAttribute("data-autofilled");

  // Only autofill if threshold exists and is > 0, and stock is below threshold
  if (threshold !== null && threshold > 0 && stock < threshold) {
    if (isStockupAutofilled || stockupInput.value === "") {
      const stockup = threshold - stock;
      stockupInput.value = stockup;
      stockupInput.style.color = "red";
      stockupInput.setAttribute("data-autofilled", "true");
      row.classList.add("low-stock");
    }
  } else {
    // Only clear if it was autofilled (keep manual entries)
    if (isStockupAutofilled) {
      stockupInput.value = "";
      stockupInput.style.color = "";
      stockupInput.removeAttribute("data-autofilled");
      row.classList.remove("low-stock");
    }
  }
}


function attachInputListeners() {
  document.querySelectorAll(".stock-input, .threshold-input").forEach((input) => {
    input.addEventListener("input", handleInputChange);
  });
  
  document.querySelectorAll(".stockup-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      e.target.style.color = ""; // Remove red
      e.target.removeAttribute("data-autofilled"); // Mark as manual
    });
  });
}

// ======================
// Save Updates (REVISED)
// ======================
async function saveUpdates() {
  showLoading(true);
  disableSaveButton(true);
  
  try {
    const batch = db.batch();
    const stockupBatch = db.batch();
    const rows = inventoryTable.querySelectorAll("tr");
    let hasEdits = false;

    for (const row of rows) {
      const docId = row.querySelector(".stock-input").dataset.id;
      const stockInput = row.querySelector(".stock-input");
      const thresholdInput = row.querySelector(".threshold-input");
      const stockupInput = row.querySelector(".stockup-input");

      const stock = parseInt(stockInput.value) || 0;
      const threshold = thresholdInput.value === "" ? null : parseInt(thresholdInput.value);
      const stockupValue = stockupInput.value;
      const stockup = stockupValue === "" ? null : parseInt(stockupValue);
      const isStockupAutofilled = stockupInput.hasAttribute("data-autofilled");

      // Always save the stockup value if it exists, regardless of threshold
      const updateData = {
        Stock: stock,
        Threshold: threshold,
        wasManuallyEdited: !isStockupAutofilled,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (stockup !== null) {
        updateData.Stockup = stockup;
      } else {
        updateData.Stockup = null;
      }

      batch.update(inventoryCollection.doc(docId), updateData);

      // Add to stockup collection if manually edited or has value
      if ((!isStockupAutofilled || threshold === null) && stockup !== null && stockup > 0) {
        stockupBatch.set(stockupCollection.doc(docId), {
          ProductName: docId,
          Category: row.querySelector("td:nth-child(2)").getAttribute("data-original"),
          Stock: stock,
          Threshold: threshold,
          Stockup: stockup,
          date: firebase.firestore.FieldValue.serverTimestamp(),
          wasManuallyEdited: !isStockupAutofilled
        });
      }

      hasEdits = true;
    }

    if (hasEdits) {
      await Promise.all([batch.commit(), stockupBatch.commit()]);
      window.location.href = "stockupsummary.html";
    } else {
      alert("No changes detected.");
    }
  } catch (error) {
    console.error("Save failed:", error);
    alert(`Error: ${error.message}`);
  } finally {
    showLoading(false);
    disableSaveButton(false);
  }
}

// ======================
// Sorting Functions
// ======================
function setupSorting() {
  document.querySelectorAll(".sortable").forEach((header) => {
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
  
  const newDirection = currentDirection === "asc" ? "desc" : "asc";
  
  document.querySelectorAll(".sortable").forEach(h => {
    h.removeAttribute("data-sort-direction");
  });
  
  header.setAttribute("data-sort-direction", newDirection);
  
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
