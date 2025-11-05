// routes/admin.js

const express = require('express');
const router = express.Router();

// 1. Import Controllers
const adminDashboardController = require('../controllers/admin/dashboardController');
const anggotaController = require('../controllers/admin/anggotaController');
const produkController = require('../controllers/admin/produkController'); // Your product controller
const kegiatanController = require('../controllers/admin/kegiatanController');
const uploadPrestasi = require('../middleware/multerPrestasiStorage');
const prestasiController = require('../controllers/admin/prestasiController');

// 2. Import Multer Middlewares
const uploadAnggota = require('../middleware/multerStorage'); // For single 'anggota' photo
const uploadProduk = require('../middleware/multerProdukStorage'); // For multiple 'produk' photos
// Impor middleware baru
const uploadProdukSingle = require('../middleware/multerProdukSingleStorage');
const uploadKegiatan = require('../middleware/multerKegiatanStorage');


// === DASHBOARD ===
router.get('/dashboard', adminDashboardController.renderDashboard);

// === KELOLA ANGGOTA (PENGGUNA) ===
router.get('/anggota', anggotaController.renderList);
router.get('/anggota/new', anggotaController.renderNewForm);
router.get('/anggota/:id/edit', anggotaController.renderEditForm);
router.post('/anggota/:id/delete', anggotaController.deleteAnggota);
// Use uploadAnggota (middleware/multerStorage.js -> upload.single)
router.post('/anggota', uploadAnggota.single('fotoAnggota'), anggotaController.createAnggota);
router.post('/anggota/:id/edit', uploadAnggota.single('fotoAnggota'), anggotaController.updateAnggota);
router.get('/anggota/:id', anggotaController.renderDetail);

// Rute Produk (update dan delete foto terpisah)
router.get('/produk', produkController.renderList);
router.get('/produk/new', produkController.renderNewForm);
router.get('/produk/:id/edit', produkController.renderEditForm);
router.post('/produk', uploadProduk, produkController.createProduk);
router.post('/produk/:id/edit', uploadProduk, produkController.updateProduk); // Hanya update detail & tambah foto baru
router.post('/produk/:id/delete', produkController.deleteProduk); // Hapus produk utuh
router.post('/produk/:id/delete-photos', produkController.deleteSpecificPhotos); // Hapus foto via AJAX
router.get('/produk/:id', produkController.renderDetail); //detail produk
// Rute baru untuk edit/ganti satu foto
router.post('/produk/:id/edit-photo', uploadProdukSingle, produkController.editSpecificPhoto);



// === KELOLA KEGIATAN ===
// Rute GET (menampilkan halaman)
router.get('/kegiatan', kegiatanController.renderList);
router.get('/kegiatan/new', kegiatanController.renderNewForm);
router.get('/kegiatan/:id/edit', kegiatanController.renderEditForm);
router.get('/kegiatan/:id', kegiatanController.renderDetail); // 'detail'

// Rute POST (memproses data)

// Create (pakai .array() - ini perbaikan dari crash)
router.post('/kegiatan', uploadKegiatan.array('fotoKegiatan', 10), kegiatanController.createKegiatan);

// Update (pakai .array() - ini perbaikan dari crash)
router.post('/kegiatan/:id/edit', uploadKegiatan.array('fotoKegiatan', 10), kegiatanController.updateKegiatan);

// Delete (satu item)
router.post('/kegiatan/:id/delete', kegiatanController.deleteKegiatan);

// Bulk Action (hapus banyak item dari halaman index)
router.post('/kegiatan/bulk-action', kegiatanController.bulkAction); // Duplikat sudah dihapus

// Bulk Delete Fotos (hapus banyak foto dari halaman edit)
router.post('/kegiatan/:id/bulk-delete-fotos', kegiatanController.bulkDeleteFotos);

// Replace Foto (ganti 1 foto dari halaman edit, pakai .single() - ini perbaikan dari crash)
router.post('/kegiatan/:kegiatanId/foto/:fotoId/replace', uploadKegiatan.single('newFoto'), kegiatanController.replaceFotoKegiatan);
router.post('/kegiatan/:kegiatanId/foto/:fotoId/set-thumbnail', kegiatanController.setThumbnail);




// === KELOLA PRESTASI ===
// Rute GET (menampilkan halaman)
router.get('/prestasi', prestasiController.renderList);
router.get('/prestasi/new', prestasiController.renderNewForm);
router.get('/prestasi/:id/edit', prestasiController.renderEditForm);
router.get('/prestasi/:id', prestasiController.renderDetail); // 'detail'
// Rute POST (memproses data)
// Create (pakai .array() - untuk banyak foto)
router.post('/prestasi', uploadPrestasi.array('fotoPrestasi', 10), prestasiController.createPrestasi);
// Update (pakai .array() - untuk tambah foto baru)
router.post('/prestasi/:id/edit', uploadPrestasi.array('fotoPrestasi', 10), prestasiController.updatePrestasi);
// Delete (satu item dari halaman index)
router.post('/prestasi/:id/delete', prestasiController.deletePrestasi);
// Bulk Action (hapus banyak item dari halaman index)
router.post('/prestasi/bulk-action', prestasiController.bulkAction);
// Bulk Delete Fotos (hapus banyak foto dari halaman edit)
router.post('/prestasi/:id/bulk-delete-fotos', prestasiController.bulkDeleteFotos);
// Set Thumbnail (dari halaman edit)
router.post('/prestasi/:prestasiId/foto/:fotoId/set-thumbnail', prestasiController.setThumbnail);
// Replace Foto (ganti 1 foto dari halaman edit, pakai .single())
router.post('/prestasi/:prestasiId/foto/:fotoId/replace', uploadPrestasi.single('newFoto'), prestasiController.replaceFotoPrestasi);






// === Placeholder for Other Admin Routes ===
// router.get('/kegiatan', /* kegiatanController.renderList */);
// router.get('/prestasi', /* prestasiController.renderList */);
// router.get('/galeri', /* galeriController.renderList */);
// router.get('/testimoni', /* testimoniController.renderList */);
// router.get('/master/group-parameter', /* groupParameterController.renderList */);
// router.get('/master/group-section', /* groupSectionController.renderList */);
// ... add more routes as needed ...


module.exports = router;