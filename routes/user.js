// routes/user.js

const express = require('express');
const router = express.Router();
// Kita perlu controller baru untuk testimoni
const userTestimoniController = require('../controllers/user/testimoniController');

// GET /user/testimoni
// Middleware isLoggedIn dan isUser sudah dipasang di app.js
router.get('/testimoni', userTestimoniController.renderTestimoni);

// Tambahkan rute user lainnya di sini...
// router.post('/testimoni', ...);

module.exports = router;