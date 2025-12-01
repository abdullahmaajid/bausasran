// controllers/public/pageController.js

const db = require('../../models');

// ==================================================================
// 1. Halaman List Kegiatan
// ==================================================================
module.exports.renderKegiatan = async (req, res) => {
    try {
        // Ambil semua kegiatan
        const kegiatanList = await db.kegiatan.findAll({
            order: [['Tanggal', 'DESC']]
        });

        res.render('public/kegiatan', {
            kegiatanList
        });
    } catch (error) {
        console.error('Error di renderKegiatan:', error);
        req.flash('error', 'Gagal memuat halaman kegiatan.');
        res.redirect('/');
    }
};

// ==================================================================
// 2. Halaman Detail Kegiatan
// ==================================================================
module.exports.renderKegiatanDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil detail kegiatan
        const kegiatan = await db.kegiatan.findByPk(id);

        if (!kegiatan) {
            req.flash('error', 'Kegiatan tidak ditemukan.');
            return res.redirect('/kegiatan');
        }

        // Ambil foto-foto kegiatan
        let fotoFiles = [];
        if (kegiatan.ID_GroupFoto) {
            const fotoList = await db.foto.findAll({
                where: { ID_GroupFoto: kegiatan.ID_GroupFoto }
            });
            fotoFiles = fotoList.map(f => f.Foto);
        }

        // Ambil galeri info
        let groupFoto = null;
        if (kegiatan.ID_GroupFoto) {
            groupFoto = await db.groupfoto.findByPk(kegiatan.ID_GroupFoto);
        }

        // Ambil review/testimoni untuk kegiatan ini
        const reviewList = await db.review.findAll({
            where: { 
                ID_Kegiatan: id,
                Kategori: 'Kegiatan'
            },
            order: [['ID_Review', 'DESC']],
            limit: 10
        });

        // Ambil data pengguna untuk review
        const penggunaIds = [...new Set(reviewList.map(r => r.ID_Pengguna).filter(Boolean))];
        const penggunaList = await db.pengguna.findAll({
            where: { ID_Pengguna: penggunaIds }
        });
        const penggunaMap = new Map(penggunaList.map(p => [p.ID_Pengguna, p]));

        // Attach pengguna to review
        reviewList.forEach(review => {
            review.dataValues.pengguna = penggunaMap.get(review.ID_Pengguna);
        });

        // Hitung rata-rata rating
        const avgRating = reviewList.length > 0
            ? (reviewList.reduce((sum, r) => sum + r.Rating, 0) / reviewList.length).toFixed(1)
            : 0;

        res.render('public/kegiatan_detail', {
            kegiatan,
            fotoFiles,
            groupFoto,
            reviewList,
            avgRating,
            totalReview: reviewList.length
        });
    } catch (error) {
        console.error('Error di renderKegiatanDetail:', error);
        req.flash('error', 'Gagal memuat detail kegiatan.');
        res.redirect('/kegiatan');
    }
};

// ==================================================================
// 3. Halaman List Produk
// ==================================================================
module.exports.renderProduk = async (req, res) => {
    try {
        // Ambil semua produk
        const produkList = await db.product.findAll({
            order: [['ID_Product', 'DESC']]
        });

        res.render('public/produk', {
            produkList
        });
    } catch (error) {
        console.error('Error di renderProduk:', error);
        req.flash('error', 'Gagal memuat halaman produk.');
        res.redirect('/');
    }
};

// ==================================================================
// 4. Halaman Detail Produk
// ==================================================================
module.exports.renderProdukDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil detail produk
        const produk = await db.product.findByPk(id);

        if (!produk) {
            req.flash('error', 'Produk tidak ditemukan.');
            return res.redirect('/produk');
        }

        // Ambil foto-foto produk
        let fotoFiles = [];
        if (produk.ID_GroupFoto) {
            const fotoList = await db.foto.findAll({
                where: { ID_GroupFoto: produk.ID_GroupFoto }
            });
            fotoFiles = fotoList.map(f => f.Foto);
        }

        // Ambil galeri info
        let groupFoto = null;
        if (produk.ID_GroupFoto) {
            groupFoto = await db.groupfoto.findByPk(produk.ID_GroupFoto);
        }

        // Ambil review/testimoni untuk produk ini
        const reviewList = await db.review.findAll({
            where: { 
                ID_Product: id,
                Kategori: 'Product'
            },
            order: [['ID_Review', 'DESC']],
            limit: 10
        });

        // Ambil data pengguna untuk review
        const penggunaIds = [...new Set(reviewList.map(r => r.ID_Pengguna).filter(Boolean))];
        const penggunaList = await db.pengguna.findAll({
            where: { ID_Pengguna: penggunaIds }
        });
        const penggunaMap = new Map(penggunaList.map(p => [p.ID_Pengguna, p]));

        // Attach pengguna to review
        reviewList.forEach(review => {
            review.dataValues.pengguna = penggunaMap.get(review.ID_Pengguna);
        });

        // Hitung rata-rata rating
        const avgRating = reviewList.length > 0
            ? (reviewList.reduce((sum, r) => sum + r.Rating, 0) / reviewList.length).toFixed(1)
            : 0;

        res.render('public/produk_detail', {
            produk,
            fotoFiles,
            groupFoto,
            reviewList,
            avgRating,
            totalReview: reviewList.length
        });
    } catch (error) {
        console.error('Error di renderProdukDetail:', error);
        req.flash('error', 'Gagal memuat detail produk.');
        res.redirect('/produk');
    }
};

// ==================================================================
// 5. Halaman List Prestasi
// ==================================================================
module.exports.renderPrestasi = async (req, res) => {
    try {
        const prestasiList = await db.prestasi.findAll({
            order: [['Tanggal', 'DESC']]
        });

        res.render('public/prestasi', {
            prestasiList
        });
    } catch (error) {
        console.error('Error di renderPrestasi:', error);
        req.flash('error', 'Gagal memuat halaman prestasi.');
        res.redirect('/');
    }
};

// ==================================================================
// 6. Halaman Detail Prestasi
// ==================================================================
module.exports.renderPrestasiDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const prestasi = await db.prestasi.findByPk(id);

        if (!prestasi) {
            req.flash('error', 'Prestasi tidak ditemukan.');
            return res.redirect('/prestasi');
        }

        // Ambil foto-foto prestasi
        let fotoFiles = [];
        if (prestasi.ID_GroupFoto) {
            const fotoList = await db.foto.findAll({
                where: { ID_GroupFoto: prestasi.ID_GroupFoto }
            });
            fotoFiles = fotoList.map(f => f.Foto);
        }

        let groupFoto = null;
        if (prestasi.ID_GroupFoto) {
            groupFoto = await db.groupfoto.findByPk(prestasi.ID_GroupFoto);
        }

        res.render('public/prestasi_detail', {
            prestasi,
            fotoFiles,
            groupFoto
        });
    } catch (error) {
        console.error('Error di renderPrestasiDetail:', error);
        req.flash('error', 'Gagal memuat detail prestasi.');
        res.redirect('/prestasi');
    }
};

// ==================================================================
// 7. Halaman List Anggota
// ==================================================================
module.exports.renderAnggota = async (req, res) => {
    try {
        // Ambil semua anggota (pengguna)
        const anggotaList = await db.pengguna.findAll({
            order: [['Nama', 'ASC']]
        });

        // Ambil foto untuk mapping
        const fotoIds = [...new Set(anggotaList.map(a => a.ID_Foto).filter(Boolean))];
        const fotoList = await db.foto.findAll({
            where: { ID_Foto: fotoIds }
        });
        const fotoMap = new Map(fotoList.map(f => [f.ID_Foto, f.Foto]));

        // Attach foto to anggota
        anggotaList.forEach(anggota => {
            anggota.dataValues.fotoFile = fotoMap.get(anggota.ID_Foto);
        });

        res.render('public/anggota', {
            anggotaList
        });
    } catch (error) {
        console.error('Error di renderAnggota:', error);
        req.flash('error', 'Gagal memuat halaman anggota.');
        res.redirect('/');
    }
};

// ==================================================================
// 8. Halaman Detail Anggota
// ==================================================================
module.exports.renderAnggotaDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const anggota = await db.pengguna.findByPk(id);

        if (!anggota) {
            req.flash('error', 'Anggota tidak ditemukan.');
            return res.redirect('/anggota');
        }

        // Ambil foto anggota
        if (anggota.ID_Foto) {
            const foto = await db.foto.findByPk(anggota.ID_Foto);
            if (foto) {
                anggota.dataValues.fotoFile = foto.Foto;
            }
        }

        res.render('public/anggota_detail', {
            anggota
        });
    } catch (error) {
        console.error('Error di renderAnggotaDetail:', error);
        req.flash('error', 'Gagal memuat detail anggota.');
        res.redirect('/anggota');
    }
};

// ==================================================================
// 9. Halaman Galeri
// ==================================================================
module.exports.renderGaleri = async (req, res) => {
    try {
        // Ambil semua foto
        const fotoList = await db.foto.findAll({
            order: [['ID_Foto', 'DESC']]
        });

        // Ambil group foto untuk filtering
        const groupFotoList = await db.groupfoto.findAll({
            order: [['Nama', 'ASC']]
        });

        // Attach kategori name to foto
        const groupFotoMap = new Map(groupFotoList.map(g => [g.ID_GroupFoto, g.Nama]));
        fotoList.forEach(foto => {
            foto.dataValues.kategoriName = groupFotoMap.get(foto.ID_GroupFoto) || 'Umum';
        });

        res.render('public/galeri', {
            fotoList,
            groupFotoList
        });
    } catch (error) {
        console.error('Error di renderGaleri:', error);
        req.flash('error', 'Gagal memuat galeri.');
        res.redirect('/');
    }
};

// ==================================================================
// 10. Halaman Testimoni
// ==================================================================
module.exports.renderTestimoni = async (req, res) => {
    try {
        // Ambil semua testimoni (review)
        const testimoniList = await db.review.findAll({
            order: [['ID_Review', 'DESC']]
        });

        // Ambil data pengguna
        const penggunaIds = [...new Set(testimoniList.map(t => t.ID_Pengguna).filter(Boolean))];
        let penggunaList = [];
        if (penggunaIds.length > 0) {
            penggunaList = await db.pengguna.findAll({
                where: { ID_Pengguna: penggunaIds }
            });
        }

        // Ambil foto pengguna
        const fotoIds = [...new Set(penggunaList.map(p => p.ID_Foto).filter(Boolean))];
        let fotoList = [];
        if (fotoIds.length > 0) {
            fotoList = await db.foto.findAll({
                where: { ID_Foto: fotoIds }
            });
        }
        const fotoMap = new Map(fotoList.map(f => [f.ID_Foto, f.Foto]));

        // Create pengguna map
        const penggunaMap = new Map(penggunaList.map(p => [p.ID_Pengguna, p]));

        // Ambil nama produk dan kegiatan
        const produkIds = [...new Set(testimoniList.map(t => t.ID_Product).filter(Boolean))];
        const kegiatanIds = [...new Set(testimoniList.map(t => t.ID_Kegiatan).filter(Boolean))];

        let produkList = [];
        let kegiatanList = [];
        
        if (produkIds.length > 0) {
            produkList = await db.product.findAll({
                where: { ID_Product: produkIds }
            });
        }
        
        if (kegiatanIds.length > 0) {
            kegiatanList = await db.kegiatan.findAll({
                where: { ID_Kegiatan: kegiatanIds }
            });
        }

        const produkMap = new Map(produkList.map(p => [p.ID_Product, p.Nama]));
        const kegiatanMap = new Map(kegiatanList.map(k => [k.ID_Kegiatan, k.Judul]));

        // Attach data to testimoni
        testimoniList.forEach(testimoni => {
            const pengguna = penggunaMap.get(testimoni.ID_Pengguna);
            if (pengguna) {
                testimoni.dataValues.penggunaName = pengguna.Nama;
                testimoni.dataValues.penggunaFoto = fotoMap.get(pengguna.ID_Foto);
            }

            if (testimoni.Kategori === 'Product') {
                testimoni.dataValues.entityName = produkMap.get(testimoni.ID_Product);
            } else if (testimoni.Kategori === 'Kegiatan') {
                testimoni.dataValues.entityName = kegiatanMap.get(testimoni.ID_Kegiatan);
            }
        });

        res.render('public/testimoni', {
            testimoniList
        });
    } catch (error) {
        console.error('Error di renderTestimoni:', error);
        console.error('Error stack:', error.stack);
        req.flash('error', 'Gagal memuat testimoni.');
        res.redirect('/');
    }
};
