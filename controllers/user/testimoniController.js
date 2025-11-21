// controllers/user/testimoniController.js

const db = require('../../models');

// ==================================================================
// 1. Menampilkan Halaman Testimoni User (List Testimoni User)
// ==================================================================
module.exports.renderTestimoni = async (req, res) => {
    try {
        // Ambil semua testimoni/review yang dibuat oleh user ini
        const myReviewList = await db.review.findAll({
            where: { ID_Pengguna: req.user.ID_Pengguna },
            order: [['ID_Review', 'DESC']]
        });

        // Ambil data produk dan kegiatan untuk ditampilkan
        const produkList = await db.product.findAll();
        const kegiatanList = await db.kegiatan.findAll();

        // Buat map untuk lookup
        const produkMap = new Map(produkList.map(p => [p.ID_Product, p]));
        const kegiatanMap = new Map(kegiatanList.map(k => [k.ID_Kegiatan, k]));

        // Gabungkan data
        const displayList = myReviewList.map(review => {
            review.dataValues.produk = produkMap.get(review.ID_Product) || null;
            review.dataValues.kegiatan = kegiatanMap.get(review.ID_Kegiatan) || null;
            return review;
        });

        res.render('user/testimoni/index', {
            myReviewList: displayList
        });
    } catch (error) {
        console.error('Error di renderTestimoni User:', error);
        req.flash('error', 'Gagal memuat halaman testimoni.');
        res.redirect('/');
    }
};

// ==================================================================
// 2. Menampilkan Form Tambah Testimoni
// ==================================================================
module.exports.renderTambahForm = async (req, res) => {
    try {
        // Ambil daftar produk dan kegiatan untuk dropdown
        const produkList = await db.product.findAll({ 
            order: [['Nama', 'ASC']] 
        });
        const kegiatanList = await db.kegiatan.findAll({ 
            order: [['Judul', 'ASC']] 
        });

        res.render('user/testimoni/tambah', {
            produkList,
            kegiatanList
        });
    } catch (error) {
        console.error('Error di renderTambahForm:', error);
        req.flash('error', 'Gagal memuat form testimoni.');
        res.redirect('/user/testimoni');
    }
};

// ==================================================================
// 3. Memproses Form Tambah Testimoni
// ==================================================================
module.exports.createTestimoni = async (req, res) => {
    try {
        const { Ulasan, Rating, Kategori, ID_Product, ID_Kegiatan } = req.body;

        // Validasi
        if (!Kategori || Rating === undefined) {
            req.flash('error', 'Kategori dan Rating wajib diisi.');
            return res.redirect('/user/testimoni/tambah');
        }

        // Validasi Rating (1-5)
        const ratingNum = parseInt(Rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            req.flash('error', 'Rating harus antara 1 sampai 5.');
            return res.redirect('/user/testimoni/tambah');
        }

        // Validasi: Jika kategori Product, harus ada ID_Product
        if (Kategori === 'Product' && !ID_Product) {
            req.flash('error', 'Pilih produk untuk review kategori Product.');
            return res.redirect('/user/testimoni/tambah');
        }

        // Validasi: Jika kategori Kegiatan, harus ada ID_Kegiatan
        if (Kategori === 'Kegiatan' && !ID_Kegiatan) {
            req.flash('error', 'Pilih kegiatan untuk review kategori Kegiatan.');
            return res.redirect('/user/testimoni/tambah');
        }

        // Buat testimoni baru
        await db.review.create({
            Ulasan: Ulasan || null,
            Rating: ratingNum,
            Kategori,
            ID_Pengguna: req.user.ID_Pengguna, // Dari session user yang login
            ID_Product: Kategori === 'Product' ? parseInt(ID_Product) : null,
            ID_Kegiatan: Kategori === 'Kegiatan' ? parseInt(ID_Kegiatan) : null
        });

        req.flash('success', 'Testimoni Anda berhasil ditambahkan. Terima kasih!');
        res.redirect('/user/testimoni');

    } catch (error) {
        console.error('Error di createTestimoni:', error);
        const flashError = error.message || 'Gagal menambahkan testimoni.';
        req.flash('error', flashError);
        res.redirect('/user/testimoni/tambah');
    }
};

// ==================================================================
// 4. Menampilkan Form Edit Testimoni
// ==================================================================
module.exports.renderEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        
        const review = await db.review.findByPk(id);
        
        if (!review) {
            req.flash('error', 'Testimoni tidak ditemukan.');
            return res.redirect('/user/testimoni');
        }

        // Cek apakah testimoni ini milik user yang sedang login
        if (review.ID_Pengguna !== req.user.ID_Pengguna) {
            req.flash('error', 'Anda tidak memiliki akses untuk mengedit testimoni ini.');
            return res.redirect('/user/testimoni');
        }

        // Ambil data untuk dropdown
        const produkList = await db.product.findAll({ order: [['Nama', 'ASC']] });
        const kegiatanList = await db.kegiatan.findAll({ order: [['Judul', 'ASC']] });

        res.render('user/testimoni/edit', {
            review,
            produkList,
            kegiatanList
        });

    } catch (error) {
        console.error('Error di renderEditForm User:', error);
        req.flash('error', 'Gagal memuat form edit.');
        res.redirect('/user/testimoni');
    }
};

// ==================================================================
// 5. Memproses Form Edit Testimoni
// ==================================================================
module.exports.updateTestimoni = async (req, res) => {
    try {
        const { id } = req.params;
        const { Ulasan, Rating, Kategori, ID_Product, ID_Kegiatan } = req.body;

        const review = await db.review.findByPk(id);
        
        if (!review) {
            req.flash('error', 'Testimoni tidak ditemukan.');
            return res.redirect('/user/testimoni');
        }

        // Cek ownership
        if (review.ID_Pengguna !== req.user.ID_Pengguna) {
            req.flash('error', 'Anda tidak memiliki akses untuk mengedit testimoni ini.');
            return res.redirect('/user/testimoni');
        }

        // Validasi
        if (!Kategori || Rating === undefined) {
            req.flash('error', 'Kategori dan Rating wajib diisi.');
            return res.redirect(`/user/testimoni/${id}/edit`);
        }

        // Validasi Rating (1-5)
        const ratingNum = parseInt(Rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            req.flash('error', 'Rating harus antara 1 sampai 5.');
            return res.redirect(`/user/testimoni/${id}/edit`);
        }

        if (Kategori === 'Product' && !ID_Product) {
            req.flash('error', 'Pilih produk untuk review kategori Product.');
            return res.redirect(`/user/testimoni/${id}/edit`);
        }

        if (Kategori === 'Kegiatan' && !ID_Kegiatan) {
            req.flash('error', 'Pilih kegiatan untuk review kategori Kegiatan.');
            return res.redirect(`/user/testimoni/${id}/edit`);
        }

        // Update testimoni
        await review.update({
            Ulasan: Ulasan || null,
            Rating: ratingNum,
            Kategori,
            ID_Product: Kategori === 'Product' ? parseInt(ID_Product) : null,
            ID_Kegiatan: Kategori === 'Kegiatan' ? parseInt(ID_Kegiatan) : null
        });

        req.flash('success', 'Testimoni berhasil diperbarui.');
        res.redirect('/user/testimoni');

    } catch (error) {
        console.error('Error di updateTestimoni:', error);
        const flashError = error.message || 'Gagal memperbarui testimoni.';
        req.flash('error', flashError);
        res.redirect(`/user/testimoni/${req.params.id}/edit`);
    }
};

// ==================================================================
// 6. Hapus Testimoni
// ==================================================================
module.exports.deleteTestimoni = async (req, res) => {
    try {
        const { id } = req.params;
        
        const review = await db.review.findByPk(id);
        
        if (!review) {
            req.flash('error', 'Testimoni tidak ditemukan.');
            return res.redirect('/user/testimoni');
        }

        // Cek ownership
        if (review.ID_Pengguna !== req.user.ID_Pengguna) {
            req.flash('error', 'Anda tidak memiliki akses untuk menghapus testimoni ini.');
            return res.redirect('/user/testimoni');
        }

        await review.destroy();

        req.flash('success', 'Testimoni berhasil dihapus.');
        res.redirect('/user/testimoni');

    } catch (error) {
        console.error('Error di deleteTestimoni:', error);
        req.flash('error', 'Gagal menghapus testimoni.');
        res.redirect('/user/testimoni');
    }
};
