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
    (req, res, next) => {
        // Handle "Ingat Saya"
        if (req.body.rememberMe) {
            req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 hari
        } else {
            req.session.cookie.expires = false; // Session cookie (hapus saat browser ditutup)
        }
        next();
    },
    authMiddleware.checkReturnTo
);

// GET: Menampilkan halaman register
router.get('/register', authController.renderRegister);

// POST: Memproses pendaftaran
router.post('/register', authController.registerUser);

// GET: Menampilkan halaman lupa password
router.get('/lupa-password', authController.renderLupaPassword);

// POST: Memproses reset password
router.post('/lupa-password', authController.resetPassword);

// GET: Logout
router.get('/logout', authController.logoutUser);

module.exports = router;