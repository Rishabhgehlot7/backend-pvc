// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const cors = require('cors');

// Create Express app
const app = express();
const port = 4000; // Port number

app.use(cors());

// Connect to MongoDB database
mongoose.connect('mongodb+srv://rishabh3x:rishabh1234@cluster0.wdefpob.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("Error connecting to MongoDB:", err);
});

// Define a schema for MongoDB
const Schema = mongoose.Schema;
const productSchema = new Schema({
  name: String,
  price: Number,
  description: String,
  images: [String] // Store image filenames
});

// Define a model
const Product = mongoose.model('Product', productSchema);

// Middleware to parse JSON requests
app.use(express.json());

// Secret key for JWT
const secretKey = 'jaishreeram';

// Dummy admin credentials (replace with actual admin credentials)
const adminUsername = 'admin';
const adminPassword = 'adminpassword';

// Generate hashed password for admin
const saltRounds = 10;
let adminPasswordHash;

bcrypt.hash(adminPassword, saltRounds, (err, hash) => {
  if (err) throw err;
  adminPasswordHash = hash;
});

// Authenticate admin
const authenticateAdmin = (req, res, next) => {
  // Check if Authorization header is present
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify JWT token
  const token = authHeader.split(' ')[1];
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    next();
  });
};

// Admin login route
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create JWT token
  const token = jwt.sign({ username: username }, secretKey, { expiresIn: '1h' });
  res.json({ token: token });
});

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

app.use('/images', express.static('uploads'));

const upload = multer({ storage: storage });
// Routes


app.get('/hello', async (req, res) => {
  try {
    res.status(200).json({
      hello: "world",
    });
  } catch (e) { console.error(e) }
})

// Create a new product with images (only accessible to authenticated admin)
app.post('/products', authenticateAdmin, upload.array('images', 2), async (req, res) => {
  try {
    const { name, price, description } = req.body;
    const images = req.files.map(file => file.filename);
    const product = new Product({ name, price, description, images });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all products
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get a single product by ID
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a product by ID (only accessible to authenticated admin)
app.put('/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const { name, price, description } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, { name, price, description }, { new: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a product by ID (only accessible to authenticated admin)
app.delete('/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // Remove images from uploads folder
    product.images.forEach(image => {
      fs.unlink(`uploads/${image}`, (err) => {
        if (err) {
          console.error("Error deleting image:", err);
        }
      });
    });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
