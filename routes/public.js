// routes/public.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/public/dashboardController');
const pageController = require('../controllers/public/pageController');

// Menampilkan Halaman Utama (Dashboard Publik)
router.get('/', dashboardController.renderDashboard);

// Kegiatan Routes
router.get('/kegiatan', pageController.renderKegiatan);
router.get('/kegiatan/:id', pageController.renderKegiatanDetail);

// Produk Routes
router.get('/produk', pageController.renderProduk);
router.get('/produk/:id', pageController.renderProdukDetail);

// Prestasi Routes
router.get('/prestasi', pageController.renderPrestasi);
router.get('/prestasi/:id', pageController.renderPrestasiDetail);

// Anggota Routes
router.get('/anggota', pageController.renderAnggota);
router.get('/anggota/:id', pageController.renderAnggotaDetail);

// Galeri Routes
router.get('/galeri', pageController.renderGaleri);

// Testimoni Routes
router.get('/testimoni', pageController.renderTestimoni);

module.exports = router;