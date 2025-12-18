// controllers/admin/kegiatanController.js

const db = require('../../models');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize'); // Import Operator

// Fungsi helper untuk hapus file fisik (di folder 'kegiatan')
// Fungsi helper untuk hapus file fisik (Smart Delete)
const deleteFile = (filename, subfolder = 'kegiatan') => {
  if (!filename) return;

  // Daftar folder yang mungkin menyimpan file tersebut
  const possibleFolders = [subfolder, 'produk', 'galeri', 'prestasi', 'anggota'];
  const uniqueFolders = [...new Set(possibleFolders)];

  let fileFound = false;

  for (const folder of uniqueFolders) {
      const filePath = path.join(__dirname, `../../public/images/${folder}`, filename);
      if (fs.existsSync(filePath)) {
          try {
              fs.unlinkSync(filePath);
              console.log(`File fisik ${filename} BERHASIL dihapus dari folder '${folder}'.`);
              fileFound = true;
              break;
          } catch (err) {
              console.error(`Gagal menghapus file ${filename} dari ${folder}:`, err);
          }
      }
  }

  if (!fileFound) {
      console.warn(`File fisik ${filename} TIDAK DITEMUKAN di folder manapun (${uniqueFolders.join(', ')}).`);
  }
};

// ==================================================================
// 1. (READ) Menampilkan List Kegiatan
// ==================================================================
module.exports.renderList = async (req, res) => {
    try {
        // 1. Ambil SEMUA kegiatan dengan Deskripsi
        const kegiatanList = await db.kegiatan.findAll({
            include: [{
                model: db.groupsection,
                as: 'ID_GroupSection_groupsection',
                include: {
                    model: db.detailsection,
                    as: 'detailsections',
                    where: { Urutan: 1 },
                    required: false
                }
            }],
            order: [['Tanggal', 'DESC']] // Urutkan berdasarkan tanggal terbaru
        });
        
        // 2. Ambil SEMUA foto
        const fotoList = await db.foto.findAll({ order: [['ID_Foto', 'ASC']] });

        // 3. Buat Peta (Map) untuk thumbnail (foto pertama)
        //    (Key: ID_GroupFoto, Value: 'nama-file.png')
        const thumbnailMap = new Map();
        for (const foto of fotoList) {
            // Jika grup foto ini belum ada di map, masukkan foto ini sebagai thumbnail
            if (!thumbnailMap.has(foto.ID_GroupFoto)) {
                thumbnailMap.set(foto.ID_GroupFoto, foto.Foto);
            }
        }

        // 4. Gabungkan data secara manual
        //    Kita konversi ke JSON agar properti tambahan bisa dibaca dengan aman di View
        const displayList = kegiatanList.map(kegiatan => {
            const kJson = kegiatan.toJSON();

            kJson.thumbnailFile = thumbnailMap.get(kJson.ID_GroupFoto) || null;
            
            // Ambil deskripsi dari nested relation
            kJson.Deskripsi = '';
            if (kJson.ID_GroupSection_groupsection && 
                kJson.ID_GroupSection_groupsection.detailsections && 
                kJson.ID_GroupSection_groupsection.detailsections.length > 0) {
                kJson.Deskripsi = kJson.ID_GroupSection_groupsection.detailsections[0].Deskripsi;
            }
            
            return kJson;
        });

        res.render('admin/kegiatan/index', {
            kegiatanList: displayList 
        });

    } catch (error) {
        console.error("Error di renderList Kegiatan:", error);
        req.flash('error', 'Gagal memuat daftar kegiatan.');
        res.redirect('/admin/dashboard');
    }
};

// ==================================================================
// 2. (CREATE) Menampilkan Form
// ==================================================================
module.exports.renderNewForm = (req, res) => {
    res.render('admin/kegiatan/new');
};

// ==================================================================
// 3. (CREATE) Memproses Form
// ==================================================================
module.exports.createKegiatan = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { Judul, Tanggal, Kategori, Status, Deskripsi } = req.body;

        // Validasi input dasar
        if (!Judul || !Tanggal || !Status) {
             req.flash('error', 'Field Judul, Tanggal, dan Status wajib diisi.');
             if (req.files) req.files.forEach(file => deleteFile(file.filename));
             await t.rollback();
             return res.redirect('/admin/kegiatan/new');
        }

        // 1. Buat GroupSection (untuk Deskripsi)
        const newGroupSection = await db.groupsection.create({
            Nama: `Konten Kegiatan - ${Judul}`
        }, { transaction: t });

        // 2. Buat DetailSection (menyimpan teks Deskripsi)
        //    Kita asumsikan deskripsi utama ada di Urutan 1
        await db.detailsection.create({
            ID_GroupSection: newGroupSection.ID_GroupSection,
            Deskripsi: Deskripsi || 'Belum ada deskripsi.',
            Urutan: 1
        }, { transaction: t });

        // 3. Buat GroupFoto (untuk Galeri)
        const newGroupFoto = await db.groupfoto.create({
            Nama: `Galeri Kegiatan - ${Judul}`
        }, { transaction: t });

        // 4. Simpan Foto-foto (jika ada)
        if (req.files && req.files.length > 0) {
            const fotoData = req.files.map(file => ({
                Foto: file.filename,
                ID_GroupFoto: newGroupFoto.ID_GroupFoto
            }));
            await db.foto.bulkCreate(fotoData, { transaction: t });
        }

        // 5. Buat Kegiatan
        await db.kegiatan.create({
            Judul: Judul,
            Tanggal: Tanggal,
            Kategori: Kategori,
            Status: Status,
            ID_GroupFoto: newGroupFoto.ID_GroupFoto,
            ID_GroupSection: newGroupSection.ID_GroupSection
        }, { transaction: t });

        await t.commit();
        req.flash('success', 'Data kegiatan baru berhasil ditambahkan.');
        res.redirect('/admin/kegiatan');

    } catch (error) {
        await t.rollback(); 
        if (req.files) req.files.forEach(file => deleteFile(file.filename)); 

        let flashError = 'Gagal menambahkan data baru.';
        if (error.name === 'SequelizeValidationError') {
            flashError = error.errors.map(err => err.message).join(', ');
        } else if (error.message.includes('Hanya file')) {
             flashError = error.message;
        }
        console.error("Error di createKegiatan:", error);
        req.flash('error', flashError);
        res.redirect('/admin/kegiatan/new');
    }
};

// ==================================================================
// 4. (UPDATE) Menampilkan Form
// ==================================================================
module.exports.renderEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        const kegiatan = await db.kegiatan.findByPk(id);
        
        if (!kegiatan) {
            req.flash('error', 'Data kegiatan tidak ditemukan.');
            return res.redirect('/admin/kegiatan');
        }

        // 1. Ambil Deskripsi (dari DetailSection Urutan 1)
        const deskripsiSection = await db.detailsection.findOne({
            where: { ID_GroupSection: kegiatan.ID_GroupSection },
            order: [['Urutan', 'ASC']]
        });
        kegiatan.dataValues.Deskripsi = deskripsiSection ? deskripsiSection.Deskripsi : '';

        // 2. Ambil SEMUA Foto (dari GroupFoto)
        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: kegiatan.ID_GroupFoto },
            order: [['ID_Foto', 'ASC']]
        });

        // 3. Kirim ke view
        // Tentukan ID thumbnail (foto dengan ID terendah di grup ini)
const thumbnailId = (fotoList && fotoList.length > 0) ? fotoList[0].ID_Foto : null;

// 3. Kirim ke view
res.render('admin/kegiatan/edit', { 
    kegiatan, 
    fotoList,
    thumbnailId: thumbnailId // Kirim ID thumbnail ke EJS
});

    } catch (error) {
        console.error("Error di renderEditForm Kegiatan:", error);
        req.flash('error', 'Gagal memuat form edit.');
        res.redirect('/admin/kegiatan');
    }
};

// ==================================================================
// 5. (UPDATE) Memproses Form
// ==================================================================
module.exports.updateKegiatan = async (req, res) => {
    const { id } = req.params;
    const t = await db.sequelize.transaction();
    try {
        const { Judul, Tanggal, Kategori, Status, Deskripsi } = req.body;
        const kegiatan = await db.kegiatan.findByPk(id);

        if (!kegiatan) {
            req.flash('error', 'Data kegiatan tidak ditemukan.');
            if (req.files) req.files.forEach(file => deleteFile(file.filename));
            await t.rollback();
            return res.redirect('/admin/kegiatan');
        }

        // Validasi
        if (!Judul || !Tanggal || !Status) {
             req.flash('error', 'Field Judul, Tanggal, dan Status wajib diisi.');
             if (req.files) req.files.forEach(file => deleteFile(file.filename));
             await t.rollback();
             return res.redirect(`/admin/kegiatan/${id}/edit`);
        }

        // 1. Update data utama Kegiatan
        await kegiatan.update({
            Judul: Judul,
            Tanggal: Tanggal,
            Kategori: Kategori,
            Status: Status
        }, { transaction: t });

        // 2. Update GroupSection & DetailSection
        await db.groupsection.update(
            { Nama: `Konten Kegiatan - ${Judul}` },
            { where: { ID_GroupSection: kegiatan.ID_GroupSection }, transaction: t }
        );
        
        // Cari atau buat section deskripsi urutan 1
        let [deskripsiSection] = await db.detailsection.findOrCreate({
            where: { ID_GroupSection: kegiatan.ID_GroupSection, Urutan: 1 },
            defaults: { Deskripsi: Deskripsi || '' },
            transaction: t
        });
        // Jika beda, update
        if (deskripsiSection.Deskripsi !== (Deskripsi || '')) {
            await deskripsiSection.update({ Deskripsi: Deskripsi || '' }, { transaction: t });
        }

        // 3. Update GroupFoto & Tambah Foto Baru (jika ada)
        await db.groupfoto.update(
            { Nama: `Galeri Kegiatan - ${Judul}` },
            { where: { ID_GroupFoto: kegiatan.ID_GroupFoto }, transaction: t }
        );

        if (req.files && req.files.length > 0) {
            const fotoData = req.files.map(file => ({
                Foto: file.filename,
                ID_GroupFoto: kegiatan.ID_GroupFoto
            }));
            await db.foto.bulkCreate(fotoData, { transaction: t });
        }
        
        await t.commit(); 
        req.flash('success', 'Data kegiatan berhasil diperbarui.');
        res.redirect('/admin/kegiatan');

    } catch (error) {
        await t.rollback();
        if (req.files) req.files.forEach(file => deleteFile(file.filename)); 

        let flashError = 'Gagal memperbarui data.';
        if (error.name === 'SequelizeValidationError') {
            flashError = error.errors.map(err => err.message).join(', ');
        } else if (error.message.includes('Hanya file')) {
             flashError = error.message;
        }
        console.error("Error di updateKegiatan:", error);
        req.flash('error', flashError);
        res.redirect(`/admin/kegiatan/${id}/edit`);
    }
};

// Helper to safely delete GroupFoto (Duplicated to ensure independence)
const safeDeleteGroupFoto = async (groupFotoId, t) => {
    if (!groupFotoId) return false;
    
    try {
        // 1. Cek penggunaan di tabel induk lain (Produk, Kegiatan, Prestasi)
        // Gunakan paranoid: false agar record yang soft-deleted (jika ada) tetap terhitung
        const usedInProduk = await db.product.count({ where: { ID_GroupFoto: groupFotoId }, paranoid: false, transaction: t });
        const usedInKegiatan = await db.kegiatan.count({ where: { ID_GroupFoto: groupFotoId }, paranoid: false, transaction: t });
        const usedInPrestasi = await db.prestasi.count({ where: { ID_GroupFoto: groupFotoId }, paranoid: false, transaction: t });
        
        console.log(`Check GroupFoto ${groupFotoId}: Produk=${usedInProduk}, Kegiatan=${usedInKegiatan}, Prestasi=${usedInPrestasi}`);

        if (usedInProduk === 0 && usedInKegiatan === 0 && usedInPrestasi === 0) {
             // 2. Cek apakah ada foto di grup ini yang dipakai oleh Pengguna (Profile Picture)
             // Ambil ID foto dalam grup ini
             const photos = await db.foto.findAll({ where: { ID_GroupFoto: groupFotoId }, attributes: ['ID_Foto'], transaction: t });
             const photoIds = photos.map(p => p.ID_Foto);
             
             if (photoIds.length > 0) {
                 const usedInPengguna = await db.pengguna.count({ where: { ID_Foto: photoIds }, transaction: t });
                 if (usedInPengguna > 0) {
                     console.log(`GroupFoto ${groupFotoId} tidak dihapus karena ${usedInPengguna} foto sedang dipakai sebagai profil pengguna.`);
                     return false;
                 }
             }

             // 3. Eksekusi Hapus dengan Try-Catch untuk menangkap error FK tak terduga
             try {
                 await db.foto.destroy({ where: { ID_GroupFoto: groupFotoId }, transaction: t });
                 await db.groupfoto.destroy({ where: { ID_GroupFoto: groupFotoId }, transaction: t });
                 console.log(`GroupFoto ${groupFotoId} berhasil dihapus.`);
                 return true;
             } catch (err) {
                 console.error(`Failed to destroy GroupFoto ${groupFotoId} (FK Constraint?):`, err.message);
                 // Jangan throw error, return false agar transaksi utama (hapus kegiatan) tetap lanjut
                 return false;
             }
        }
        return false; // Masih dipakai
    } catch (err) {
        console.error("Error in safeDeleteGroupFoto check:", err);
        return false; // Assume unsafe if check fails
    }
};

// Helper to safely delete GroupSection
const safeDeleteGroupSection = async (groupSectionId, t) => {
    if (!groupSectionId) return false;

    try {
        // 1. Cek penggunaan di Kegiatan
        const usedInKegiatan = await db.kegiatan.count({ where: { ID_GroupSection: groupSectionId }, paranoid: false, transaction: t });
        
        console.log(`Check GroupSection ${groupSectionId}: Kegiatan=${usedInKegiatan}`);

        if (usedInKegiatan === 0) {
             // 2. Hapus DetailSection (Anak)
             await db.detailsection.destroy({ where: { ID_GroupSection: groupSectionId }, transaction: t });

             // 3. Hapus GroupSection (Induk)
             try {
                 await db.groupsection.destroy({ where: { ID_GroupSection: groupSectionId }, transaction: t });
                 console.log(`GroupSection ${groupSectionId} berhasil dihapus.`);
                 return true;
             } catch (err) {
                 console.error(`Failed to destroy GroupSection ${groupSectionId} (FK Constraint?):`, err.message);
                 return false;
             }
        }
        return false; // Masih dipakai
    } catch (err) {
        console.error("Error in safeDeleteGroupSection check:", err);
        return false;
    }
};

// ==================================================================
// 6. (DELETE) Memproses Hapus
// ==================================================================
module.exports.deleteKegiatan = async (req, res) => {
    const { id } = req.params;
    const t = await db.sequelize.transaction();
    try {
        const kegiatan = await db.kegiatan.findByPk(id);
        if (!kegiatan) {
            req.flash('error', 'Data kegiatan tidak ditemukan.');
            await t.rollback();
            return res.redirect('/admin/kegiatan');
        }
        
        const groupFotoId = kegiatan.ID_GroupFoto;
        const groupSectionId = kegiatan.ID_GroupSection;
        const judulKegiatan = kegiatan.Judul;

        // 1. Ambil info foto
        let photos = [];
        if (groupFotoId) {
            photos = await db.foto.findAll({ where: { ID_GroupFoto: groupFotoId }, transaction: t });
        }

        // 2. HAPUS KEGIATAN DULUAN
        await kegiatan.destroy({ transaction: t });

        // 3. Cek dan Hapus GroupFoto 
        let groupDeleted = false;
        if (groupFotoId) {
             groupDeleted = await safeDeleteGroupFoto(groupFotoId, t);
        }

        // 4. Hapus Detail & Group Section
        // Gunakan safe delete agar tidak crash jika masih ada constraint
        if (groupSectionId) {
             await safeDeleteGroupSection(groupSectionId, t);
        }
        
        await t.commit();

        // 5. Hapus File Fisik
        if (groupDeleted && photos.length > 0) {
            photos.forEach(foto => deleteFile(foto.Foto));
        }

        req.flash('success', `Data kegiatan '${judulKegiatan}' berhasil dihapus.`);
        res.redirect('/admin/kegiatan');

    } catch (error) {
        await t.rollback();
        console.error("Error di deleteKegiatan:", error);
        req.flash('error', 'Gagal menghapus data.');
        res.redirect('/admin/kegiatan');
    }
};

// ==================================================================
// 7. (DELETE) Hapus Foto Spesifik (via AJAX)
// ==================================================================
module.exports.deleteFotoKegiatan = async (req, res) => {
    try {
        const { fotoId } = req.params;
        const foto = await db.foto.findByPk(fotoId);

        if (!foto) {
            return res.status(404).json({ error: 'Foto tidak ditemukan' });
        }

        // Hapus file fisik
        deleteFile(foto.Foto);
        
        // Hapus data dari database
        await foto.destroy();

        // Kirim respon sukses (untuk AJAX)
        res.status(200).json({ message: 'Foto berhasil dihapus.' });

    } catch (error) {
        console.error("Error di deleteFotoKegiatan:", error);
        res.status(500).json({ error: 'Gagal menghapus foto.' });
    }
};

// ==================================================================
// BARU: (READ) Menampilkan Halaman Detail
// ==================================================================
module.exports.renderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const kegiatan = await db.kegiatan.findByPk(id);
        
        if (!kegiatan) {
            req.flash('error', 'Data kegiatan tidak ditemukan.');
            return res.redirect('/admin/kegiatan');
        }

        // 1. Ambil SEMUA Deskripsi/Section (berdasarkan urutan)
        const sections = await db.detailsection.findAll({
            where: { ID_GroupSection: kegiatan.ID_GroupSection },
            order: [['Urutan', 'ASC']]
        });

        // 2. Ambil SEMUA Foto (dari GroupFoto)
        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: kegiatan.ID_GroupFoto },
            order: [['ID_Foto', 'ASC']]
        });

        // 3. Kirim ke view
        res.render('admin/kegiatan/detail', { 
            kegiatan, 
            sections, // Kirim semua section
            fotoList 
        });

    } catch (error) {
        console.error("Error di renderDetail Kegiatan:", error);
        req.flash('error', 'Gagal memuat detail kegiatan.');
        res.redirect('/admin/kegiatan');
    }
};

// ==================================================================
// BARU: (DELETE) Aksi Massal (Bulk Delete)
// ==================================================================
module.exports.bulkAction = async (req, res) => {
    const { action, selectedIds } = req.body;

    // 1. Validasi
    if (action !== 'delete') {
        req.flash('error', 'Aksi tidak valid.');
        return res.redirect('/admin/kegiatan');
    }
    if (!selectedIds || selectedIds.length === 0) {
        req.flash('error', 'Tidak ada item yang dipilih.');
        return res.redirect('/admin/kegiatan');
    }

    // Memastikan selectedIds selalu array
    const idsToDelete = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
    
    const t = await db.sequelize.transaction();
    try {
        const kegiatans = await db.kegiatan.findAll({
            where: { ID_Kegiatan: { [Op.in]: idsToDelete } },
            transaction: t
        });
        
        const groupFotoIds = kegiatans.map(k => k.ID_GroupFoto).filter(id => id);
        const groupSectionIds = kegiatans.map(k => k.ID_GroupSection).filter(id => id);

        // 1. DELETE ACTIVITIES FIRST
        await db.kegiatan.destroy({ where: { ID_Kegiatan: { [Op.in]: idsToDelete } }, transaction: t });

        // 2. CHECK & DELETE GROUPS
        let deletedFileNames = [];

        // Check each GroupFoto
        for (const gId of groupFotoIds) {
             const photos = await db.foto.findAll({ where: { ID_GroupFoto: gId }, transaction: t });
             const deleted = await safeDeleteGroupFoto(gId, t);
             if (deleted) {
                 deletedFileNames.push(...photos.map(p => p.Foto));
             }
        }
        
        // Delete Sections
        if (groupSectionIds.length > 0) {
            for (const gSecId of groupSectionIds) {
                await safeDeleteGroupSection(gSecId, t);
            }
        }

        await t.commit();

        // 3. Cleanup Files
        for (const filename of deletedFileNames) {
            deleteFile(filename);
        }

        req.flash('success', `${idsToDelete.length} data kegiatan berhasil dihapus.`);
        res.redirect('/admin/kegiatan');

    } catch (error) {
        await t.rollback();
        console.error("Error di bulkAction Kegiatan:", error);
        req.flash('error', 'Gagal menghapus data secara massal.');
        res.redirect('/admin/kegiatan');
    }
};

// ==================================================================
// 8. (DELETE) Hapus Foto Massal (dari Halaman Edit)
// ==================================================================
module.exports.bulkDeleteFotos = async (req, res) => {
    const { id } = req.params; // ID Kegiatan
    const { fotoIds } = req.body; // Array ID Foto yang dipilih

    // 1. Validasi
    if (!fotoIds || fotoIds.length === 0) {
        req.flash('error', 'Tidak ada foto yang dipilih untuk dihapus.');
        return res.redirect(`/admin/kegiatan/${id}/edit`);
    }

    const idsToDelete = Array.isArray(fotoIds) ? fotoIds : [fotoIds];
    
    // Transaksi tidak diperlukan di sini, tapi aman untuk dipakai jika mau
    try {
        // 2. Cari semua data foto
        const fotoList = await db.foto.findAll({
            where: { ID_Foto: { [Op.in]: idsToDelete } }
        });

        // 3. Hapus file fisik
        for (const foto of fotoList) {
            deleteFile(foto.Foto);
        }

        // 4. Hapus data foto dari database
        await db.foto.destroy({
            where: { ID_Foto: { [Op.in]: idsToDelete } }
        });

        req.flash('success', `${idsToDelete.length} foto berhasil dihapus dari galeri.`);
        res.redirect(`/admin/kegiatan/${id}/edit`);

    } catch (error) {
        console.error("Error di bulkDeleteFotos Kegiatan:", error);
        req.flash('error', 'Gagal menghapus foto.');
        res.redirect(`/admin/kegiatan/${id}/edit`);
    }
};

// ==================================================================
// BARU: (UPDATE) Mengganti Foto Spesifik di Galeri Kegiatan
// ==================================================================
module.exports.replaceFotoKegiatan = async (req, res) => {
    const { kegiatanId, fotoId } = req.params; // ID Kegiatan dan ID Foto yang akan diganti

    if (!req.file) { // req.file datang dari middleware upload.single()
        req.flash('error', 'Tidak ada file foto baru yang diunggah.');
        return res.redirect(`/admin/kegiatan/${kegiatanId}/edit`);
    }

    const t = await db.sequelize.transaction();
    try {
        const fotoToReplace = await db.foto.findByPk(fotoId, { transaction: t });

        if (!fotoToReplace) {
            deleteFile(req.file.filename); // Hapus file yang baru diupload jika foto lama tidak ditemukan
            req.flash('error', 'Foto yang akan diganti tidak ditemukan.');
            await t.rollback();
            return res.redirect(`/admin/kegiatan/${kegiatanId}/edit`);
        }

        const oldFileName = fotoToReplace.Foto; // Simpan nama file lama
        
        // 1. Update nama file di database
        await fotoToReplace.update({ Foto: req.file.filename }, { transaction: t });

        // 2. Hapus file fisik lama
        deleteFile(oldFileName); // Hapus di luar transaksi, jika terjadi error akan di rollback

        await t.commit();
        req.flash('success', 'Foto berhasil diganti.');
        res.redirect(`/admin/kegiatan/${kegiatanId}/edit`);

    } catch (error) {
        await t.rollback();
        deleteFile(req.file.filename); // Hapus file yang baru diupload jika transaksi gagal
        console.error("Error di replaceFotoKegiatan:", error);
        req.flash('error', 'Gagal mengganti foto.');
        res.redirect(`/admin/kegiatan/${kegiatanId}/edit`);
    }
};

// ==================================================================
// BARU: (UPDATE) Menetapkan Thumbnail
// ==================================================================
module.exports.setThumbnail = async (req, res) => {
    // Ini adalah ID Kegiatan dan ID Foto yang ingin kita JADIKAN thumbnail
    const { kegiatanId, fotoId } = req.params; 
    const newThumbnailId = parseInt(fotoId, 10);

    const t = await db.sequelize.transaction();
    try {
        // 1. Dapatkan ID Grup Foto dari kegiatan
        const kegiatan = await db.kegiatan.findByPk(kegiatanId);
        const groupId = kegiatan.ID_GroupFoto;

        // 2. Cari thumbnail SAAT INI (yaitu foto dgn ID terendah)
        const currentThumbnail = await db.foto.findOne({
            where: { ID_GroupFoto: groupId },
            order: [['ID_Foto', 'ASC']],
            transaction: t
        });

        // 3. Cari foto yang BARU (yang diklik user)
        const newThumbnail = await db.foto.findByPk(newThumbnailId, { transaction: t });

        // 4. Validasi
        if (!newThumbnail || newThumbnail.ID_GroupFoto !== groupId) {
            throw new Error('Foto baru tidak ditemukan di grup ini.');
        }
        if (!currentThumbnail) {
            throw new Error('Thumbnail lama tidak ditemukan.');
        }

        // 5. Jika user mengklik foto yang SUDAH jadi thumbnail
        if (currentThumbnail.ID_Foto === newThumbnail.ID_Foto) {
            req.flash('info', 'Foto ini sudah menjadi thumbnail.');
            await t.rollback();
            return res.redirect(`/admin/kegiatan/${kegiatanId}/edit`);
        }

        // 6. INTI TRIK: TUKAR NAMA FILENYA
        const oldThumbnailFilename = currentThumbnail.Foto;
        const newThumbnailFilename = newThumbnail.Foto;

        await currentThumbnail.update({ Foto: newThumbnailFilename }, { transaction: t });
        await newThumbnail.update({ Foto: oldThumbnailFilename }, { transaction: t });

        await t.commit();
        req.flash('success', 'Thumbnail berhasil diperbarui.');
        res.redirect(`/admin/kegiatan/${kegiatanId}/edit`);

    } catch (error) {
        await t.rollback();
        console.error("Error di setThumbnail Kegiatan:", error);
        req.flash('error', 'Gagal memperbarui thumbnail.');
        res.redirect(`/admin/kegiatan/${kegiatanId}/edit`);
    }
};