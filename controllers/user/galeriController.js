// controllers/user/galeriController.js
// Controller untuk User melihat data Galeri (Read Only)

const db = require('../../models');

// ==================================================================
// 1. Menampilkan List Galeri (Group Foto)
// ==================================================================
module.exports.renderListGaleri = async (req, res) => {
    try {
        const groupFotoList = await db.groupfoto.findAll({
            order: [['ID_GroupFoto', 'DESC']]
        });

        // Manual data joining untuk hitung foto dan thumbnail
        const fotoList = await db.foto.findAll();
        const fotoMap = new Map();

        // Group fotos by ID_GroupFoto
        fotoList.forEach(f => {
            if (!fotoMap.has(f.ID_GroupFoto)) {
                fotoMap.set(f.ID_GroupFoto, []);
            }
            fotoMap.get(f.ID_GroupFoto).push(f);
        });

        const displayList = groupFotoList.map(gf => {
            const fotos = fotoMap.get(gf.ID_GroupFoto) || [];
            gf.dataValues.fotoCount = fotos.length;
            gf.dataValues.thumbnailFile = fotos.length > 0 ? fotos[0].Foto : null;
            gf.dataValues.allFotos = fotos;
            return gf;
        });

        res.render('user/galeri/index', {
            galeriList: displayList
        });

    } catch (error) {
        console.error('Error di renderListGaleri:', error);
        req.flash('error', 'Gagal memuat galeri.');
        res.redirect('/user/testimoni');
    }
};

// ==================================================================
// 2. Menampilkan Detail Galeri (Semua Foto dalam Group)
// ==================================================================
module.exports.renderDetailGaleri = async (req, res) => {
    try {
        const { id } = req.params;

        const groupFoto = await db.groupfoto.findByPk(id);

        if (!groupFoto) {
            req.flash('error', 'Galeri tidak ditemukan.');
            return res.redirect('/user/galeri');
        }

        // Ambil semua foto dalam group
        const fotoList = await db.foto.findAll({
            where: { ID_GroupFoto: id }
        });

        groupFoto.dataValues.fotoFiles = fotoList.map(f => ({
            ID_Foto: f.ID_Foto,
            Foto: f.Foto
        }));

        res.render('user/galeri/detail', {
            groupFoto
        });

    } catch (error) {
        console.error('Error di renderDetailGaleri:', error);
        req.flash('error', 'Gagal memuat detail galeri.');
        res.redirect('/user/galeri');
    }
};
