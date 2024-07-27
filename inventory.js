// Helper function to format numbers with commas
function formatNumberWithCommas(number) {
    return number.toLocaleString();
}

// Function to handle inline editing
function handleInlineEdit(event) {
    if (!isEditMode) return; // Only allow editing if edit mode is active

    const target = event.target;
    if (target.tagName === 'TD' && target.classList.contains('editable')) {
        const originalText = target.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalText;
        target.innerHTML = '';
        target.appendChild(input);
        input.focus();

        input.addEventListener('blur', async () => {
            const newValue = input.value;
            target.textContent = newValue;

            // Get SKU from the row
            const sku = target.closest('tr').querySelector('td').textContent; // Get SKU from the first cell
            const field = target.dataset.field;

            try {
                // Update Firestore
                await db.collection(currentCollection).doc(sku).update({
                    [field]: isNaN(newValue) ? newValue : parseInt(newValue, 10) // Convert to number if needed
                });
            } catch (error) {
                console.error('Error updating document: ', error.message);
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    }
}

let isEditMode = false; // Flag to track whether edit mode is active
let currentCollection = 'inventory'; // Default collection

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('#inventory-table tbody');
    const collectionSelect = document.getElementById('collection-select');
    const collectionDropdown = document.getElementById('collection-dropdown');

    const collections = ["Ban", "Oli", "Air Radiator", "Shock Breaker", "Aki", "Lampu Stop", "Kampas Kopling", 
        "Tutup Kampas", "Busi", "Fender Liner", "Kampas Cakram Depan", 
        "Kampas Cakram Belakang", "Karet Pintu", "Tie Rod", "Rack End", "Lampu Depan", "Lain Lain"];

    // Populate the collection dropdown
    collections.forEach((collection) => {
        const div = document.createElement('div');
        div.textContent = collection;
        div.addEventListener('click', () => {
            currentCollection = collection;
            loadCollectionData(collection);
            collectionDropdown.style.display = 'none';
        });
        collectionDropdown.appendChild(div);
    });

    collectionSelect.addEventListener('click', () => {
        collectionDropdown.style.display = 'block';
    });

    // Function to load collection data
    async function loadCollectionData(collection) {
        tableBody.innerHTML = ''; // Clear existing table data

        try {
            // Fetch all documents from the specified collection
            const querySnapshot = await db.collection(collection).get();

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const row = document.createElement('tr');

                // Construct table row with data from Firestore
                row.innerHTML = `
                    <td>${doc.id}</td> <!-- Product Name -->
                    <td class="editable" data-field="SKU">${data.SKU || 'No SKU'}</td>
                    <td class="editable" data-field="Stock">${data.Stock || 0}</td>
                    <td class="editable" data-field="Selling Price">${data['Selling Price'] ? formatNumberWithCommas(data['Selling Price']) : 0}</td>
                `;
                tableBody.appendChild(row);
            });

            // Add event listener for inline editing
            tableBody.addEventListener('click', handleInlineEdit);

        } catch (error) {
            console.error("Error fetching inventory data: ", error.message);
        }
    }

    // Load default collection data on page load
    loadCollectionData(currentCollection);

    // Toggle edit mode
    document.getElementById('edit-mode-btn').addEventListener('click', () => {
        const editModeDiv = document.getElementById('edit-mode');
        const button = document.getElementById('edit-mode-btn');
        
        if (!isEditMode) {
            editModeDiv.style.display = 'block';
            button.textContent = 'View Mode';
            isEditMode = true;
        } else {
            editModeDiv.style.display = 'none';
            button.textContent = 'Edit Mode';
            isEditMode = false;
        }
    });

    // Add new product
    document.getElementById('add-product-form').addEventListener('submit', async (event) => {
        event.preventDefault();

        let productName = document.getElementById('product-name').value.trim();
        const sku = document.getElementById('sku').value.trim() || 'No SKU'; // Default SKU if empty
        const stock = parseInt(document.getElementById('stock').value.trim(), 10) || 0; // Default to 0 if empty
        const sellingPrice = parseInt(document.getElementById('selling-price').value.trim(), 10) || 0; // Default to 0 if empty

        // Replace '/' with space in productName
        productName = productName.replace(/\//g, ' ');

        if (!productName) {
            alert('Please enter a product name.');
            return;
        }

        try {
            // Add new document to Firestore with proper data types
            await db.collection(currentCollection).doc(productName).set({
                SKU: sku,
                Stock: stock,
                'Selling Price': sellingPrice
            });

            // Reload inventory to reflect changes
            loadCollectionData(currentCollection);
        } catch (error) {
            console.error('Error adding document: ', error.message);
            alert('Error adding product. Please check the console for details.');
        }
    });
});

// Function to toggle the mobile menu
function toggleMenu() {
    const menu = document.getElementById('navbarMenu');
    menu.classList.toggle('show');
}
