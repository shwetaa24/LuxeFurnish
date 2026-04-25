require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

// 1. Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Cluster"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- 2. DATA SCHEMAS ---

const Furniture = mongoose.model('Furniture', {
    name: String,
    category: String,
    price: Number,
    stock: Number,
    admin: String
}, 'furnitures');

const Customer = mongoose.model('Customer', {
    fullName: String,
    phone: String,
    email: String,
    address: String,
    admin: { type: String, default: 'admin' }
}, 'customers');

const User = mongoose.model('User', {
    username: { type: String, unique: true },
    password: { type: String },
    email: String
}, 'users');

const Admin = mongoose.model('Admin', {
    username: { type: String, unique: true },
    password: { type: String, default: 'password123' },
    role: { type: String, default: 'Inventory-Manager' }
}, 'admins');

// --- 3. API ROUTES ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let admin = await Admin.findOne({ username });
        if (!admin) {
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

app.post('/api/user-login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (!user) {
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

app.post('/api/furniture', async (req, res) => {
    console.log("📥 Received Furniture Data:", req.body);
    try {
        const item = new Furniture(req.body);
        await item.save();
        console.log("✅ Furniture Saved Successfully!");
        res.json({ success: true, message: "Stock Updated!" });
    } catch (err) { 
        console.error("❌ Error saving furniture:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/api/customers', async (req, res) => {
    console.log("📥 Received Customer Inquiry:", req.body);
    try {
        const customer = new Customer(req.body);
        await customer.save();
        console.log("✅ Customer Saved Successfully!");
        res.json({ success: true, message: "Customer Registered!" });
    } catch (err) { 
        console.error("❌ Error saving customer:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/api/all-data', async (req, res) => {
    const { admin } = req.query;
    if (!admin) return res.status(400).json({ error: "Admin username required" });
    try {
        const stock = await Furniture.find({ admin });
        const customers = await Customer.find({ admin });
        res.json({ stock, customers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 App running on port ${PORT}`));