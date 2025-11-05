// routes/api.js
const express = require('express');
const router = express.Router();
const parameterController = require('../controllers/api/parameterController');
const authMiddleware = require('../middleware/auth'); // Ambil middleware

// Proteksi API agar hanya bisa diakses oleh Admin yang login
router.get(
    '/parameter/:id', 
    authMiddleware.isLoggedIn, 
    authMiddleware.isAdmin, 
    parameterController.getParameters
);

module.exports = router;