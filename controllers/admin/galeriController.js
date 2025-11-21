// controllers/admin/galeriController.js

const db = require('../../models');
const fs = require('fs');
const path = require('path');

// Fungsi helper untuk hapus file fisik
const deleteFile = (filename) => {
  if (filename) {
    const filePath = path.join(__dirname, '../../public/images/galeri', filename);
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
// 1. (READ) Menampilkan List Group Foto (Galeri)
// ==================================================================
module.exports.renderList = async (req, res) => {
    try {
        // Ambil semua group foto
        const groupFotoList = await db.groupfoto.findAll({
            order: [['Nama', 'ASC']]
        });
        
        // Ambil semua foto
        const fotoList = await db.foto.findAll({
            order: [['ID_GroupFoto', 'ASC'], ['ID_Foto', 'ASC']]
        });

        // Buat map untuk menghitung jumlah foto per group dan thumbnail
        const photoCountMap = new Map();
        const thumbnailMap = new Map();
        
        for (const foto of fotoList) {
            const groupId = foto.ID_GroupFoto;
            
            // Hitung jumlah foto
            if (!photoCountMap.has(groupId)) {
                photoCountMap.set(groupId, 0);
            }
            photoCountMap.set(groupId, photoCountMap.get(groupId) + 1);
            
            // Set thumbnail (foto pertama)
            if (!thumbnailMap.has(groupId)) {
                thumbnailMap.set(groupId, foto.Foto);
            }
        }

        // Gabungkan data
        const displayList = groupFotoList.map(group => {
            group.dataValues.photoCount = photoCountMap.get(group.ID_GroupFoto) || 0;
            group.dataValues.thumbnail = thumbnailMap.get(group.ID_GroupFoto) || null;
            return group;
        });

        res.render('admin/galeri/index', {
            groupFotoList: displayList
        });

    } catch (error) {
        console.error('Error di renderList Galeri:', error);
        req.flash('error', 'Gagal memuat daftar galeri.');
        res.redirect('/admin/dashboard');
    }
};

// ==================================================================
// 2. (READ) Menampilkan Detail Group Foto (semua foto dalam group)
// ==================================================================
module.exports.renderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        
        const groupFoto = await db.groupfoto.findByPk(id);
        
        if (!groupFoto) {
            req.flash('error', 'Group galeri tidak ditemukan.');
            return res.redirect('/admin/galeri');
        }

        // Ambil semua foto dalam group ini
        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: id },
            order: [['ID_Foto', 'ASC']]
        });

        res.render('admin/galeri/detail', {
            groupFoto,
            fotoList
        });

    } catch (error) {
        console.error('Error di renderDetail Galeri:', error);
        req.flash('error', 'Gagal memuat detail galeri.');
        res.redirect('/admin/galeri');
    }
};

// ==================================================================
// 3. (CREATE) Menampilkan Form Tambah Group Foto
// ==================================================================
module.exports.renderNewForm = (req, res) => {
    res.render('admin/galeri/new');
};

// ==================================================================
// 4. (CREATE) Memproses Form Tambah Group Foto dengan Foto
// ==================================================================
module.exports.createGaleri = async (req, res) => {
    const t = await db.sequelize.transaction();
    const uploadedFiles = req.files || [];
    
    try {
        const { Nama } = req.body;

        // Validasi
        if (!Nama || Nama.trim() === '') {
            req.flash('error', 'Nama galeri wajib diisi.');
            // Hapus file yang sudah diupload
            uploadedFiles.forEach(file => deleteFile(file.filename));
            await t.rollback();
            return res.redirect('/admin/galeri/new');
        }

        // Buat group foto baru
        const newGroup = await db.groupfoto.create({
            Nama: Nama.trim()
        }, { transaction: t });

        // Jika ada foto yang diupload, simpan ke tabel foto
        if (uploadedFiles.length > 0) {
            const fotoData = uploadedFiles.map(file => ({
                Foto: file.filename,
                ID_GroupFoto: newGroup.ID_GroupFoto
            }));

            await db.foto.bulkCreate(fotoData, { transaction: t });
        }

        await t.commit();
        req.flash('success', `Galeri "${Nama}" berhasil ditambahkan dengan ${uploadedFiles.length} foto.`);
        res.redirect('/admin/galeri');

    } catch (error) {
        await t.rollback();
        console.error('Error di createGaleri:', error);
        
        // Hapus semua file yang sudah diupload
        uploadedFiles.forEach(file => deleteFile(file.filename));
        
        const flashError = error.message || 'Gagal menambahkan galeri.';
        req.flash('error', flashError);
        res.redirect('/admin/galeri/new');
    }
};

// ==================================================================
// 5. (UPDATE) Menampilkan Form Edit Group Foto
// ==================================================================
module.exports.renderEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        
        const groupFoto = await db.groupfoto.findByPk(id);
        
        if (!groupFoto) {
            req.flash('error', 'Group galeri tidak ditemukan.');
            return res.redirect('/admin/galeri');
        }

        // Ambil semua foto dalam group ini
        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: id },
            order: [['ID_Foto', 'ASC']]
        });

        res.render('admin/galeri/edit', {
            groupFoto,
            fotoList
        });

    } catch (error) {
        console.error('Error di renderEditForm Galeri:', error);
        req.flash('error', 'Gagal memuat form edit.');
        res.redirect('/admin/galeri');
    }
};

// ==================================================================
// 6. (UPDATE) Memproses Form Edit (Update nama + tambah foto)
// ==================================================================
module.exports.updateGaleri = async (req, res) => {
    const { id } = req.params;
    const t = await db.sequelize.transaction();
    const uploadedFiles = req.files || [];
    
    try {
        const { Nama } = req.body;

        const groupFoto = await db.groupfoto.findByPk(id);
        
        if (!groupFoto) {
            req.flash('error', 'Group galeri tidak ditemukan.');
            uploadedFiles.forEach(file => deleteFile(file.filename));
            await t.rollback();
            return res.redirect('/admin/galeri');
        }

        // Validasi
        if (!Nama || Nama.trim() === '') {
            req.flash('error', 'Nama galeri wajib diisi.');
            uploadedFiles.forEach(file => deleteFile(file.filename));
            await t.rollback();
            return res.redirect(`/admin/galeri/${id}/edit`);
        }

        // Update nama group
        await groupFoto.update({
            Nama: Nama.trim()
        }, { transaction: t });

        // Jika ada foto baru, tambahkan
        if (uploadedFiles.length > 0) {
            const fotoData = uploadedFiles.map(file => ({
                Foto: file.filename,
                ID_GroupFoto: id
            }));

            await db.foto.bulkCreate(fotoData, { transaction: t });
        }

        await t.commit();
        req.flash('success', `Galeri "${Nama}" berhasil diperbarui. ${uploadedFiles.length} foto baru ditambahkan.`);
        res.redirect('/admin/galeri');

    } catch (error) {
        await t.rollback();
        console.error('Error di updateGaleri:', error);
        
        uploadedFiles.forEach(file => deleteFile(file.filename));
        
        const flashError = error.message || 'Gagal memperbarui galeri.';
        req.flash('error', flashError);
        res.redirect(`/admin/galeri/${id}/edit`);
    }
};

// ==================================================================
// 7. (DELETE) Hapus Group Foto (dan semua foto di dalamnya)
// ==================================================================
module.exports.deleteGaleri = async (req, res) => {
    const t = await db.sequelize.transaction();
    
    try {
        const { id } = req.params;
        
        const groupFoto = await db.groupfoto.findByPk(id);
        
        if (!groupFoto) {
            req.flash('error', 'Group galeri tidak ditemukan.');
            await t.rollback();
            return res.redirect('/admin/galeri');
        }

        // Ambil semua foto dalam group
        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: id }
        });

        // Hapus file fisik
        fotoList.forEach(foto => {
            deleteFile(foto.Foto);
        });

        // Hapus record foto dari database
        await db.foto.destroy({
            where: { ID_GroupFoto: id },
            transaction: t
        });

        // Hapus group foto
        await groupFoto.destroy({ transaction: t });

        await t.commit();
        req.flash('success', `Galeri "${groupFoto.Nama}" dan ${fotoList.length} foto berhasil dihapus.`);
        res.redirect('/admin/galeri');

    } catch (error) {
        await t.rollback();
        console.error('Error di deleteGaleri:', error);
        req.flash('error', 'Gagal menghapus galeri.');
        res.redirect('/admin/galeri');
    }
};

// ==================================================================
// 8. (DELETE) Bulk Delete Foto (hapus foto tertentu dalam group)
// ==================================================================
module.exports.bulkDeleteFotos = async (req, res) => {
    const { id } = req.params; // ID Group
    const { selectedFotoIds } = req.body;
    const t = await db.sequelize.transaction();
    
    try {
        if (!selectedFotoIds || selectedFotoIds.length === 0) {
            req.flash('error', 'Tidak ada foto yang dipilih untuk dihapus.');
            return res.redirect(`/admin/galeri/${id}/edit`);
        }

        const idsArray = Array.isArray(selectedFotoIds) ? selectedFotoIds : [selectedFotoIds];

        // Ambil semua foto yang akan dihapus
        const fotosToDelete = await db.foto.findAll({
            where: {
                ID_Foto: idsArray,
                ID_GroupFoto: id
            }
        });

        // Hapus file fisik
        fotosToDelete.forEach(foto => {
            deleteFile(foto.Foto);
        });

        // Hapus dari database
        await db.foto.destroy({
            where: {
                ID_Foto: idsArray,
                ID_GroupFoto: id
            },
            transaction: t
        });

        await t.commit();
        req.flash('success', `${fotosToDelete.length} foto berhasil dihapus.`);
        res.redirect(`/admin/galeri/${id}/edit`);

    } catch (error) {
        await t.rollback();
        console.error('Error di bulkDeleteFotos:', error);
        req.flash('error', 'Gagal menghapus foto.');
        res.redirect(`/admin/galeri/${id}/edit`);
    }
};

// ==================================================================
// 9. (DELETE) Hapus satu foto
// ==================================================================
module.exports.deleteSingleFoto = async (req, res) => {
    const { id, fotoId } = req.params; // id = ID_GroupFoto, fotoId = ID_Foto
    const t = await db.sequelize.transaction();
    
    try {
        const foto = await db.foto.findOne({
            where: {
                ID_Foto: fotoId,
                ID_GroupFoto: id
            }
        });

        if (!foto) {
            req.flash('error', 'Foto tidak ditemukan.');
            await t.rollback();
            return res.redirect(`/admin/galeri/${id}/edit`);
        }

        // Hapus file fisik
        deleteFile(foto.Foto);

        // Hapus dari database
        await foto.destroy({ transaction: t });

        await t.commit();
        req.flash('success', 'Foto berhasil dihapus.');
        res.redirect(`/admin/galeri/${id}/edit`);

    } catch (error) {
        await t.rollback();
        console.error('Error di deleteSingleFoto:', error);
        req.flash('error', 'Gagal menghapus foto.');
        res.redirect(`/admin/galeri/${id}/edit`);
    }
};

// ==================================================================
// 10. (BULK ACTION) Hapus Banyak Group Galeri Sekaligus
// ==================================================================
module.exports.bulkAction = async (req, res) => {
    const t = await db.sequelize.transaction();
    
    try {
        const { action, selectedIds } = req.body;

        if (!selectedIds || selectedIds.length === 0) {
            req.flash('error', 'Tidak ada galeri yang dipilih.');
            return res.redirect('/admin/galeri');
        }

        const idsArray = Array.isArray(selectedIds) ? selectedIds : [selectedIds];

        if (action === 'delete') {
            // Ambil semua foto dari semua group yang akan dihapus
            const allFotos = await db.foto.findAll({
                where: { ID_GroupFoto: idsArray }
            });

            // Hapus semua file fisik
            allFotos.forEach(foto => {
                deleteFile(foto.Foto);
            });

            // Hapus semua foto dari database
            await db.foto.destroy({
                where: { ID_GroupFoto: idsArray },
                transaction: t
            });

            // Hapus semua group
            await db.groupfoto.destroy({
                where: { ID_GroupFoto: idsArray },
                transaction: t
            });

            await t.commit();
            req.flash('success', `${idsArray.length} galeri dan ${allFotos.length} foto berhasil dihapus.`);
        } else {
            await t.rollback();
            req.flash('error', 'Aksi tidak valid.');
        }

        res.redirect('/admin/galeri');

    } catch (error) {
        await t.rollback();
        console.error('Error di bulkAction Galeri:', error);
        req.flash('error', 'Gagal melakukan bulk action.');
        res.redirect('/admin/galeri');
    }
};
