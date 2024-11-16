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
                    const grandTotal = data.grandTotal || 0;

                    // Add each product in the invoice to the table
                    items.forEach(item => {
                        const productName = item.name || "Unknown Product"; // Default to "Unknown Product" if not available
                        const quantity = item.quantity || 0; // Default to 0 if quantity is missing
                        const totalPrice = item.totalPrice || 0; // Default to 0 if totalPrice is missing

                        // Add row to the table for each product
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${invoiceNumber}</td>
                            <td>${productName}</td>
                            <td>${quantity}</td>
                            <td>Rp ${totalPrice.toLocaleString()}</td>
                        `;
                        salesTableBody.appendChild(row);

                        // Update total sales
                        totalSales += totalPrice;
                    });
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
