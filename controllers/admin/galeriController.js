// controllers/admin/galeriController.js

const db = require('../../models');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');

// Fungsi helper untuk hapus file fisik (Smart Delete - Cek berbagai folder)
const deleteFile = (filename) => {
  if (!filename) return;

  // Daftar folder prioritas yang mungkin menyimpan file
  // Kita cek 'galeri' terakhir jika yang lain tidak ketemu, atau masukkan dalam list
  const possibleFolders = ['galeri', 'kegiatan', 'produk', 'prestasi', 'anggota'];
  let fileFound = false;

  for (const folder of possibleFolders) {
      const filePath = path.join(__dirname, `../../public/images/${folder}`, filename);
      if (fs.existsSync(filePath)) {
          try {
              fs.unlinkSync(filePath);
              console.log(`File fisik ${filename} BERHASIL dihapus dari folder '${folder}'.`);
              fileFound = true;
              break; // Stop loop jika sudah ketemu & dihapus
          } catch (err) {
              console.error(`Gagal menghapus file fisik ${filename} dari ${folder}:`, err);
          }
      }
  }

  if (!fileFound) {
      console.warn(`File fisik ${filename} tidak ditemukan di folder manapun (${possibleFolders.join(', ')}).`);
  }
};

// Helper untuk menentukan folder berdasarkan relasi database, fallback ke nama
const determineFolder = (group) => {
    // 1. Cek Relasi Database (Pasti Akurat)
    if (group.products && group.products.length > 0) return 'produk';
    if (group.kegiatans && group.kegiatans.length > 0) return 'kegiatan';
    if (group.prestasis && group.prestasis.length > 0) return 'prestasi';
    
    // 2. Fallback: Cek Nama (Untuk manual upload / legacy)
    const groupName = group.Nama || '';
    if (!groupName) return 'galeri';
    
    const lowerName = groupName.toLowerCase();
    if (lowerName.includes('kegiatan')) return 'kegiatan';
    if (lowerName.includes('produk') || lowerName.includes('spek')) return 'produk';
    if (lowerName.includes('prestasi')) return 'prestasi';
    if (lowerName.includes('anggota')) return 'anggota';
    
    return 'galeri';
};

// ==================================================================
// 1. (READ) Menampilkan List Group Foto (Galeri)
// ==================================================================
module.exports.renderList = async (req, res) => {
    try {
        // Ambil semua group foto BESERTA relasinya untuk deteksi folder
        const groupFotoList = await db.groupfoto.findAll({
            include: [
                { model: db.product, as: 'products', attributes: ['ID_Product'] },
                { model: db.kegiatan, as: 'kegiatans', attributes: ['ID_Kegiatan'] },
                { model: db.prestasi, as: 'prestasis', attributes: ['ID_Prestasi'] }
            ],
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
            // Tentukan folder berdasarkan Relasi & Nama
            group.dataValues.folder = determineFolder(group);
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
        
        const groupFoto = await db.groupfoto.findByPk(id, {
            include: [
                { model: db.product, as: 'products', attributes: ['ID_Product'] },
                { model: db.kegiatan, as: 'kegiatans', attributes: ['ID_Kegiatan'] },
                { model: db.prestasi, as: 'prestasis', attributes: ['ID_Prestasi'] }
            ]
        });
        
        if (!groupFoto) {
            req.flash('error', 'Group galeri tidak ditemukan.');
            return res.redirect('/admin/galeri');
        }

        // Ambil semua foto dalam group ini
        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: id },
            order: [['ID_Foto', 'ASC']]
        });

        // Tentukan folder
        const folder = determineFolder(groupFoto);

        res.render('admin/galeri/detail', {
            groupFoto,
            fotoList,
            folder // Kirim info folder ke view
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
        
        const groupFoto = await db.groupfoto.findByPk(id, {
            include: [
                { model: db.product, as: 'products', attributes: ['ID_Product'] },
                { model: db.kegiatan, as: 'kegiatans', attributes: ['ID_Kegiatan'] },
                { model: db.prestasi, as: 'prestasis', attributes: ['ID_Prestasi'] }
            ]
        });
        
        if (!groupFoto) {
            req.flash('error', 'Group galeri tidak ditemukan.');
            return res.redirect('/admin/galeri');
        }

        // Ambil semua foto dalam group ini
        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: id },
            order: [['ID_Foto', 'ASC']]
        });

        // Tentukan folder
        const folder = determineFolder(groupFoto);

        res.render('admin/galeri/edit', {
            groupFoto,
            fotoList,
            folder // Kirim info folder ke view
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

        // --- CEK DEPENDENSI SEBELUM HAPUS ---
        // Cek Produk
        const usedInProduct = await db.product.findOne({ where: { ID_GroupFoto: id } });
        if (usedInProduct) {
            await t.rollback();
            req.flash('error', `Gagal hapus: Album ini digunakan oleh Produk "${usedInProduct.Nama}". Silakan hapus produknya terlebih dahulu.`);
            return res.redirect('/admin/galeri');
        }

        // Cek Kegiatan
        const usedInKegiatan = await db.kegiatan.findOne({ where: { ID_GroupFoto: id } });
        if (usedInKegiatan) {
             await t.rollback();
             req.flash('error', `Gagal hapus: Album ini digunakan oleh Kegiatan "${usedInKegiatan.Judul}". Silakan hapus kegiatannya terlebih dahulu.`);
             return res.redirect('/admin/galeri');
        }
        
        // Cek Prestasi
        const usedInPrestasi = await db.prestasi.findOne({ where: { ID_GroupFoto: id } });
        if (usedInPrestasi) {
             await t.rollback();
             req.flash('error', `Gagal hapus: Album ini digunakan oleh Prestasi "${usedInPrestasi.Judul}". Silakan hapus prestasinya terlebih dahulu.`);
             return res.redirect('/admin/galeri');
        }
        // -------------------------------------

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
        
        if (error.name === 'SequelizeForeignKeyConstraintError') {
             req.flash('error', 'Gagal: Album masih digunakan oleh data lain (Produk/Kegiatan).');
        } else {
             req.flash('error', 'Gagal menghapus galeri.');
        }
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
            
            // 1. Filter ID yang AMAN untuk dihapus (tidak dipakai di tabel lain)
            let safeIds = [];
            let skippedCount = 0;

            for (const gId of idsArray) {
                const usedInProduct = await db.product.count({ where: { ID_GroupFoto: gId }, transaction: t });
                const usedInKegiatan = await db.kegiatan.count({ where: { ID_GroupFoto: gId }, transaction: t });
                const usedInPrestasi = await db.prestasi.count({ where: { ID_GroupFoto: gId }, transaction: t });

                if (usedInProduct === 0 && usedInKegiatan === 0 && usedInPrestasi === 0) {
                    safeIds.push(gId);
                } else {
                    skippedCount++;
                }
            }

            if (safeIds.length === 0) {
                await t.rollback();
                req.flash('error', `Gagal! ${skippedCount} album yang dipilih sedang digunakan oleh Produk/Kegiatan.`);
                return res.redirect('/admin/galeri');
            }

            // 2. Proses Hapus untuk Safe IDs
            // Ambil semua foto dari safe group
            const allFotos = await db.foto.findAll({
                where: { ID_GroupFoto: safeIds },
                transaction: t
            });

            // Hapus semua file fisik
            allFotos.forEach(foto => {
                deleteFile(foto.Foto);
            });

            // Hapus semua foto dari database
            await db.foto.destroy({
                where: { ID_GroupFoto: safeIds },
                transaction: t
            });

            // Hapus group foto
            await db.groupfoto.destroy({
                where: { ID_GroupFoto: safeIds },
                transaction: t
            });

            await t.commit();

            let msg = `${safeIds.length} galeri berhasil dihapus.`;
            if (skippedCount > 0) {
                msg += ` (${skippedCount} galeri dilewati karena sedang digunakan).`;
            }
            req.flash('success', msg);

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
