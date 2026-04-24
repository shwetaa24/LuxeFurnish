require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 1. Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to Furniture, Admin & Customer Cluster"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- 2. DATA SCHEMAS ---

// Furniture Stock Schema
const Furniture = mongoose.model('Furniture', {
    name: String,
    category: String,
    price: Number,
    stock: Number,
    admin: String // Associated Admin
}, 'Furniture');

// Customer Database Schema
const Customer = mongoose.model('Customer', {
    fullName: String,
    phone: String,
    email: String,
    address: String,
    admin: { type: String, default: 'admin' } // Assigned to an admin
}, 'Customers');

// User (Customer) Account Schema
const User = mongoose.model('User', {
    username: { type: String, unique: true },
    password: { type: String },
    email: String
}, 'Users');

// Admin Database Schema
const Admin = mongoose.model('Admin', {
    username: { type: String, unique: true },
    password: { type: String, default: 'password123' }, // Default for demo
    role: { type: String, default: 'Inventory-Manager' }
}, 'Admins');

// --- 3. API ROUTES ---

// Route: Admin Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let admin = await Admin.findOne({ username });
        if (!admin) {
            // Auto-create for demo if doesn't exist
            admin = new Admin({ username, password });
            await admin.save();
        }
        
        if (admin.password === password) {
            res.json({ success: true, username: admin.username });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route: User (Customer) Login
app.post('/api/user-login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (!user) {
            // Auto-create for demo
            user = new User({ username, password });
            await user.save();
        }
        
        if (user.password === password) {
            res.json({ success: true, username: user.username });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route: Add Furniture (Stock)
app.post('/api/furniture', async (req, res) => {
    try {
        const item = new Furniture(req.body);
        await item.save();
        res.json({ success: true, message: "Stock Updated!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route: Add Customer
app.post('/api/customers', async (req, res) => {
    try {
        // In a real app, you might assign customers based on a store ID
        const customer = new Customer(req.body);
        await customer.save();
        res.json({ success: true, message: "Customer Registered!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route: Get All Data (Filtered by Admin)
app.get('/api/all-data', async (req, res) => {
    const { admin } = req.query;
    if (!admin) return res.status(400).json({ error: "Admin username required" });
    
    const stock = await Furniture.find({ admin });
    const customers = await Customer.find({ admin }); // Or find all if they are shared
    res.json({ stock, customers });
});

app.listen(3000, () => console.log('Multi-DB App running on http://localhost:3000'));