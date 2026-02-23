
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Store files in an 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to original name
  }
});

const upload = multer({ storage: storage });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Serve static files from the current directory
app.use(express.static(__dirname));

// Handle file upload
app.post('/upload', upload.single('dataFile'), (req, res) => {
  if (req.file) {
    res.json({ filename: req.file.filename, originalname: req.file.originalname, mimetype: req.file.mimetype });
  } else {
    res.status(400).send('No file uploaded.');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
