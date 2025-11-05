// controllers/admin/produkController.js

const db = require('../../models');
const fs = require('fs');
const path = require('path');

const deleteFile = (filename, subfolder = 'produk') => {
  if (!filename) return;
  const filePath = path.join(__dirname, `../../public/images/${subfolder}`, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`File fisik ${filename} dihapus dari ${subfolder}.`);
    } catch (err) {
      console.error(`Gagal menghapus file ${filename} dari ${subfolder}:`, err);
    }
  } else {
     console.warn(`File fisik ${filename} tidak ditemukan di ${subfolder}.`);
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
    } catch (error) { /* ... error handling ... */ }
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


// deleteSpecificPhotos (tetap sama)
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

module.exports.deleteSpecificPhotos = async (req, res) => {
    const { id } = req.params;
    const { photoIds } = req.body;
    const t = await db.sequelize.transaction();
    let filenamesToDelete = [];

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada ID foto yang dipilih.' });
    }

    const idsToDelete = photoIds.map(idStr => parseInt(idStr, 10)).filter(idNum => !isNaN(idNum));
    if (idsToDelete.length === 0) {
        return res.status(400).json({ success: false, message: 'ID foto tidak valid.' });
    }

    try {
        const product = await db.product.findByPk(id);
        if (!product || !product.ID_GroupFoto) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Produk atau grup foto tidak ditemukan.' });
        }

        await db.pengguna.update( { ID_Foto: null }, { where: { ID_Foto: idsToDelete }, transaction: t } );

        const photosData = await db.foto.findAll({ where: { ID_Foto: idsToDelete, ID_GroupFoto: product.ID_GroupFoto }, transaction: t, attributes: ['Foto'] });
        filenamesToDelete = photosData.map(f => f.Foto);

        if (filenamesToDelete.length > 0) {
           await db.foto.destroy({ where: { ID_Foto: idsToDelete, ID_GroupFoto: product.ID_GroupFoto }, transaction: t });
        } else {
             await t.rollback();
             return res.status(404).json({ success: false, message: 'Foto yang dipilih tidak ditemukan untuk produk ini.' });
        }

        await t.commit();
        filenamesToDelete.forEach(filename => deleteFile(filename));
        req.flash('success', `${filenamesToDelete.length} foto berhasil dihapus.`);
        return res.json({ success: true, message: `${filenamesToDelete.length} foto berhasil dihapus.` });

    } catch (error) {
        await t.rollback();
        console.error("Error di deleteSpecificPhotos:", error);
        let message = 'Gagal menghapus foto.';
        if (error.name === 'SequelizeForeignKeyConstraintError') {
             message = 'Gagal menghapus foto karena masih direferensikan.';
        }
        req.flash('error', message); // Set flash message even for AJAX, might be useful if redirect happens
        return res.status(500).json({ success: false, message: message });
    }
};


module.exports.deleteProduk = async (req, res) => {
    const t = await db.sequelize.transaction();
    let filenamesToDelete = [];
    try {
        const { id } = req.params;
        const product = await db.product.findByPk(id);
        if (!product) { req.flash('error', 'Data produk tidak ditemukan.'); await t.rollback(); return res.redirect('/admin/produk'); }
        const groupParamIdToDelete = product.ID_GroupParameter;
        const groupFotoIdToDelete = product.ID_GroupFoto;
        const productName = product.Nama;
        if (groupFotoIdToDelete) {
            await db.pengguna.update({ ID_Foto: null }, { where: { ID_Foto: (await db.foto.findAll({ where: { ID_GroupFoto: groupFotoIdToDelete }, attributes: ['ID_Foto'], transaction: t })).map(f => f.ID_Foto) }, transaction: t });
            const photos = await db.foto.findAll({ where: { ID_GroupFoto: groupFotoIdToDelete }, transaction: t });
            filenamesToDelete = photos.map(f => f.Foto);
        }
        await product.destroy({ transaction: t });
        if (groupParamIdToDelete) { await db.parameter.destroy({ where: { ID_GroupParameter: groupParamIdToDelete }, transaction: t }); await db.groupparameter.destroy({ where: { ID_GroupParameter: groupParamIdToDelete }, transaction: t }); }
        if (groupFotoIdToDelete) { await db.foto.destroy({ where: { ID_GroupFoto: groupFotoIdToDelete }, transaction: t }); await db.groupfoto.destroy({ where: { ID_GroupFoto: groupFotoIdToDelete }, transaction: t }); }
        await t.commit();
        filenamesToDelete.forEach(filename => deleteFile(filename));
        req.flash('success', `Produk '${productName}' berhasil dihapus.`);
        res.redirect('/admin/produk');
    } catch (error) {
        await t.rollback();
        console.error("Error di deleteProduk:", error);
        req.flash('error', 'Gagal menghapus data produk.');
        res.redirect('/admin/produk');
    }
};

// --- FUNGSI BARU UNTUK HALAMAN DETAIL ---
module.exports.renderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await db.product.findByPk(id, {
            include: [
                {
                    model: db.groupfoto,
                    as: 'groupfoto', // Sesuaikan 'as' jika ada alias di model Product
                    include: {
                        model: db.foto,
                        as: 'fotos', // Sesuaikan 'as' jika ada alias di model GroupFoto
                        attributes: ['ID_Foto', 'Foto'] // Ambil kolom yang relevan saja
                    }
                },
                {
                    model: db.groupparameter,
                    as: 'groupparameter', // Sesuaikan 'as' jika ada alias di model Product
                    include: {
                        model: db.parameter,
                        as: 'parameters', // Sesuaikan 'as' jika ada alias di model GroupParameter
                        attributes: ['Nama', 'Minimal', 'Maksimal'] // Ambil kolom yang relevan
                    }
                }
            ]
        });

        if (!product) {
            req.flash('error', 'Produk tidak ditemukan.');
            return res.redirect('/admin/produk');
        }

        // Konversi ke JSON polos untuk EJS (termasuk data include)
        const productData = product.toJSON();

        // Optional: Rapikan data foto dan parameter jika perlu
        // Jika alias tidak dipakai, akses mungkin seperti productData.groupfoto.fotos
        // Jika pakai alias, akses seperti productData.groupfoto.parameters
        // Contoh akses (sesuaikan dengan alias Anda):
        const photos = productData.groupfoto ? productData.groupfoto.fotos || [] : [];
        const parameters = productData.groupparameter ? productData.groupparameter.parameters || [] : [];


        // Render view detail (buat file baru: views/admin/produk/detail.ejs)
        res.render('admin/produk/detail', {
            product: productData,
            photos: photos, // Kirim foto secara terpisah (opsional)
            parameters: parameters // Kirim parameter secara terpisah (opsional)
        });

    } catch (error) {
        console.error("Error di renderDetail Produk:", error);
        req.flash('error', 'Gagal memuat detail produk.');
        res.redirect('/admin/produk');
    }
};