// controllers/user/dashboardController.js
const db = require('../../models');

/**
 * Render dashboard user dengan statistik dan informasi terbaru
 */
module.exports.renderDashboard = async (req, res) => {
    try {
        // Ambil ID user yang login
        const userId = req.user.ID_Pengguna;

        // Hitung total anggota dengan role User
        const totalAnggota = await db.pengguna.count({
            where: { Role: 'User' }
        });

        // Hitung total produk
        const totalProduk = await db.product.count();

        // Hitung total kegiatan
        const totalKegiatan = await db.kegiatan.count();

        // Hitung total prestasi
        const totalPrestasi = await db.prestasi.count();

        // Hitung total album galeri (semua groupfoto adalah galeri)
        const totalGaleri = await db.groupfoto.count();

        // Hitung testimoni user ini
        const totalTestimoniSaya = await db.review.count({
            where: { ID_Pengguna: userId }
        });

        // Ambil 5 kegiatan terbaru
        const kegiatanTerbaru = await db.kegiatan.findAll({
            limit: 5,
            order: [['Tanggal', 'DESC']],
            attributes: ['ID_Kegiatan', 'Judul', 'Tanggal', 'Status']
        });

        // Ambil 5 produk terbaru (by ID karena tidak ada timestamp)
        const produkTerbaru = await db.product.findAll({
            limit: 5,
            order: [['ID_Product', 'DESC']],
            attributes: ['ID_Product', 'Nama', 'Harga']
        });

        // Ambil testimoni user
        const testimoniSaya = await db.review.findAll({
            where: { ID_Pengguna: userId },
            limit: 5,
            order: [['ID_Review', 'DESC']],
            attributes: ['ID_Review', 'Rating', 'Ulasan', 'Kategori', 'ID_Product', 'ID_Kegiatan']
        });

        res.render('user/dashboard', {
            currentPage: 'dashboard',
            stats: {
                totalAnggota,
                totalProduk,
                totalKegiatan,
                totalPrestasi,
                totalGaleri,
                totalTestimoniSaya
            },
            kegiatanTerbaru,
            produkTerbaru,
            testimoniSaya
        });

    } catch (error) {
        console.error('Error rendering user dashboard:', error);
        req.flash('error', 'Gagal memuat dashboard.');
        res.redirect('/');
    }
};
