// script.js

document.getElementById('invoiceForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission
    
    // Get form data
    const formData = new FormData(event.target);
    const customerName = formData.get('customerName');
    const invoiceDate = formData.get('invoiceDate');
    const qty = formData.get('qty');
    const productName = formData.get('productName');
    const pricePerPiece = formData.get('pricePerPiece');
    
    // Simple validation example: Check if required fields are filled
    if (!customerName || !invoiceDate || !qty || !productName || !pricePerPiece) {
        alert('Please fill out all fields.');
        return;
    }
    
    // Calculate total price
    const totalPrice = qty * pricePerPiece;

    // Example: Construct HTML for invoice preview
    const invoiceHTML = `
        <h3>Invoice Preview</h3>
        <p><strong>Customer Name:</strong> ${customerName}</p>
        <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
        <p><strong>Quantity:</strong> ${qty}</p>
        <p><strong>Product Name:</strong> ${productName}</p>
        <p><strong>Price per Piece:</strong> $${pricePerPiece.toFixed(2)}</p>
        <p><strong>Total Price:</strong> $${totalPrice.toFixed(2)}</p>
        <!-- Add more fields here -->
    `;
    
    // Update the invoice preview section
    const invoicePreview = document.getElementById('invoicePreview');
    invoicePreview.innerHTML = invoiceHTML;
});
function printInvoice() {
    var printContents = document.getElementById('printArea').innerHTML;
    var originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
}


function setDate() {
    const now = new Date();
    
    // Format date part
    const optionsDate = { year: 'numeric', month: 'short', day: '2-digit' };
    const formattedDate = now.toLocaleDateString('id-ID', optionsDate);
    
    // Format time part
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}`;
    
    // Display formatted date and time
    const fullFormattedDate = `${formattedDate}, ${formattedTime}`;
    document.getElementById('invoiceDate').textContent = fullFormattedDate;
}

