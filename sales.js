document.getElementById('getSalesDataButton').addEventListener('click', async () => {
  const startDate = new Date(document.getElementById('startDate').value);
  const endDate = new Date(document.getElementById('endDate').value);
  const salesTableBody = document.getElementById('salesTableBody');
  const totalSalesElement = document.getElementById('totalSales');
  let totalSales = 0;

  // Clear the table before fetching new data
  salesTableBody.innerHTML = '';

  // Check if dates are valid
  if (isNaN(startDate) || isNaN(endDate)) {
      alert("Please select valid start and end dates.");
      return;
  }

  if (startDate > endDate) {
      alert("Start date cannot be after end date.");
      return;
  }

  // Iterate through each day within the selected date range
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0]; // Format date as YYYY-MM-DD

      try {
          const snapshot = await db.collection(dateString).get();
          console.log(`Fetching sales data for: ${dateString}`); // Debug log

          if (!snapshot.empty) {
              snapshot.forEach(doc => {
                  const data = doc.data();
                  const invoiceNumber = doc.id;
                  const items = data.items || []; // Get items from the order
                  let invoiceSummary = []; // To store the summarized string for products
                  let grandTotal = 0;

                  // Summarize the items for the invoice
                  items.forEach(item => {
                      const productName = item.productName || "Unknown Product"; // Ensure correct field name
                      const qty = item.qty || 0;  // Ensure correct field name for quantity
                      const price = item.price || 0; // Ensure correct field name for price per unit
                      const totalPrice = price * qty; // Calculate the total price for each item
                      grandTotal += totalPrice;

                      // Add summarized product to invoiceSummary
                      invoiceSummary.push(`${productName} (${qty}x${price.toLocaleString()})`);
                  });

                  // Join all summarized products in a single string
                  const invoiceSummaryText = invoiceSummary.join(", ");

                  // Add row to the table for the invoice
                  const row = document.createElement('tr');
                  row.innerHTML = `
                      <td>${invoiceNumber}</td>
                      <td>${invoiceSummaryText}</td>
                      <td>Rp ${grandTotal.toLocaleString()}</td>
                  `;
                  salesTableBody.appendChild(row);

                  // Update total sales
                  totalSales += grandTotal;
              });
          } else {
              console.log(`No sales data found for ${dateString}`);
          }
      } catch (error) {
          console.error(`Error fetching data for ${dateString}:`, error);
      }

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
  }

  // Update total sales display
  totalSalesElement.textContent = `Rp ${totalSales.toLocaleString()}`;
});
