// Initialize Firebase

// Chart variables
let combinedChart, avgRevenueChart, avgCustomerChart;

// Event listener for fetching sales data
document.getElementById('getSalesDataButton').addEventListener('click', async () => {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    const salesTableBody = document.getElementById('salesTableBody');
    const totalSalesElement = document.getElementById('totalSales');
    const totalCustomersElement = document.getElementById('totalCustomers');
    const totalProfitElement = document.getElementById('totalProfit');
    const roiElement = document.getElementById('roi');

    let totalSales = 0;
    let totalCustomers = 0;
    let totalProfit = 0;
    let totalBuyingCost = 0;
    let serviceProfit = 0;  // New variable to track service profit
    

    const dailySales = [];
    const dailyCustomers = [];
    const labels = [];

    salesTableBody.innerHTML = '';
    resetCharts();

    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
        alert("Please select valid start and end dates.");
        return;
    }

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];

        try {
            const snapshot = await db.collection(dateString).get();
            let dailyTotal = 0;
            let dailyCustomerCount = 0;
            let dailyProfit = 0;
            let dailyBuyingCost = 0;

            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const invoiceNumber = doc.id;
                    const items = data.items || [];
                    const carType = data.carType || "Unknown";
                    const policeNumber = data.policeNumber || "N/A";

                    dailyCustomerCount++;

                    items.forEach((item, index) => {
                        const productName = item.productName || "Unknown Product";
                        const qty = item.qty || 0;
                        const price = item.price || 0;
                        const totalPrice = price * qty;
                        const buyingPrice = item.buyingPrice || 0;
                        const category = item.category || "UNKNOWN";

                        let profit = totalPrice - (buyingPrice * qty);
                        let displayProfit = profit.toLocaleString();

                        if (buyingPrice === 0 && category !== "SERVICE") {
                            displayProfit = "N/A"; // Exclude from profit calculation
                        } else {
                            dailyProfit += profit;
                            if (buyingPrice > 0) {
                                dailyBuyingCost += buyingPrice * qty; // Only sum if Buying Price > 0
                            }
                        }
                        
                        // Track service profit separately
                        if (category === "SERVICE") {
                            serviceProfit += profit;
                        }
                        
                        dailyTotal += totalPrice;

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${index === 0 ? invoiceNumber : ''}</td>
                            <td>${productName}</td>
                            <td>${qty}</td>
                            <td>${price.toLocaleString()}</td>
                            <td>Rp ${totalPrice.toLocaleString()}</td>
                            <td>${category}</td>
                            <td>${displayProfit}</td>
                            <td>${carType}</td>
                            <td>${policeNumber}</td>
                        `;
                        salesTableBody.appendChild(row);
                    });
                });

                totalSales += dailyTotal;
                totalProfit += dailyProfit;
                totalBuyingCost += dailyBuyingCost;
                totalCustomers += dailyCustomerCount;
            }

            labels.push(dateString);
            dailySales.push(dailyTotal);
            dailyCustomers.push(dailyCustomerCount);
        } catch (error) {
            console.error(`Error fetching data for ${dateString}:`, error);
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    totalSalesElement.textContent = `Rp ${totalSales.toLocaleString()}`;
    totalCustomersElement.textContent = totalCustomers;
    totalProfitElement.textContent = `Rp ${totalProfit.toLocaleString()}`;

    // Calculate and display ROI (only when Buying Price > 0)
// Calculate and display ROI (excluding service profit)
let adjustedProfit = totalProfit - serviceProfit;
let roi = totalBuyingCost > 0 ? (adjustedProfit / totalBuyingCost) : 0;
roiElement.textContent = `${(roi * 100).toFixed(2)}%`;


    // Display total service profit
    document.getElementById('serviceProfit').textContent = `Rp ${serviceProfit.toLocaleString()}`;

});

// Function to reset charts
function resetCharts() {
    [combinedChart, avgRevenueChart, avgCustomerChart].forEach(chart => chart?.destroy());
}

// Function to generate combined chart (Daily Revenue & Customers)
function generateCombinedChart(labels, salesData, customerData) {
    const ctx = document.getElementById('combinedChart').getContext('2d');

    combinedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Daily Sales (Rp)',
                    data: salesData,
                    borderColor: 'blue',
                    backgroundColor: 'rgba(0, 0, 255, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y',
                },
                {
                    label: 'Daily Customers',
                    data: customerData,
                    borderColor: 'green',
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y1',
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Sales (Rp)' },
                    ticks: { callback: value => `Rp ${value.toLocaleString()}` }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: { display: true, text: 'Customers' }
                }
            }
        }
    });
}
