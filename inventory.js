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

            // Get Product Name (Document ID) from the row
            const productName = target.closest('tr').querySelector('td').textContent; // Get product name from the first cell
            const field = target.dataset.field;

            try {
                // Update Firestore
                await db.collection(currentCollection).doc(productName).update({
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

// Function to delete a product from Firestore
async function deleteProduct(productName) {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) {
        return; // Abort if the user cancels the delete operation
    }

    try {
        // Delete the product document from Firestore
        await db.collection(currentCollection).doc(productName).delete();
        alert(`${productName} has been deleted successfully.`);
        searchProducts(searchBar.value.trim()); // Refresh search after deletion
    } catch (error) {
        console.error('Error deleting document: ', error.message);
    }
}

let isEditMode = false; // Flag to track whether edit mode is active
let currentCollection = 'Inventory'; // Default collection

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('#inventory-table tbody');
    const searchBar = document.getElementById('search-bar');
    const searchBtn = document.getElementById('search-btn');

    // Function to clear the table
    function clearTable() {
        tableBody.innerHTML = ''; // Clear existing table data
    }

    // Function to load filtered products based on search by document ID (Product Name)
    async function searchProducts(keyword) {
        clearTable(); // Clear the table before loading new data

        const lowerCaseKeyword = keyword.toLowerCase(); // Convert the keyword to lowercase

        try {
            // Fetch all documents in the collection
            const querySnapshot = await db.collection(currentCollection).get();

            let found = false;

            querySnapshot.forEach((doc) => {
                const productName = doc.id.toLowerCase(); // Convert document ID (product name) to lowercase
                if (productName.includes(lowerCaseKeyword)) { // Match any part of the product name
                    found = true;
                    const data = doc.data();
                    const row = document.createElement('tr');

                    // Construct table row with product details and delete button if in edit mode
                    row.innerHTML = `
                        <td>${doc.id}</td> <!-- Product Name (Document ID) -->
                        <td class="editable" data-field="SKU">${data.SKU || 'No SKU'}</td>
                        <td class="editable" data-field="Stock">${data.Stock || 0}</td>
                        <td class="editable" data-field="Selling Price">${formatNumberWithCommas(data['Selling Price']) || 0}</td>
                        ${isEditMode ? `<td><button class="delete-btn" data-id="${doc.id}">Delete</button></td>` : ''}
                    `;
                    tableBody.appendChild(row);
                }
            });

            if (!found) {
                tableBody.innerHTML = '<tr><td colspan="4">No matching products found</td></tr>';
            }

            // Add event listeners for delete buttons
            if (isEditMode) {
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const productName = e.target.dataset.id; // Get product name (document ID)
                        deleteProduct(productName);
                    });
                });
            }

        } catch (error) {
            console.error("Error searching inventory: ", error.message);
        }
    }

    // Event listener for the search button
    searchBtn.addEventListener('click', () => {
        const keyword = searchBar.value.trim();
        if (keyword) {
            searchProducts(keyword);
        }
    });

    // Trigger search on pressing Enter
    searchBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const keyword = searchBar.value.trim();
            if (keyword) {
                searchProducts(keyword);
            }
        }
    });

    // Toggle edit mode
    document.getElementById('edit-mode-btn').addEventListener('click', () => {
        const button = document.getElementById('edit-mode-btn');

        if (!isEditMode) {
            button.textContent = 'View Mode';
            isEditMode = true;
        } else {
            button.textContent = 'Edit Mode';
            isEditMode = false;
        }

        // Reload the collection to show or hide the delete buttons
        searchProducts(searchBar.value.trim());
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

            alert('Product added successfully!');
            clearTable(); // Clear the table after adding the item
            searchBar.value = ''; // Reset the search bar
        } catch (error) {
            console.error('Error adding document: ', error.message);
            alert('Error adding product. Please check the console for details.');
        }
    });

    // Initially, make the table blank on page load
    clearTable(); // Clear table on page load
});
