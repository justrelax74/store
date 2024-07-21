document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('add-product-form');

  form.addEventListener('submit', async (event) => {
      event.preventDefault(); // Prevent form from submitting the traditional way

      // Get and trim form values
      const productName = document.getElementById('product-name').value.trim();
      const sku = document.getElementById('sku').value.trim();
      const stock = parseInt(document.getElementById('stock').value.trim(), 10);
      const sellingPrice = parseInt(document.getElementById('selling-price').value.trim(), 10);

      // Validate inputs
      if (!productName || !sku || isNaN(stock) || isNaN(sellingPrice)) {
          alert('Please fill out all fields correctly.');
          return;
      }

      try {
          // Add new document to Firestore with proper data types
          await db.collection('inventory').doc(productName).set({
              SKU: sku,
              Stock: stock,
              'Selling Price': sellingPrice
          });

          // Redirect to inventory page after adding
          window.location.href = 'inventory.html';
      } catch (error) {
          console.error('Error adding document: ', error.message);
          alert('Error adding product. Please check the console for details.');
      }
  });
});
