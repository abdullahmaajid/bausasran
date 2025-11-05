// controllers/admin/prestasiController.js

const db = require('../../models');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize'); // <-- DIPERBAIKI: 'Op' sudah di-import

// Fungsi helper untuk hapus file fisik (di folder 'prestasi')
const deleteFile = (filename) => {
  if (filename) {
    const filePath = path.join(__dirname, '../../public/images/prestasi', filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`File fisik ${filename} berhasil dihapus.`);
      } catch (err) {
        console.error(`Gagal menghapus file fisik ${filename}:`, err);
      }
    }
  }
};

// ==================================================================
// 1. (READ) Menampilkan List Prestasi
// ==================================================================
module.exports.renderList = async (req, res) => {
    try {
        const prestasiList = await db.prestasi.findAll({
            order: [['Tanggal', 'DESC']]
        });
        const fotoList = await db.foto.findAll({ order: [['ID_Foto', 'ASC']] });

        const thumbnailMap = new Map();
        for (const foto of fotoList) {
            if (!thumbnailMap.has(foto.ID_GroupFoto)) {
                thumbnailMap.set(foto.ID_GroupFoto, foto.Foto);
            }
        }

        const displayList = prestasiList.map(prestasi => {
            prestasi.dataValues.thumbnailFile = thumbnailMap.get(prestasi.ID_GroupFoto) || null;
            return prestasi;
        });

        res.render('admin/prestasi/index', {
            prestasiList: displayList
        });

    } catch (error) {
        console.error("Error di renderList Prestasi:", error);
        req.flash('error', 'Gagal memuat daftar prestasi.');
        res.redirect('/admin/dashboard');
    }
};

// ==================================================================
// 2. (CREATE) Menampilkan Form
// ==================================================================
module.exports.renderNewForm = (req, res) => {
    res.render('admin/prestasi/new');
};

// ==================================================================
// 3. (CREATE) Memproses Form
// ==================================================================
module.exports.createPrestasi = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { Judul, Tanggal, Kategori } = req.body;

        if (!Judul || !Tanggal) {
             req.flash('error', 'Field Judul dan Tanggal wajib diisi.');
             if (req.files) req.files.forEach(file => deleteFile(file.filename));
             await t.rollback();
             return res.redirect('/admin/prestasi/new');
        }

        const newGroupFoto = await db.groupfoto.create({
            Nama: `Galeri Prestasi - ${Judul}`
        }, { transaction: t });

        if (req.files && req.files.length > 0) {
            const fotoData = req.files.map(file => ({
                Foto: file.filename,
                ID_GroupFoto: newGroupFoto.ID_GroupFoto
            }));
            await db.foto.bulkCreate(fotoData, { transaction: t });
        }

        await db.prestasi.create({
            Judul: Judul,
            Tanggal: Tanggal,
            Kategori: Kategori,
            ID_GroupFoto: newGroupFoto.ID_GroupFoto
        }, { transaction: t });

        await t.commit();
        req.flash('success', 'Data prestasi baru berhasil ditambahkan.');
        res.redirect('/admin/prestasi');

    } catch (error) {
        await t.rollback(); 
        if (req.files) req.files.forEach(file => deleteFile(file.filename)); 
        let flashError = 'Gagal menambahkan data baru.';
        if (error.name === 'SequelizeValidationError') {
            flashError = error.errors.map(err => err.message).join(', ');
        } else if (error.message.includes('Hanya file')) {
             flashError = error.message;
        }
        console.error("Error di createPrestasi:", error);
        req.flash('error', flashError);
        res.redirect('/admin/prestasi/new');
    }
};

// ==================================================================
// 4. (READ) Menampilkan Halaman Detail
// ==================================================================
module.exports.renderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const prestasi = await db.prestasi.findByPk(id);
        
        if (!prestasi) {
            req.flash('error', 'Data prestasi tidak ditemukan.');
            return res.redirect('/admin/prestasi');
        }

        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: prestasi.ID_GroupFoto },
            order: [['ID_Foto', 'ASC']]
        });

        res.render('admin/prestasi/detail', { 
            prestasi, 
            fotoList 
        });

    } catch (error) {
        console.error("Error di renderDetail Prestasi:", error);
        req.flash('error', 'Gagal memuat detail prestasi.');
        res.redirect('/admin/prestasi');
    }
};


// ==================================================================
// 5. (UPDATE) Menampilkan Form
// ==================================================================
module.exports.renderEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        const prestasi = await db.prestasi.findByPk(id);
        
        if (!prestasi) {
            req.flash('error', 'Data prestasi tidak ditemukan.');
            return res.redirect('/admin/prestasi');
        }

        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: prestasi.ID_GroupFoto },
            order: [['ID_Foto', 'ASC']]
        });

        const thumbnailId = (fotoList && fotoList.length > 0) ? fotoList[0].ID_Foto : null;
            res.render('admin/prestasi/edit', { 
                prestasi, 
                fotoList,
                thumbnailId: thumbnailId // Kirim ID thumbnail ke EJS
        });

    } catch (error) {
        console.error("Error di renderEditForm Prestasi:", error);
        req.flash('error', 'Gagal memuat form edit.');
        res.redirect('/admin/prestasi');
    }
};

// ==================================================================
// 6. (UPDATE) Memproses Form
// ==================================================================
module.exports.updatePrestasi = async (req, res) => {
    const { id } = req.params;
    const t = await db.sequelize.transaction();
    try {
        const { Judul, Tanggal, Kategori } = req.body;
        const prestasi = await db.prestasi.findByPk(id);

        if (!prestasi) {
            req.flash('error', 'Data prestasi tidak ditemukan.');
            if (req.files) req.files.forEach(file => deleteFile(file.filename));
            await t.rollback();
            return res.redirect('/admin/prestasi');
        }

        if (!Judul || !Tanggal) {
             req.flash('error', 'Field Judul dan Tanggal wajib diisi.');
             if (req.files) req.files.forEach(file => deleteFile(file.filename));
             await t.rollback();
             return res.redirect(`/admin/prestasi/${id}/edit`);
        }

        await prestasi.update({
            Judul: Judul,
            Tanggal: Tanggal,
            Kategori: Kategori
        }, { transaction: t });

        await db.groupfoto.update(
            { Nama: `Galeri Prestasi - ${Judul}` },
            { where: { ID_GroupFoto: prestasi.ID_GroupFoto }, transaction: t }
        );

        if (req.files && req.files.length > 0) {
            const fotoData = req.files.map(file => ({
                Foto: file.filename,
                ID_GroupFoto: prestasi.ID_GroupFoto
            }));
            await db.foto.bulkCreate(fotoData, { transaction: t });
        }
        
        await t.commit(); 
        req.flash('success', 'Data prestasi berhasil diperbarui.');
        res.redirect('/admin/prestasi');

    } catch (error) {
        await t.rollback();
        if (req.files) req.files.forEach(file => deleteFile(file.filename)); 
        let flashError = 'Gagal memperbarui data.';
        if (error.name === 'SequelizeValidationError') {
            flashError = error.errors.map(err => err.message).join(', ');
        } else if (error.message.includes('Hanya file')) {
             flashError = error.message;
        }
        console.error("Error di updatePrestasi:", error);
        req.flash('error', flashError);
        res.redirect(`/admin/prestasi/${id}/edit`);
    }
};

// ==================================================================
// 7. (DELETE) Memproses Hapus
// ==================================================================
module.exports.deletePrestasi = async (req, res) => {
    const { id } = req.params;
    const t = await db.sequelize.transaction();
    try {
        const prestasi = await db.prestasi.findByPk(id);
        if (!prestasi) {
            req.flash('error', 'Data prestasi tidak ditemukan.');
            await t.rollback();
            return res.redirect('/admin/prestasi');
        }
        
        const groupFotoId = prestasi.ID_GroupFoto;
        const judulPrestasi = prestasi.Judul;

        const fotoList = await db.foto.findAll({ where: { ID_GroupFoto: groupFotoId } });
        for (const foto of fotoList) {
            deleteFile(foto.Foto);
            await foto.destroy({ transaction: t });
        }

        await prestasi.destroy({ transaction: t });
        await db.groupfoto.destroy({ where: { ID_GroupFoto: groupFotoId }, transaction: t });
        
        await t.commit();
        req.flash('success', `Data prestasi '${judulPrestasi}' berhasil dihapus.`);
        res.redirect('/admin/prestasi');

    } catch (error) {
        await t.rollback();
        console.error("Error di deletePrestasi:", error);
        req.flash('error', 'Gagal menghapus data.');
        res.redirect('/admin/prestasi');
    }
};

// ==================================================================
// 8. (DELETE) Hapus Foto Massal (dari Halaman Edit)
// ==================================================================
module.exports.bulkDeleteFotos = async (req, res) => {
    const { id } = req.params; // ID Prestasi
    const { fotoIds } = req.body; // Array ID Foto yang dipilih

    if (!fotoIds || fotoIds.length === 0) {
        req.flash('error', 'Tidak ada foto yang dipilih untuk dihapus.');
        return res.redirect(`/admin/prestasi/${id}/edit`);
    }

    const idsToDelete = Array.isArray(fotoIds) ? fotoIds : [fotoIds];
    
    try {
        const fotoList = await db.foto.findAll({
            where: { ID_Foto: { [Op.in]: idsToDelete } } // 'Op' digunakan di sini
        });

        for (const foto of fotoList) {
            deleteFile(foto.Foto);
        }

        await db.foto.destroy({
            where: { ID_Foto: { [Op.in]: idsToDelete } }
        });

        req.flash('success', `${idsToDelete.length} foto berhasil dihapus dari galeri.`);
        res.redirect(`/admin/prestasi/${id}/edit`);

    } catch (error) {
        console.error("Error di bulkDeleteFotos Prestasi:", error);
        req.flash('error', 'Gagal menghapus foto.');
        res.redirect(`/admin/prestasi/${id}/edit`);
    }
};

// ==================================================================
// BARU: (DELETE) Aksi Massal (Bulk Delete dari Index)
// ==================================================================
module.exports.bulkAction = async (req, res) => {
    const { action, selectedIds } = req.body;

    // 1. Validasi
    if (action !== 'delete') {
        req.flash('error', 'Aksi tidak valid.');
        return res.redirect('/admin/prestasi');
    }
    if (!selectedIds || selectedIds.length === 0) {
        req.flash('error', 'Tidak ada item yang dipilih.');
        return res.redirect('/admin/prestasi');
    }

    const idsToDelete = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
    
    const t = await db.sequelize.transaction();
    try {
        // 2. Kumpulkan semua ID terkait
        const prestasis = await db.prestasi.findAll({
            where: { ID_Prestasi: { [Op.in]: idsToDelete } }, // 'Op' digunakan di sini
            transaction: t
        });
        
        const groupFotoIds = prestasis.map(p => p.ID_GroupFoto);

        // 3. Kumpulkan semua file fisik untuk dihapus
        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: { [Op.in]: groupFotoIds } } // 'Op' digunakan di sini
        });
        
        // 4. Hapus file fisik (di luar transaksi)
        for (const foto of fotoList) {
            deleteFile(foto.Foto);
        }

        // 5. Hapus dari database (di dalam transaksi, urutan penting!)
        // Hapus anak-anak
        await db.foto.destroy({ where: { ID_GroupFoto: { [Op.in]: groupFotoIds } }, transaction: t });
        
        // Hapus item utama
        await db.prestasi.destroy({ where: { ID_Prestasi: { [Op.in]: idsToDelete } }, transaction: t });
        
        // Hapus induk
        await db.groupfoto.destroy({ where: { ID_GroupFoto: { [Op.in]: groupFotoIds } }, transaction: t });

        await t.commit();
        req.flash('success', `${idsToDelete.length} data prestasi berhasil dihapus.`);
        res.redirect('/admin/prestasi');

    } catch (error)
    {
        await t.rollback();
        console.error("Error di bulkAction Prestasi:", error);
        req.flash('error', 'Gagal menghapus data secara massal.');
        res.redirect('/admin/prestasi');
    }
};

// ==================================================================
// BARU: (UPDATE) Menetapkan Thumbnail
// ==================================================================
module.exports.setThumbnail = async (req, res) => {
    const { prestasiId, fotoId } = req.params; 
    const newThumbnailId = parseInt(fotoId, 10);

    const t = await db.sequelize.transaction();
    try {
        const prestasi = await db.prestasi.findByPk(prestasiId);
        const groupId = prestasi.ID_GroupFoto;

        const currentThumbnail = await db.foto.findOne({
            where: { ID_GroupFoto: groupId },
            order: [['ID_Foto', 'ASC']],
            transaction: t
        });

        const newThumbnail = await db.foto.findByPk(newThumbnailId, { transaction: t });

        if (!newThumbnail || newThumbnail.ID_GroupFoto !== groupId) {
            throw new Error('Foto baru tidak ditemukan di grup ini.');
        }
        if (!currentThumbnail) {
            throw new Error('Thumbnail lama tidak ditemukan.');
        }

        if (currentThumbnail.ID_Foto === newThumbnail.ID_Foto) {
            req.flash('info', 'Foto ini sudah menjadi thumbnail.');
            await t.rollback();
            return res.redirect(`/admin/prestasi/${prestasiId}/edit`);
        }

        // TUKAR NAMA FILENYA
        const oldThumbnailFilename = currentThumbnail.Foto;
        const newThumbnailFilename = newThumbnail.Foto;

        await currentThumbnail.update({ Foto: newThumbnailFilename }, { transaction: t });
        await newThumbnail.update({ Foto: oldThumbnailFilename }, { transaction: t });

        await t.commit();
        req.flash('success', 'Thumbnail berhasil diperbarui.');
        res.redirect(`/admin/prestasi/${prestasiId}/edit`);

    } catch (error) {
        await t.rollback();
        console.error("Error di setThumbnail Prestasi:", error);
        req.flash('error', 'Gagal memperbarui thumbnail.');
        res.redirect(`/admin/prestasi/${prestasiId}/edit`);
    }
};

// ==================================================================
// BARU: (UPDATE) Mengganti Foto Spesifik di Galeri Prestasi
// ==================================================================
module.exports.replaceFotoPrestasi = async (req, res) => {
    const { prestasiId, fotoId } = req.params;

    if (!req.file) {
        req.flash('error', 'Tidak ada file foto baru yang diunggah.');
        return res.redirect(`/admin/prestasi/${prestasiId}/edit`);
    }

    const t = await db.sequelize.transaction();
    try {
        const fotoToReplace = await db.foto.findByPk(fotoId, { transaction: t });

        if (!fotoToReplace) {
            deleteFile(req.file.filename); 
            req.flash('error', 'Foto yang akan diganti tidak ditemukan.');
            await t.rollback();
            return res.redirect(`/admin/prestasi/${prestasiId}/edit`);
        }

        const oldFileName = fotoToReplace.Foto; 
        
        // 1. Update nama file di database
        await fotoToReplace.update({ Foto: req.file.filename }, { transaction: t });

        // 2. Hapus file fisik lama
        deleteFile(oldFileName); 

        await t.commit();
        req.flash('success', 'Foto berhasil diganti.');
        res.redirect(`/admin/prestasi/${prestasiId}/edit`);

    } catch (error) {
        await t.rollback();
        deleteFile(req.file.filename); 
        console.error("Error di replaceFotoPrestasi:", error);
        req.flash('error', 'Gagal mengganti foto.');
        res.redirect(`/admin/prestasi/${prestasiId}/edit`);
    }
};