// routes/user.js

const express = require('express');
const router = express.Router();

// Import controllers
const dashboardController = require('../controllers/user/dashboardController');
const testimoniController = require('../controllers/user/testimoniController');
const anggotaController = require('../controllers/user/anggotaController');
const prestasiController = require('../controllers/user/prestasiController');
const kegiatanController = require('../controllers/user/kegiatanController');
const galeriController = require('../controllers/user/galeriController');
const produkController = require('../controllers/user/produkController');

// ============================================================
// DASHBOARD
// ============================================================
router.get('/dashboard', dashboardController.renderDashboard);

// ============================================================
// ROUTES TESTIMONI
// ============================================================
router.get('/testimoni', testimoniController.renderTestimoni);
router.get('/testimoni/tambah', testimoniController.renderTambahForm);
router.post('/testimoni/tambah', testimoniController.createTestimoni);
router.get('/testimoni/:id/edit', testimoniController.renderEditForm);
router.post('/testimoni/:id/edit', testimoniController.updateTestimoni);
router.post('/testimoni/:id/delete', testimoniController.deleteTestimoni);

// ============================================================
// ROUTES ANGGOTA (Read Only)
// ============================================================
router.get('/anggota', anggotaController.renderListAnggota);
router.get('/anggota/:id', anggotaController.renderDetailAnggota);

// ============================================================
// ROUTES PRESTASI (Read Only)
// ============================================================
router.get('/prestasi', prestasiController.renderListPrestasi);
router.get('/prestasi/:id', prestasiController.renderDetailPrestasi);

// ============================================================
// ROUTES KEGIATAN (Read Only)
// ============================================================
router.get('/kegiatan', kegiatanController.renderListKegiatan);
router.get('/kegiatan/:id', kegiatanController.renderDetailKegiatan);

// ============================================================
// ROUTES GALERI (Read Only)
// ============================================================
router.get('/galeri', galeriController.renderListGaleri);
router.get('/galeri/:id', galeriController.renderDetailGaleri);

// ============================================================
// ROUTES PRODUK (Read Only + Pencocokan)
// ============================================================
router.get('/produk', produkController.renderListProduk);
router.get('/produk/pencocokan', produkController.renderPencocokanProduk);
router.post('/produk/pencocokan', produkController.prosesPencocokanProduk);
router.get('/produk/:id', produkController.renderDetailProduk);

module.exports = router;