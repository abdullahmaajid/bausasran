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
            include: [
                {
                    model: db.groupfoto,
                    as: 'ID_GroupFoto_groupfoto',
                    include: {
                        model: db.foto,
                        as: 'fotos',
                        attributes: ['ID_Foto', 'Foto']
                    }
                }
            ],
            where: { Status: 'Past' },
            limit: 3,
            order: [['Tanggal', 'DESC']]
            // Nanti Anda bisa 'include' GroupFoto jika perlu
            // include: { model: db.groupfoto, include: db.foto } 
        });

        const kegiatanList = kegiatan.map(k => {
            const kJson = k.toJSON();
            kJson.photos = [];
            if (kJson.ID_GroupFoto_groupfoto && kJson.ID_GroupFoto_groupfoto.fotos) {
                kJson.photos = kJson.ID_GroupFoto_groupfoto.fotos;
            }
            return kJson;
        });

        // Contoh: 3 Produk Unggulan
        const produk = await db.product.findAll({
            include: [
                {
                    model: db.groupfoto,
                    as: 'ID_GroupFoto_groupfoto',
                    include: {
                        model: db.foto,
                        as: 'fotos',
                        attributes: ['ID_Foto', 'Foto']
                    }
                }
            ],
            limit: 3,
            order: [['ID_Product', 'DESC']]
            // Nanti Anda bisa 'include' GroupFoto jika perlu
            // include: { model: db.groupfoto, include: db.foto }
        });

        const produkList = produk.map(p => {
            const pJson = p.toJSON();
            pJson.photos = [];
            if (pJson.ID_GroupFoto_groupfoto && pJson.ID_GroupFoto_groupfoto.fotos) {
                pJson.photos = pJson.ID_GroupFoto_groupfoto.fotos;
            }
            return pJson;
        });

        // Render file EJS dan kirimkan datanya
        res.render('public/dashboard_public', {
            kegiatan : kegiatanList, // Kirim data kegiatan ke EJS
            produk : produkList    // Kirim data produk ke EJS
        });

    } catch (error) {
        console.error("Error mengambil data dashboard:", error);
        // Tampilkan halaman error sederhana jika gagal
        res.status(500).send("<h1>500 - Terjadi Kesalahan Internal</h1><p>Tidak dapat memuat data halaman utama.</p>");
    }
};