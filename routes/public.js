// routes/public.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/public/dashboardController');

// Menampilkan Halaman Utama (Dashboard Publik)
// Ini adalah endpoint pertama: GET /
router.get('/', dashboardController.renderDashboard);

// (Nantinya Anda bisa tambahkan rute lain di sini)
// router.get('/kegiatan', ...);
// router.get('/produk/:id', ...);

module.exports = router;