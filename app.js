const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Define a single user for login (replace with your actual user data)
const users = [
    { username: 'megamasmtr', password: 'cotomakassar' }
];

// Endpoint to handle login requests
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ message: 'Login successful.' });
    } else {
        res.status(401).json({ error: 'Invalid username or password.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
