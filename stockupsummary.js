document.addEventListener("DOMContentLoaded", async () => {
  const stockupTable = document.getElementById("stockup-table").getElementsByTagName("tbody")[0];
  const stockupCollection = db.collection("stockup");

  try {
    // Clear the table first
    stockupTable.innerHTML = "";

    // Get today's date range (start of day to end of day)
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Query for today's changes only
    const query = stockupCollection
      .where("date", ">=", startOfDay)
      .where("date", "<=", endOfDay);
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      stockupTable.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 20px;">
            NO STOCK CHANGES WERE MADE TODAY
          </td>
        </tr>`;
      return;
    }

    // Display today's changes
    snapshot.forEach((doc) => {
      const data = doc.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.ProductName}</td>
        <td>${data.Category}</td>
        <td>${data.Stock}</td>
        <td>${data.Threshold}</td>
        <td class="stockup-value">${data.Stockup}</td>
      `;
      stockupTable.appendChild(row);
    });

  } catch (error) {
    console.error("Error loading today's stockup summary:", error);
    stockupTable.innerHTML = `
      <tr>
        <td colspan="5">Error loading today's changes. Please try again.</td>
      </tr>`;
  }
});