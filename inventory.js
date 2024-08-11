let currentCollection = 'Inventory'; // Default collection
let currentPage = 1;
const itemsPerPage = 25;

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('#inventory-table tbody');
    const collectionSelect = document.getElementById('collection-select');
    const collectionDropdown = document.getElementById('collection-dropdown');
    const paginationContainer = document.getElementById('pagination');

    const collections = ["Inventory", "Ban", "Oli", "Air Radiator", "Shock Breaker", "Aki", "Lampu Stop", "Kampas Kopling", 
        "Tutup Kampas", "Busi", "Fender Liner", "Kampas Cakram Depan", 
        "Kampas Cakram Belakang", "Karet Pintu", "Tie Rod", "Rack End", "Lampu Depan", "Lain Lain"];

    // Populate the collection dropdown
    collections.forEach((collection) => {
        const div = document.createElement('div');
        div.textContent = collection;
        div.addEventListener('click', () => {
            currentCollection = collection;
            currentPage = 1; // Reset to the first page when switching collections
            loadCollectionData(collection, currentPage);
            collectionDropdown.style.display = 'none';
        });
        collectionDropdown.appendChild(div);
    });

    collectionSelect.addEventListener('click', () => {
        collectionDropdown.style.display = 'block';
    });

    // Function to load collection data with pagination
    async function loadCollectionData(collection, page) {
        tableBody.innerHTML = ''; // Clear existing table data

        try {
            const querySnapshot = await db.collection(collection)
                .orderBy('SKU')
                .offset((page - 1) * itemsPerPage)
                .limit(itemsPerPage)
                .get();

            const totalItemsSnapshot = await db.collection(collection).get();
            const totalItems = totalItemsSnapshot.size;
            const totalPages = Math.ceil(totalItems / itemsPerPage);

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

            // Update pagination
            updatePagination(totalPages, page);

        } catch (error) {
            console.error("Error fetching inventory data: ", error.message);
        }
    }

    // Function to update pagination
    function updatePagination(totalPages, currentPage) {
        paginationContainer.innerHTML = ''; // Clear existing pagination

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => {
                loadCollectionData(currentCollection, i);
            });
            paginationContainer.appendChild(pageButton);
        }
    }

    // Load default collection data on page load
    loadCollectionData(currentCollection, currentPage);

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
            loadCollectionData(currentCollection, currentPage);
        } catch (error) {
            console.error('Error adding document: ', error.message);
            alert('Error adding product. Please check the console for details.');
        }
    });
});
