require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

const supabase = require('./config/supabase');

// --- 1. Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 App running on port ${PORT}`));

// --- 2. API ROUTES ---

// Admin/User Login (Unified logic for demo)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"

        if (!admin) {
            // Create admin if not exists (following original logic)
            const { data: newAdmin, error: insertError } = await supabase
                .from('admins')
                .insert([{ username, password }])
                .select()
                .single();
            if (insertError) throw insertError;
            admin = newAdmin;
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
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!user) {
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([{ username, password }])
                .select()
                .single();
            if (insertError) throw insertError;
            user = newUser;
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
        const { data, error } = await supabase
            .from('furnitures')
            .insert([req.body]);
        if (error) throw error;
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
        const { data, error } = await supabase
            .from('customers')
            .insert([{
                full_name: req.body.fullName,
                phone: req.body.phone,
                email: req.body.email,
                address: req.body.address,
                admin: req.body.admin
            }]);
        if (error) throw error;
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
        const { data: stock, error: stockErr } = await supabase
            .from('furnitures')
            .select('*')
            .eq('admin', admin);
        
        const { data: customers, error: custErr } = await supabase
            .from('customers')
            .select('*')
            .eq('admin', admin);

        if (stockErr || custErr) throw stockErr || custErr;
        res.json({ stock, customers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});