// controllers/user/kegiatanController.js
// Controller untuk User melihat data Kegiatan (Read Only)

const db = require('../../models');

// ==================================================================
// 1. Menampilkan List Kegiatan
// ==================================================================
module.exports.renderListKegiatan = async (req, res) => {
    try {
        const kegiatanList = await db.kegiatan.findAll({
            order: [['Tanggal', 'DESC']]
        });

        // Manual data joining untuk foto thumbnail
        const groupFotoList = await db.groupfoto.findAll();
        const fotoList = await db.foto.findAll();
        
        const groupFotoMap = new Map(groupFotoList.map(gf => [gf.ID_GroupFoto, gf]));
        const fotoMap = new Map();
        
        // Group foto by ID_GroupFoto
        fotoList.forEach(f => {
            if (!fotoMap.has(f.ID_GroupFoto)) {
                fotoMap.set(f.ID_GroupFoto, []);
            }
            fotoMap.get(f.ID_GroupFoto).push(f);
        });

        const displayList = kegiatanList.map(k => {
            k.dataValues.thumbnailFile = null;
            k.dataValues.fotoCount = 0;

            if (k.ID_GroupFoto) {
                const fotos = fotoMap.get(k.ID_GroupFoto) || [];
                k.dataValues.fotoCount = fotos.length;
                if (fotos.length > 0) {
                    k.dataValues.thumbnailFile = fotos[0].Foto;
                }
            }
            return k;
        });

        res.render('user/kegiatan/index', {
            kegiatanList: displayList
        });

    } catch (error) {
        console.error('Error di renderListKegiatan:', error);
        req.flash('error', 'Gagal memuat daftar kegiatan.');
        res.redirect('/user/testimoni');
    }
};

// ==================================================================
// 2. Menampilkan Detail Kegiatan
// ==================================================================
module.exports.renderDetailKegiatan = async (req, res) => {
    try {
        const { id } = req.params;

        const kegiatan = await db.kegiatan.findByPk(id);

        if (!kegiatan) {
            req.flash('error', 'Kegiatan tidak ditemukan.');
            return res.redirect('/user/kegiatan');
        }

        // Ambil foto-foto dari group
        let fotoFiles = [];
        if (kegiatan.ID_GroupFoto) {
            const fotos = await db.foto.findAll({
                where: { ID_GroupFoto: kegiatan.ID_GroupFoto }
            });
            fotoFiles = fotos.map(f => f.Foto);
        }

        kegiatan.dataValues.fotoFiles = fotoFiles;

        res.render('user/kegiatan/detail', {
            kegiatan
        });

    } catch (error) {
        console.error('Error di renderDetailKegiatan:', error);
        req.flash('error', 'Gagal memuat detail kegiatan.');
        res.redirect('/user/kegiatan');
    }
};
