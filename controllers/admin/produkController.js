// controllers/admin/produkController.js

const db = require('../../models');
const fs = require('fs');
const path = require('path');

const deleteFile = (filename, subfolder = 'produk') => {
  if (!filename) return;

  // Daftar folder yang mungkin menyimpan file tersebut
  const possibleFolders = [subfolder, 'kegiatan', 'galeri', 'prestasi', 'anggota'];
  // Hapus duplikat dan pastikan prioritas utama adalah 'subfolder' argumen
  const uniqueFolders = [...new Set(possibleFolders)];

  let fileFound = false;

  for (const folder of uniqueFolders) {
      const filePath = path.join(__dirname, `../../public/images/${folder}`, filename);
      if (fs.existsSync(filePath)) {
          try {
              fs.unlinkSync(filePath);
              console.log(`File fisik ${filename} BERHASIL dihapus dari folder '${folder}'.`);
              fileFound = true;
              break; // Stop jika sudah ketemu dan dihapus
          } catch (err) {
              console.error(`Gagal menghapus file ${filename} dari ${folder}:`, err);
          }
      }
  }

  if (!fileFound) {
     console.warn(`File fisik ${filename} TIDAK DITEMUKAN di folder manapun (${uniqueFolders.join(', ')}).`);
  }
};

module.exports.renderList = async (req, res) => {
    try {
        const products = await db.product.findAll({ order: [['Nama', 'ASC']] });
        const groupParams = await db.groupparameter.findAll();
        const groupParamMap = new Map();
        groupParams.forEach(gp => groupParamMap.set(gp.ID_GroupParameter, gp));
        const parameters = await db.parameter.findAll({ order: [['ID_GroupParameter', 'ASC'],['Nama', 'ASC']] });
        const allPhotos = await db.foto.findAll({ order: [['ID_GroupFoto', 'ASC'], ['ID_Foto', 'ASC']] });
        const photosByGroupMap = new Map();
        allPhotos.forEach(photo => {
            const groupId = photo.ID_GroupFoto;
            if (!photosByGroupMap.has(groupId)) {
                photosByGroupMap.set(groupId, []);
            }
            photosByGroupMap.get(groupId).push({ ID_Foto: photo.ID_Foto, Foto: photo.Foto });
        });
        const productsFullData = products.map(product => {
            const productData = product.toJSON();
            const groupParam = groupParamMap.get(productData.ID_GroupParameter);
            productData.groupparameter = groupParam ? groupParam.toJSON() : null;
            if (productData.groupparameter) {
                productData.groupparameter.parameters = parameters
                    .filter(p => p.ID_GroupParameter === productData.ID_GroupParameter)
                    .map(p => p.toJSON());
            } else { productData.groupparameter = { parameters: [] }; }
            productData.photos = photosByGroupMap.get(productData.ID_GroupFoto) || [];
            return productData;
        }).filter(p => p !== null);
        const categories = await db.product.findAll({ attributes: ['Kategori'], group: ['Kategori'], order: [['Kategori', 'ASC']] });
        res.render('admin/produk/index', {
            productsWithParams: productsFullData,
            categories: categories.map(c => c.Kategori).filter(Boolean)
        });
    } catch (error) {
        console.error("Error di renderList Produk:", error);
        req.flash('error', 'Gagal memuat daftar produk.');
        res.redirect('/admin/dashboard');
    }
};

module.exports.renderNewForm = async (req, res) => {
    try {
        const groupFotoList = await db.groupfoto.findAll({ order: [['Nama', 'ASC']] });
        res.render('admin/produk/new', { groupFotoList });
    } catch (error) {
        console.error("Error di renderNewForm Produk:", error);
        req.flash('error', 'Gagal memuat form tambah produk.');
        res.redirect('/admin/produk');
    }
};

module.exports.createProduk = async (req, res) => {
    const t = await db.sequelize.transaction();
    const uploadedFiles = req.files || [];
    try {
        let { Nama, Deskripsi, Harga, Diskon, Kategori, paramNama, paramMin, paramMax } = req.body;
        Harga = parseFloat(Harga) || 0;

        // --- KONVERSI DISKON ---
        let diskonDecimal = parseFloat(Diskon) || 0;
        if (diskonDecimal < 0) diskonDecimal = 0;
        if (diskonDecimal > 100) diskonDecimal = 100;
        diskonDecimal = diskonDecimal / 100; // Dibagi 100 di sini
        // -----------------------

        if (!Nama || !Harga) { /* ... error handling ... */ }
        const newGroupFoto = await db.groupfoto.create({ Nama: `Galeri - ${Nama} (${Date.now()})` }, { transaction: t });
        const newGroupFotoId = newGroupFoto.ID_GroupFoto;
        if (uploadedFiles.length > 0) { const fotosToCreate = uploadedFiles.map(file => ({ Foto: file.filename, ID_GroupFoto: newGroupFotoId })); await db.foto.bulkCreate(fotosToCreate, { transaction: t }); }
        const newGroupParam = await db.groupparameter.create({ Nama: `Spek Internal - ${Nama} (${Date.now()})` }, { transaction: t });
        const newGroupParamId = newGroupParam.ID_GroupParameter;
        let parametersToCreate = [];
        if (paramNama && Array.isArray(paramNama)) { for (let i = 0; i < paramNama.length; i++) { if (paramNama[i] && paramNama[i].trim() !== '') { parametersToCreate.push({ Nama: paramNama[i].trim(), Minimal: parseInt(paramMin[i]) || 0, Maksimal: parseInt(paramMax[i]) || 0, ID_GroupParameter: newGroupParamId }); } } }
        if (parametersToCreate.length > 0) { await db.parameter.bulkCreate(parametersToCreate, { transaction: t }); }

        // Simpan diskonDecimal
        await db.product.create({ Nama, Deskripsi, Harga, Diskon: diskonDecimal, Kategori, ID_GroupFoto: newGroupFotoId, ID_GroupParameter: newGroupParamId }, { transaction: t });

        await t.commit();
        req.flash('success', 'Produk baru berhasil ditambahkan.');
        res.redirect('/admin/produk');
    } catch (error) {
        await t.rollback();
        uploadedFiles.forEach(f => deleteFile(f.filename));
        console.error("Error di createProduk:", error);
        req.flash('error', 'Gagal menambahkan produk.');
        res.redirect('/admin/produk/new');
    }
};

module.exports.renderEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await db.product.findByPk(id);
        if (!product) { req.flash('error', 'Data produk tidak ditemukan.'); return res.redirect('/admin/produk'); }
        let existingParameters = [];
        if (product.ID_GroupParameter) { existingParameters = await db.parameter.findAll({ where: { ID_GroupParameter: product.ID_GroupParameter }, order: [['Nama', 'ASC']] }); }
        let existingPhotos = [];
        if (product.ID_GroupFoto) { existingPhotos = await db.foto.findAll({ where: { ID_GroupFoto: product.ID_GroupFoto }, order: [['ID_Foto', 'ASC']] }); }
        res.render('admin/produk/edit', {
            product: product.toJSON(),
            existingParameters: existingParameters.map(p => p.toJSON()),
            existingPhotos: existingPhotos.map(f => f.toJSON())
        });
    } catch (error) {
        console.error("Error di renderEditForm Produk:", error);
        req.flash('error', 'Gagal memuat form edit produk.');
        res.redirect('/admin/produk');
    }
};

module.exports.updateProduk = async (req, res) => {
    const { id } = req.params;
    const t = await db.sequelize.transaction();
    const uploadedFiles = req.files || [];
    try {
        let { Nama, Deskripsi, Harga, Diskon, Kategori, paramNama, paramMin, paramMax } = req.body;
        const product = await db.product.findByPk(id);
        if (!product) { req.flash('error', 'Produk tidak ditemukan.'); await t.rollback(); uploadedFiles.forEach(f => deleteFile(f.filename)); return res.redirect('/admin/produk'); }

        // Parse dan validasi Harga
        Harga = parseFloat(Harga) || 0;

        // --- KONVERSI DISKON: dari persen (mis. 20) -> desimal (0.20) ---
        let diskonDecimal = parseFloat(Diskon);
        if (isNaN(diskonDecimal)) diskonDecimal = 0;
        if (diskonDecimal < 0) diskonDecimal = 0;
        if (diskonDecimal > 100) diskonDecimal = 100;
        diskonDecimal = diskonDecimal / 100;
        // ------------------------------------------------------------

        if (!Nama || !Harga) {
            req.flash('error', 'Nama & Harga wajib.');
            await t.rollback();
            uploadedFiles.forEach(f => deleteFile(f.filename));
            return res.redirect(`/admin/produk/${id}/edit`);
        }

        if (uploadedFiles.length > 0) {
             if (!product.ID_GroupFoto) {
                 const newG = await db.groupfoto.create({ Nama: `Galeri-${Nama}(${Date.now()})` }, { transaction: t });
                 product.ID_GroupFoto = newG.ID_GroupFoto;
             }
             const fotosToCreate = uploadedFiles.map(file => ({ Foto: file.filename, ID_GroupFoto: product.ID_GroupFoto }));
             await db.foto.bulkCreate(fotosToCreate, { transaction: t });
        }

        const groupParamId = product.ID_GroupParameter;
        if (groupParamId) {
            await db.parameter.destroy({ where: { ID_GroupParameter: groupParamId }, transaction: t });
        } else {
            const newGP = await db.groupparameter.create({ Nama: `Spek-${Nama}(${Date.now()})` }, { transaction: t });
            product.ID_GroupParameter = newGP.ID_GroupParameter;
        }

        let parametersToCreate = [];
        if (paramNama && Array.isArray(paramNama)) {
            for (let i=0; i < paramNama.length; i++) {
                if (paramNama[i] && paramNama[i].trim() !== '' && paramMin && paramMin[i] !== undefined && paramMax && paramMax[i] !== undefined) {
                    parametersToCreate.push({
                        Nama: paramNama[i].trim(),
                        Minimal: parseInt(paramMin[i])||0,
                        Maksimal: parseInt(paramMax[i])||0,
                        ID_GroupParameter: product.ID_GroupParameter
                    });
                }
            }
        }
        if (parametersToCreate.length > 0) {
            await db.parameter.bulkCreate(parametersToCreate, { transaction: t });
        }

        // Simpan perubahan produk (gunakan diskonDecimal yang sudah dikonversi)
        await product.update({
            Nama,
            Deskripsi,
            Harga,
            Diskon: diskonDecimal,
            Kategori,
            ID_GroupFoto: product.ID_GroupFoto,
            ID_GroupParameter: product.ID_GroupParameter
        }, { transaction: t });

        await t.commit();
        req.flash('success', 'Data produk berhasil diperbarui.');
        res.redirect('/admin/produk');
    } catch (error) {
        await t.rollback();
        uploadedFiles.forEach(f => deleteFile(f.filename));
        console.error("Error di updateProduk:", error);
        if (error.code === 'LIMIT_UNEXPECTED_FILE' || (error.message && error.message.includes('Hanya file'))) {
            req.flash('error', error.message);
        } else {
            req.flash('error', 'Gagal memperbarui data produk.');
        }
        res.redirect(`/admin/produk/${id}/edit`);
    }
};

// ==================================================================
// VIEW DETAIL (IMPLEMENTASI BARU)
// ==================================================================
module.exports.renderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await db.product.findByPk(id);
        if (!product) {
            req.flash('error', 'Produk tidak ditemukan.');
            return res.redirect('/admin/produk');
        }
        
        // Ambil Data Foto
        let photos = [];
        if (product.ID_GroupFoto) {
             photos = await db.foto.findAll({ 
                where: { ID_GroupFoto: product.ID_GroupFoto },
                order: [['ID_Foto', 'ASC']]
            });
        }

        // Ambil Data Parameter
        let parameters = [];
        if (product.ID_GroupParameter) {
            parameters = await db.parameter.findAll({
                where: { ID_GroupParameter: product.ID_GroupParameter },
                order: [['Nama', 'ASC']]
            });
        }

        res.render('admin/produk/detail', {
            product: product.toJSON(),
            photos: photos.map(p => p.toJSON()),
            parameters: parameters.map(p => p.toJSON())
        });
    } catch (error) {
         console.error("Error renderDetail:", error);
         req.flash('error', 'Gagal memuat detail produk.');
         res.redirect('/admin/produk');
    }
};

module.exports.deleteSpecificPhotos = async (req, res) => {
    const { id } = req.params; const { photoIds } = req.body;
    const t = await db.sequelize.transaction(); let filenamesToDelete = [];
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) { return res.status(400).json({ success: false, message: 'ID foto tidak dipilih.' }); }
    const idsToDelete = photoIds.map(idStr => parseInt(idStr, 10)).filter(idNum => !isNaN(idNum));
    if (idsToDelete.length === 0) { return res.status(400).json({ success: false, message: 'ID foto tidak valid.' }); }
    try {
        const product = await db.product.findByPk(id);
        if (!product || !product.ID_GroupFoto) { await t.rollback(); return res.status(404).json({ success: false, message: 'Produk/grup foto tidak ditemukan.' }); }
        await db.pengguna.update( { ID_Foto: null }, { where: { ID_Foto: idsToDelete }, transaction: t } );
        const photosData = await db.foto.findAll({ where: { ID_Foto: idsToDelete, ID_GroupFoto: product.ID_GroupFoto }, transaction: t, attributes: ['Foto'] });
        filenamesToDelete = photosData.map(f => f.Foto);
        if (filenamesToDelete.length > 0) { await db.foto.destroy({ where: { ID_Foto: idsToDelete, ID_GroupFoto: product.ID_GroupFoto }, transaction: t }); }
        else { await t.rollback(); return res.status(404).json({ success: false, message: 'Foto tidak ditemukan.' }); }
        await t.commit(); filenamesToDelete.forEach(filename => deleteFile(filename));
        req.flash('success', `${filenamesToDelete.length} foto dihapus.`);
        return res.json({ success: true, message: `${filenamesToDelete.length} foto dihapus.` });
    } catch (error) {
        await t.rollback(); console.error("Error deleteSpecificPhotos:", error);
        let message = 'Gagal menghapus foto.'; if (error.name === 'SequelizeForeignKeyConstraintError') { message = 'Gagal, foto masih direferensikan.'; }
        req.flash('error', message); return res.status(500).json({ success: false, message: message });
    }
};

// FUNGSI BARU: editSpecificPhoto
module.exports.editSpecificPhoto = async (req, res) => {
    const { id: productId } = req.params; // ID Produk
    const { photoIdToReplace } = req.body; // ID Foto lama yang akan diganti
    const newFile = req.file; // Info file baru dari multerProdukSingle
    const t = await db.sequelize.transaction();
    let oldFilename = null;

    if (!newFile) {
        return res.status(400).json({ success: false, message: 'File foto baru tidak ditemukan.' });
    }
    if (!photoIdToReplace || isNaN(parseInt(photoIdToReplace, 10))) {
        deleteFile(newFile.filename); // Hapus file baru yg terlanjur diupload
        return res.status(400).json({ success: false, message: 'ID foto yang akan diganti tidak valid.' });
    }

    const photoId = parseInt(photoIdToReplace, 10);

    try {
        const product = await db.product.findByPk(productId);
        if (!product || !product.ID_GroupFoto) {
            await t.rollback(); deleteFile(newFile.filename);
            return res.status(404).json({ success: false, message: 'Produk atau grup foto tidak ditemukan.' });
        }

        const fotoRecord = await db.foto.findOne({
            where: {
                ID_Foto: photoId,
                ID_GroupFoto: product.ID_GroupFoto // Pastikan foto milik produk ini
            },
            transaction: t
        });

        if (!fotoRecord) {
            await t.rollback(); deleteFile(newFile.filename);
            return res.status(404).json({ success: false, message: 'Foto lama tidak ditemukan.' });
        }

        oldFilename = fotoRecord.Foto; // Simpan nama file lama untuk dihapus nanti

        // Update record foto dengan nama file baru
        await fotoRecord.update({ Foto: newFile.filename }, { transaction: t });

        await t.commit();

        // Hapus file fisik lama SETELAH commit berhasil
        deleteFile(oldFilename);

        // Kirim respons sukses dengan nama file baru
        return res.json({
            success: true,
            message: 'Foto berhasil diganti.',
            newFilename: newFile.filename,
            photoId: photoId // Kirim ID foto yang diupdate
        });

    } catch (error) {
        await t.rollback();
        deleteFile(newFile.filename); // Hapus file baru jika transaksi gagal
        console.error("Error di editSpecificPhoto:", error);
        return res.status(500).json({ success: false, message: 'Gagal mengganti foto.' });
    }
};


// Helper to safely delete GroupFoto only if unused
const safeDeleteGroupFoto = async (groupFotoId, t) => {
    if (!groupFotoId) return false;
    
    // Gunakan paranoid: false agar record yang soft-deleted (jika ada) tetap terhitung
    const usedInProduk = await db.product.count({ where: { ID_GroupFoto: groupFotoId }, paranoid: false, transaction: t });
    const usedInKegiatan = await db.kegiatan.count({ where: { ID_GroupFoto: groupFotoId }, paranoid: false, transaction: t });
    
    console.log(`Check GroupFoto ${groupFotoId}: usedInProduk=${usedInProduk}, usedInKegiatan=${usedInKegiatan}`);

    if (usedInProduk === 0 && usedInKegiatan === 0) {
         try {
            // Hapus anak-anak dulu
            await db.foto.destroy({ where: { ID_GroupFoto: groupFotoId }, transaction: t });
            // Hapus induk
            await db.groupfoto.destroy({ where: { ID_GroupFoto: groupFotoId }, transaction: t });
            return true; // Deleted
         } catch (err) {
             console.error(`Failed to destroy GroupFoto ${groupFotoId} despite count=0:`, err.message);
             // Jangan throw error, biarkan saja tidak terhapus daripada bikin rollback semua transaction
             return false;
         }
    }
    return false; // Not deleted (still in use)
};

// Helper to safely delete GroupParameter only if unused
const safeDeleteGroupParameter = async (groupParamId, t) => {
    if (!groupParamId) return;
    const usedInProduk = await db.product.count({ where: { ID_GroupParameter: groupParamId }, paranoid: false, transaction: t });
    
    console.log(`Check GroupParam ${groupParamId}: usedInProduk=${usedInProduk}`);

    if (usedInProduk === 0) {
        try {
            await db.parameter.destroy({ where: { ID_GroupParameter: groupParamId }, transaction: t });
            await db.groupparameter.destroy({ where: { ID_GroupParameter: groupParamId }, transaction: t });
        } catch (err) {
             console.error(`Failed to destroy GroupParam ${groupParamId}:`, err.message);
        }
    }
};

// ==================================================================
// 6. (DELETE) Hapus Produk
// ==================================================================
module.exports.deleteProduk = async (req, res) => {
    const { id } = req.params;
    const t = await db.sequelize.transaction();
    try {
        const product = await db.product.findByPk(id);
        if (!product) {
            req.flash('error', 'Produk tidak ditemukan.');
            await t.rollback();
            return res.redirect('/admin/produk');
        }

        const groupFotoId = product.ID_GroupFoto;
        const groupParamId = product.ID_GroupParameter;
        const namaProduk = product.Nama;

        // 1. Ambil info foto untuk dihapus nanti
        let photos = [];
        if (groupFotoId) {
            photos = await db.foto.findAll({ where: { ID_GroupFoto: groupFotoId }, transaction: t });
        }

        // 2. HAPUS PRODUK DULUAN (Lepaskan FK)
        await product.destroy({ transaction: t });

        // 3. Cek dan Hapus GroupFoto (Hanya jika tidak ada yang pakai lagi)
        let groupDeleted = false;
        if (groupFotoId) {
             groupDeleted = await safeDeleteGroupFoto(groupFotoId, t);
        }

        // 4. Cek dan Hapus GroupParameter
        if (groupParamId) {
             await safeDeleteGroupParameter(groupParamId, t);
        }

        await t.commit();
        
        // 5. Hapus File Fisik
        if (groupDeleted && photos.length > 0) {
            photos.forEach(p => deleteFile(p.Foto));
        }

        req.flash('success', `Produk '${namaProduk}' berhasil dihapus.`);
        res.redirect('/admin/produk');

    } catch (error) {
        await t.rollback();
        console.error("Error di deleteProduk:", error);
        req.flash('error', 'Gagal menghapus produk: ' + error.message);
        res.redirect('/admin/produk');
    }
};

module.exports.bulkAction = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { action, itemIds } = req.body;
        console.log("Bulk Action Request:", action, itemIds);

        if (!itemIds || itemIds.length === 0) {
            req.flash('error', 'Tidak ada item yang dipilih.');
            return res.redirect('/admin/produk');
        }

        const idsArray = Array.isArray(itemIds) ? itemIds : [itemIds];

        if (action === 'delete') {
            // Fetch products to get associated GROUP IDs
            const products = await db.product.findAll({
                where: { ID_Product: idsArray },
                transaction: t
            });

            if (products.length === 0) {
                await t.rollback();
                req.flash('error', 'Item tidak ditemukan.');
                return res.redirect('/admin/produk');
            }

            const groupFotoIds = products.map(p => p.ID_GroupFoto).filter(id => id);
            const groupParamIds = products.map(p => p.ID_GroupParameter).filter(id => id);

            // 1. DELETE PRODUCTS FIRST (Free up usage counts)
            await db.product.destroy({ where: { ID_Product: idsArray }, transaction: t });

            // 2. Check and Delete Groups
            let deletedFileNames = [];

            // Group Foto
            for (const gId of groupFotoIds) {
                // Get photos potentially to delete
                const photos = await db.foto.findAll({ where: { ID_GroupFoto: gId }, transaction: t });
                
                // Try delete
                const deleted = await safeDeleteGroupFoto(gId, t);
                
                if (deleted) {
                    deletedFileNames.push(...photos.map(p => p.Foto));
                }
            }

            // Group Param
            for (const pId of groupParamIds) {
                await safeDeleteGroupParameter(pId, t);
            }

            await t.commit();

            // 3. Physical Delete
            deletedFileNames.forEach(filename => deleteFile(filename));

            req.flash('success', `${idsArray.length} produk berhasil dihapus.`);
        } else {
             req.flash('info', 'Aksi tidak dikenal.');
        }

        res.redirect('/admin/produk');

    } catch (error) {
        await t.rollback();
        console.error("Error bulkAction Produk:", error);
        req.flash('error', 'Gagal memproses aksi massal.');
        res.redirect('/admin/produk');
    }
};