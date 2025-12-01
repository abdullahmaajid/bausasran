// controllers/admin/reviewController.js

const db = require('../../models');

// ==================================================================
// 1. (READ) Menampilkan List Review
// ==================================================================
module.exports.renderList = async (req, res) => {
    try {
        // Ambil semua review
        const reviewList = await db.review.findAll({
            order: [['ID_Review', 'DESC']]
        });
        
        // Ambil data pengguna, produk, dan kegiatan
        const penggunaList = await db.pengguna.findAll();
        const produkList = await db.product.findAll();
        const kegiatanList = await db.kegiatan.findAll();

        // Buat Map untuk lookup
        const penggunaMap = new Map(penggunaList.map(p => [p.ID_Pengguna, p]));
        const produkMap = new Map(produkList.map(p => [p.ID_Product, p]));
        const kegiatanMap = new Map(kegiatanList.map(k => [k.ID_Kegiatan, k]));

        // Gabungkan data secara manual
        const displayList = reviewList.map(review => {
            review.dataValues.pengguna = penggunaMap.get(review.ID_Pengguna) || null;
            review.dataValues.produk = produkMap.get(review.ID_Product) || null;
            review.dataValues.kegiatan = kegiatanMap.get(review.ID_Kegiatan) || null;
            return review;
        });

        res.render('admin/testimoni/index', {
            reviewList: displayList
        });

    } catch (error) {
        console.error('Error di renderList Review:', error);
        req.flash('error', 'Gagal memuat daftar review.');
        res.redirect('/admin/dashboard');
    }
};

// ==================================================================
// 2. (READ) Menampilkan Detail Review
// ==================================================================
module.exports.renderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        
        const review = await db.review.findByPk(id);
        
        if (!review) {
            req.flash('error', 'Data review tidak ditemukan.');
            return res.redirect('/admin/testimoni');
        }

        // Ambil data terkait
        const pengguna = await db.pengguna.findByPk(review.ID_Pengguna);
        let relatedItem = null;
        let relatedType = '';

        if (review.Kategori === 'Product' && review.ID_Product) {
            relatedItem = await db.product.findByPk(review.ID_Product);
            relatedType = 'Produk';
        } else if (review.Kategori === 'Kegiatan' && review.ID_Kegiatan) {
            relatedItem = await db.kegiatan.findByPk(review.ID_Kegiatan);
            relatedType = 'Kegiatan';
        }

        res.render('admin/testimoni/detail', {
            review,
            pengguna,
            relatedItem,
            relatedType
        });

    } catch (error) {
        console.error('Error di renderDetail Review:', error);
        req.flash('error', 'Gagal memuat detail review.');
        res.redirect('/admin/testimoni');
    }
};

// ==================================================================
// 3. (CREATE) Menampilkan Form
// ==================================================================
module.exports.renderNewForm = async (req, res) => {
    try {
        // Ambil data untuk dropdown
        const penggunaList = await db.pengguna.findAll({ order: [['Nama', 'ASC']] });
        const produkList = await db.product.findAll({ order: [['Nama', 'ASC']] });
        const kegiatanList = await db.kegiatan.findAll({ order: [['Judul', 'ASC']] });

        res.render('admin/testimoni/new', {
            penggunaList,
            produkList,
            kegiatanList
        });
    } catch (error) {
        console.error('Error di renderNewForm Review:', error);
        req.flash('error', 'Gagal memuat form tambah review.');
        res.redirect('/admin/testimoni');
    }
};

// ==================================================================
// 4. (CREATE) Memproses Form
// ==================================================================
module.exports.createReview = async (req, res) => {
    try {
        const { Ulasan, Rating, Kategori, ID_Pengguna, ID_Product, ID_Kegiatan } = req.body;

        // Validasi input dasar
        if (!ID_Pengguna || !Kategori || Rating === undefined) {
            req.flash('error', 'Field Pengguna, Kategori, dan Rating wajib diisi.');
            return res.redirect('/admin/testimoni/new');
        }

        // Validasi: Jika kategori Product, harus ada ID_Product
        if (Kategori === 'Product' && !ID_Product) {
            req.flash('error', 'Pilih produk untuk review kategori Product.');
            return res.redirect('/admin/testimoni/new');
        }

        // Validasi: Jika kategori Kegiatan, harus ada ID_Kegiatan
        if (Kategori === 'Kegiatan' && !ID_Kegiatan) {
            req.flash('error', 'Pilih kegiatan untuk review kategori Kegiatan.');
            return res.redirect('/admin/testimoni/new');
        }

        // Validasi rating (1-5)
        const ratingNum = parseInt(Rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            req.flash('error', 'Rating harus antara 1 sampai 5.');
            return res.redirect('/admin/testimoni/new');
        }

        // Buat review baru
        await db.review.create({
            Ulasan: Ulasan || null,
            Rating: ratingNum,
            Kategori,
            ID_Pengguna: parseInt(ID_Pengguna),
            ID_Product: Kategori === 'Product' ? parseInt(ID_Product) : null,
            ID_Kegiatan: Kategori === 'Kegiatan' ? parseInt(ID_Kegiatan) : null
        });

        req.flash('success', 'Data review baru berhasil ditambahkan.');
        res.redirect('/admin/testimoni');

    } catch (error) {
        console.error('Error di createReview:', error);
        const flashError = error.message || 'Gagal menambahkan review.';
        req.flash('error', flashError);
        res.redirect('/admin/testimoni/new');
    }
};

// ==================================================================
// 5. (UPDATE) Menampilkan Form Edit
// ==================================================================
module.exports.renderEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        
        const review = await db.review.findByPk(id);
        
        if (!review) {
            req.flash('error', 'Data review tidak ditemukan.');
            return res.redirect('/admin/testimoni');
        }

        // Ambil data untuk dropdown
        const penggunaList = await db.pengguna.findAll({ order: [['Nama', 'ASC']] });
        const produkList = await db.product.findAll({ order: [['Nama', 'ASC']] });
        const kegiatanList = await db.kegiatan.findAll({ order: [['Judul', 'ASC']] });

        res.render('admin/testimoni/edit', {
            review,
            penggunaList,
            produkList,
            kegiatanList
        });

    } catch (error) {
        console.error('Error di renderEditForm Review:', error);
        req.flash('error', 'Gagal memuat form edit.');
        res.redirect('/admin/testimoni');
    }
};

// ==================================================================
// 6. (UPDATE) Memproses Form Edit
// ==================================================================
module.exports.updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { Ulasan, Rating, Kategori, ID_Pengguna, ID_Product, ID_Kegiatan } = req.body;

        const review = await db.review.findByPk(id);
        
        if (!review) {
            req.flash('error', 'Data review tidak ditemukan.');
            return res.redirect('/admin/testimoni');
        }

        // Validasi input dasar
        if (!ID_Pengguna || !Kategori || Rating === undefined) {
            req.flash('error', 'Field Pengguna, Kategori, dan Rating wajib diisi.');
            return res.redirect(`/admin/testimoni/${id}/edit`);
        }

        // Validasi kategori vs ID terkait
        if (Kategori === 'Product' && !ID_Product) {
            req.flash('error', 'Pilih produk untuk review kategori Product.');
            return res.redirect(`/admin/testimoni/${id}/edit`);
        }

        if (Kategori === 'Kegiatan' && !ID_Kegiatan) {
            req.flash('error', 'Pilih kegiatan untuk review kategori Kegiatan.');
            return res.redirect(`/admin/testimoni/${id}/edit`);
        }

        // Validasi rating (1-5)
        const ratingNum = parseInt(Rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            req.flash('error', 'Rating harus antara 1 sampai 5.');
            return res.redirect(`/admin/testimoni/${id}/edit`);
        }

        // Update review
        await review.update({
            Ulasan: Ulasan || null,
            Rating: ratingNum,
            Kategori,
            ID_Pengguna: parseInt(ID_Pengguna),
            ID_Product: Kategori === 'Product' ? parseInt(ID_Product) : null,
            ID_Kegiatan: Kategori === 'Kegiatan' ? parseInt(ID_Kegiatan) : null
        });

        req.flash('success', 'Data review berhasil diperbarui.');
        res.redirect('/admin/testimoni');

    } catch (error) {
        console.error('Error di updateReview:', error);
        const flashError = error.message || 'Gagal memperbarui review.';
        req.flash('error', flashError);
        res.redirect(`/admin/testimoni/${req.params.id}/edit`);
    }
};

// ==================================================================
// 7. (DELETE) Hapus Review
// ==================================================================
module.exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        
        const review = await db.review.findByPk(id);
        
        if (!review) {
            req.flash('error', 'Data review tidak ditemukan.');
            return res.redirect('/admin/testimoni');
        }

        await review.destroy();

        req.flash('success', 'Data review berhasil dihapus.');
        res.redirect('/admin/testimoni');

    } catch (error) {
        console.error('Error di deleteReview:', error);
        req.flash('error', 'Gagal menghapus review.');
        res.redirect('/admin/testimoni');
    }
};

// ==================================================================
// 8. (BULK ACTION) Hapus Banyak Review Sekaligus
// ==================================================================
module.exports.bulkAction = async (req, res) => {
    try {
        const { action, selectedIds } = req.body;

        if (!selectedIds || selectedIds.length === 0) {
            req.flash('error', 'Tidak ada review yang dipilih.');
            return res.redirect('/admin/testimoni');
        }

        const idsArray = Array.isArray(selectedIds) ? selectedIds : [selectedIds];

        if (action === 'delete') {
            await db.review.destroy({
                where: {
                    ID_Review: idsArray
                }
            });

            req.flash('success', `${idsArray.length} review berhasil dihapus.`);
        } else {
            req.flash('error', 'Aksi tidak valid.');
        }

        res.redirect('/admin/testimoni');

    } catch (error) {
        console.error('Error di bulkAction Review:', error);
        req.flash('error', 'Gagal melakukan bulk action.');
        res.redirect('/admin/testimoni');
    }
};

