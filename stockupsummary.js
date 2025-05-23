document.addEventListener("DOMContentLoaded", async () => {
  const stockupTable = document.getElementById("stockup-table").getElementsByTagName("tbody")[0];
  const stockupCollection = db.collection("stockup");

  try {
    const snapshot = await stockupCollection.get();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.ProductName}</td>
        <td>${data.Category}</td>
        <td>${data.Stock}</td>
        <td>${data.Threshold}</td>
        <td>${data.Stockup}</td>
      `;
      stockupTable.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading stockup summary:", error);
  }
});
