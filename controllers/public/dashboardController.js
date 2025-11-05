// controllers/public/dashboardController.js

// Impor model Sequelize Anda
// PERBAIKAN: Path diubah dari ../models menjadi ../../models
const db = require('../../models');

// Fungsi untuk me-render halaman dashboard publik (HomePage)
module.exports.renderDashboard = async (req, res) => {
    try {
        // Ambil beberapa data untuk ditampilkan di HomePage
        // Contoh: 3 Kegiatan Terbaru (Past)
        const kegiatan = await db.kegiatan.findAll({
            where: { Status: 'Past' },
            limit: 3,
            order: [['Tanggal', 'DESC']]
            // Nanti Anda bisa 'include' GroupFoto jika perlu
            // include: { model: db.groupfoto, include: db.foto } 
        });

        // Contoh: 3 Produk Unggulan
        const produk = await db.product.findAll({
            limit: 3,
            order: [['ID_Product', 'DESC']]
            // Nanti Anda bisa 'include' GroupFoto jika perlu
            // include: { model: db.groupfoto, include: db.foto }
        });

        // Render file EJS dan kirimkan datanya
        res.render('public/dashboard_public', {
            kegiatan, // Kirim data kegiatan ke EJS
            produk    // Kirim data produk ke EJS
        });

    } catch (error) {
        console.error("Error mengambil data dashboard:", error);
        // Tampilkan halaman error sederhana jika gagal
        res.status(500).send("<h1>500 - Terjadi Kesalahan Internal</h1><p>Tidak dapat memuat data halaman utama.</p>");
    }
};