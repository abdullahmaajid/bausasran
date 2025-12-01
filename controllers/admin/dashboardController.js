// controllers/admin/dashboardController.js
const db = require('../../models');

/**
 * Render dashboard admin dengan statistik lengkap
 */
module.exports.renderDashboard = async (req, res) => {
    try {
        // Hitung total pengguna (semua role)
        const totalPengguna = await db.pengguna.count();

        // Hitung total pengguna per role
        const totalAdmin = await db.pengguna.count({ where: { Role: 'Admin' } });
        const totalUser = await db.pengguna.count({ where: { Role: 'User' } });

        // Hitung total produk
        const totalProduk = await db.product.count();

        // Hitung total kegiatan
        const totalKegiatan = await db.kegiatan.count();

        // Hitung kegiatan upcoming
        const kegiatanUpcoming = await db.kegiatan.count({ 
            where: { Status: 'Upcoming' } 
        });

        // Hitung kegiatan past
        const kegiatanPast = await db.kegiatan.count({ 
            where: { Status: 'Past' } 
        });

        // Hitung total prestasi
        const totalPrestasi = await db.prestasi.count();

        // Hitung total album galeri
        const totalGaleri = await db.groupfoto.count();

        // Hitung total review/testimoni
        const totalReview = await db.review.count();

        // Hitung total foto
        const totalFoto = await db.foto.count();

        // Ambil 5 kegiatan terbaru
        const kegiatanTerbaru = await db.kegiatan.findAll({
            limit: 5,
            order: [['Tanggal', 'DESC']],
            attributes: ['ID_Kegiatan', 'Judul', 'Tanggal', 'Status', 'Kategori']
        });

        // Ambil 5 produk terbaru
        const produkTerbaru = await db.product.findAll({
            limit: 5,
            order: [['ID_Product', 'DESC']],
            attributes: ['ID_Product', 'Nama', 'Harga', 'Kategori']
        });

        // Ambil 5 review terbaru
        const reviewTerbaru = await db.review.findAll({
            limit: 5,
            order: [['ID_Review', 'DESC']],
            attributes: ['ID_Review', 'Rating', 'Ulasan', 'Kategori', 'ID_Pengguna'],
            include: [{
                model: db.pengguna,
                as: 'ID_Pengguna_pengguna',
                attributes: ['Nama', 'Username']
            }]
        });

        // Hitung rata-rata rating
        const avgRating = reviewTerbaru.length > 0 
            ? (reviewTerbaru.reduce((sum, r) => sum + r.Rating, 0) / reviewTerbaru.length).toFixed(1)
            : 0;

        res.render('admin/dashboard', {
            stats: {
                totalPengguna,
                totalAdmin,
                totalUser,
                totalProduk,
                totalKegiatan,
                kegiatanUpcoming,
                kegiatanPast,
                totalPrestasi,
                totalGaleri,
                totalReview,
                totalFoto
            },
            kegiatanTerbaru,
            produkTerbaru,
            reviewTerbaru
        });

    } catch (error) {
        console.error('Error rendering admin dashboard:', error);
        req.flash('error', 'Gagal memuat dashboard.');
        res.render('admin/dashboard', {
            stats: {
                totalPengguna: 0,
                totalAdmin: 0,
                totalUser: 0,
                totalProduk: 0,
                totalKegiatan: 0,
                kegiatanUpcoming: 0,
                kegiatanPast: 0,
                totalPrestasi: 0,
                totalGaleri: 0,
                totalReview: 0,
                totalFoto: 0
            },
            kegiatanTerbaru: [],
            produkTerbaru: [],
            reviewTerbaru: []
        });
    }
};
