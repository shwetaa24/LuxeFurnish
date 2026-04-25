require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');

const path = require('path');
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'frontend')));

// --- 1. EMAIL CONFIGURATION (MULTIPLE KEYS) ---
let emails = process.env.SMTP_EMAILS ? process.env.SMTP_EMAILS.split(',') : [];
let passwords = process.env.SMTP_PASSWORDS ? process.env.SMTP_PASSWORDS.split(',') : [];

// Fallback for single key configuration
if (emails.length === 0 && process.env.SMTP_EMAIL) {
    emails = [process.env.SMTP_EMAIL];
    passwords = [process.env.SMTP_PASSWORD];
}

const transporters = emails.map((email, index) => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: email.trim(),
            pass: passwords[index] ? passwords[index].trim() : ''
        }
    });
});

let currentTransporterIndex = 0;

const sendEmail = async (mailOptions) => {
    if (transporters.length === 0) {
        console.error("❌ No SMTP transporters configured");
        return;
    }

    const transporter = transporters[currentTransporterIndex];
    currentTransporterIndex = (currentTransporterIndex + 1) % transporters.length;

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent using ${transporter.options.auth.user}`);
        return info;
    } catch (error) {
        console.error(`❌ Error sending email:`, error);
        throw error;
    }
};

// 2. Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Cluster"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- 3. DATA SCHEMAS ---

const Furniture = mongoose.model('Furniture', {
    name: String,
    category: String,
    price: Number,
    stock: Number,
    admin: String
}, 'Furniture');

const Customer = mongoose.model('Customer', {
    fullName: String,
    phone: String,
    email: String,
    address: String,
    admin: { type: String, default: 'admin' }
}, 'Customers');

const User = mongoose.model('User', {
    username: { type: String, unique: true },
    password: { type: String },
    email: String
}, 'Users');

const Admin = mongoose.model('Admin', {
    username: { type: String, unique: true },
    password: { type: String, default: 'password123' },
    role: { type: String, default: 'Inventory-Manager' }
}, 'Admins');

// --- 4. API ROUTES ---

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
    try {
        const item = new Furniture(req.body);
        await item.save();
        res.json({ success: true, message: "Stock Updated!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', async (req, res) => {
    try {
        const customer = new Customer(req.body);
        await customer.save();

        const mailOptions = {
            from: transporters[currentTransporterIndex % transporters.length].options.auth.user,
            to: customer.email,
            subject: 'Inquiry Received - LuxeFurnish',
            text: `Hi ${customer.fullName},\n\nThank you for reaching out! We have received your inquiry.\n\nBest regards,\nLuxeFurnish Team`
        };

        await sendEmail(mailOptions);
        res.json({ success: true, message: "Customer Registered & Email Sent!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/all-data', async (req, res) => {
    const { admin } = req.query;
    if (!admin) return res.status(400).json({ error: "Admin username required" });
    const stock = await Furniture.find({ admin });
    const customers = await Customer.find({ admin });
    res.json({ stock, customers });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 App running on port ${PORT}`));