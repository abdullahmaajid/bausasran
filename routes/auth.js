// routes/auth.js

const express = require('express');
const router = express.Router();
const passport = require('passport');
const authMiddleware = require('../middleware/auth');

// INI BARIS YANG ERROR: Pastikan path dan namanya persis
const authController = require('../controllers/public/authController');

// GET: Menampilkan halaman login
router.get('/login', authController.renderLogin);

// POST: Memproses data login
router.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: true,
        keepSessionInfo: true,
    }),
    authMiddleware.checkReturnTo
);

// GET: Logout
router.get('/logout', authController.logoutUser);

module.exports = router;