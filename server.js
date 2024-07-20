const express = require('express');
const bodyParser = require('body-parser');
const escpos = require('escpos');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Initialize the printer
const networkDevice = new escpos.Network('192.168.1.87'); // IP address of your printer
const printer = new escpos.Printer(networkDevice);

app.post('/printbuttonpc', (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    // Open the connection to the printer
    networkDevice.open((err) => {
        if (err) {
            console.error('Failed to open device:', err);
            return res.status(500).json({ error: 'Failed to open device' });
        }

        // Print the content
        printer
            .text(content)
            .cut()
            .close((err) => {
                if (err) {
                    console.error('Failed to print:', err);
                    return res.status(500).json({ error: 'Failed to print' });
                }

                res.status(200).json({ message: 'Print job sent' });
            });
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
s