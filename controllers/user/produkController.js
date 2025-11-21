// controllers/user/produkController.js
// Controller untuk User melihat data Produk (Read Only)

const db = require('../../models');

// ==================================================================
// 1. Menampilkan List Produk
// ==================================================================
module.exports.renderListProduk = async (req, res) => {
    try {
        const produkList = await db.product.findAll({
            order: [['Nama', 'ASC']]
        });

        // Manual data joining untuk foto thumbnail
        const groupFotoList = await db.groupfoto.findAll();
        const fotoList = await db.foto.findAll();
        
        const groupFotoMap = new Map(groupFotoList.map(gf => [gf.ID_GroupFoto, gf]));
        const fotoMap = new Map();
        
        // Group foto by ID_GroupFoto
        fotoList.forEach(f => {
            if (!fotoMap.has(f.ID_GroupFoto)) {
                fotoMap.set(f.ID_GroupFoto, []);
            }
            fotoMap.get(f.ID_GroupFoto).push(f);
        });

        const displayList = produkList.map(p => {
            p.dataValues.thumbnailFile = null;
            p.dataValues.fotoCount = 0;

            if (p.ID_GroupFoto) {
                const fotos = fotoMap.get(p.ID_GroupFoto) || [];
                p.dataValues.fotoCount = fotos.length;
                if (fotos.length > 0) {
                    p.dataValues.thumbnailFile = fotos[0].Foto;
                }
            }
            return p;
        });

        res.render('user/produk/index', {
            produkList: displayList
        });

    } catch (error) {
        console.error('Error di renderListProduk:', error);
        req.flash('error', 'Gagal memuat daftar produk.');
        res.redirect('/user/testimoni');
    }
};

// ==================================================================
// 2. Menampilkan Detail Produk
// ==================================================================
module.exports.renderDetailProduk = async (req, res) => {
    try {
        const { id } = req.params;

        const produk = await db.product.findByPk(id);

        if (!produk) {
            req.flash('error', 'Produk tidak ditemukan.');
            return res.redirect('/user/produk');
        }

        // Ambil foto-foto dari group
        let fotoFiles = [];
        if (produk.ID_GroupFoto) {
            const fotos = await db.foto.findAll({
                where: { ID_GroupFoto: produk.ID_GroupFoto }
            });
            fotoFiles = fotos.map(f => f.Foto);
        }

        produk.dataValues.fotoFiles = fotoFiles;

        // Ambil testimoni/review untuk produk ini
        const reviewList = await db.review.findAll({
            where: { 
                Kategori: 'Product',
                ID_Product: id 
            },
            order: [['ID_Review', 'DESC']],
            limit: 10
        });

        // Ambil data pengguna untuk setiap review
        const penggunaList = await db.pengguna.findAll();
        const penggunaMap = new Map(penggunaList.map(p => [p.ID_Pengguna, p]));

        const displayReviews = reviewList.map(r => {
            const pengguna = penggunaMap.get(r.ID_Pengguna);
            r.dataValues.namaPengguna = pengguna ? pengguna.Nama : 'Anonymous';
            return r;
        });

        res.render('user/produk/detail', {
            produk,
            reviewList: displayReviews
        });

    } catch (error) {
        console.error('Error di renderDetailProduk:', error);
        req.flash('error', 'Gagal memuat detail produk.');
        res.redirect('/user/produk');
    }
};

// ==================================================================
// 3. Menampilkan Halaman Pencocokan Produk
// ==================================================================
module.exports.renderPencocokanProduk = async (req, res) => {
    try {
        // Ambil semua produk untuk pencocokan
        const produkList = await db.product.findAll({
            order: [['Nama', 'ASC']]
        });

        res.render('user/produk/pencocokan', {
            produkList
        });

    } catch (error) {
        console.error('Error di renderPencocokanProduk:', error);
        req.flash('error', 'Gagal memuat halaman pencocokan produk.');
        res.redirect('/user/produk');
    }
};

// ==================================================================
// 4. Proses Pencocokan Produk (AJAX atau Form Submit)
// ==================================================================
module.exports.prosesPencocokanProduk = async (req, res) => {
    try {
        const { luas_lahan, jenis_tanah, kebutuhan } = req.body;

        // Logika pencocokan sederhana berdasarkan kriteria
        // Anda bisa sesuaikan dengan logika bisnis yang lebih kompleks
        const produkList = await db.product.findAll();

        // Filter produk berdasarkan kriteria (contoh sederhana)
        const hasilPencocokan = produkList.filter(p => {
            // Contoh: cek apakah produk sesuai dengan kriteria
            // Sesuaikan dengan field yang ada di tabel product
            return true; // Sementara return semua, sesuaikan logikanya
        });

        res.json({
            success: true,
            data: hasilPencocokan
        });

    } catch (error) {
        console.error('Error di prosesPencocokanProduk:', error);
        res.json({
            success: false,
            message: 'Gagal memproses pencocokan produk.'
        });
    }
};
