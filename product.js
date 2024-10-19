// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANCk_iM4XtSX0VW6iETK-tJdWHGAWMbS0",
  authDomain: "megamasmotor-4008c.firebaseapp.com",
  projectId: "megamasmotor-4008c",
  storageBucket: "megamasmotor-4008c.appspot.com",
  messagingSenderId: "874673615212",
  appId: "1:874673615212:web:7f0ecdeee47fed60aa0349",
  measurementId: "G-LF6NB7ZKLE"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Listen for barcode input
const barcodeInput = document.getElementById('barcodeInput');
barcodeInput.addEventListener('change', async (event) => {
  const barcode = event.target.value.trim(); // Trim whitespace from input
  console.log(`Looking up product with SKU: ${barcode}`);
  let productFound = false;

  try {
    // Query the collection for a document with the specified SKU
    const querySnapshot = await db.collection("Inventory").where('SKU', '==', barcode).get();

    // Log the number of documents found
    console.log(`Found ${querySnapshot.size} documents with SKU ${barcode}`);

    // Check if any documents matched the query
    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        console.log(`Product found: ${doc.id}`, productData);
        document.getElementById('productName').textContent = doc.id; // Use document ID as product name
        document.getElementById('productPrice').textContent = formatPrice(productData['Selling Price']);
        document.getElementById('productStock').textContent = productData['Stock'];
        productFound = true;
      });
    } else {
      console.log(`No documents found with SKU ${barcode}`);
    }
  } catch (error) {
    console.error(`Error fetching product:`, error);
  }

  if (!productFound) {
    alert('Product not found!');
    document.getElementById('productName').textContent = '';
    document.getElementById('productPrice').textContent = '';
    document.getElementById('productStock').textContent = '';
  }

  // Clear the input field for the next scan
  barcodeInput.value = '';
});

// Function to format price with commas
function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
