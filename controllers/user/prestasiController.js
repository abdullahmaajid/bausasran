// controllers/user/prestasiController.js
// Controller untuk User melihat data Prestasi (Read Only)

const db = require('../../models');

// ==================================================================
// 1. Menampilkan List Prestasi
// ==================================================================
module.exports.renderListPrestasi = async (req, res) => {
    try {
        const prestasiList = await db.prestasi.findAll({
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

        const displayList = prestasiList.map(p => {
            p.dataValues.thumbnailFile = null;
            p.dataValues.fotoCount = 0;

            if (p.ID_GroupFoto) {
                const fotos = fotoMap.get(p.ID_GroupFoto) || [];
                p.dataValues.fotoCount = fotos.length;
                if (fotos.length > 0) {
                    p.dataValues.thumbnailFile = fotos[0].Foto;
                }
            }
            return p;
        });

        res.render('user/prestasi/index', {
            prestasiList: displayList
        });

    } catch (error) {
        console.error('Error di renderListPrestasi:', error);
        req.flash('error', 'Gagal memuat daftar prestasi.');
        res.redirect('/user/testimoni');
    }
};

// ==================================================================
// 2. Menampilkan Detail Prestasi
// ==================================================================
module.exports.renderDetailPrestasi = async (req, res) => {
    try {
        const { id } = req.params;

        const prestasi = await db.prestasi.findByPk(id);

        if (!prestasi) {
            req.flash('error', 'Prestasi tidak ditemukan.');
            return res.redirect('/user/prestasi');
        }

        // Ambil foto-foto dari group
        let fotoFiles = [];
        if (prestasi.ID_GroupFoto) {
            const fotos = await db.foto.findAll({
                where: { ID_GroupFoto: prestasi.ID_GroupFoto }
            });
            fotoFiles = fotos.map(f => f.Foto);
        }

        prestasi.dataValues.fotoFiles = fotoFiles;

        res.render('user/prestasi/detail', {
            prestasi
        });

    } catch (error) {
        console.error('Error di renderDetailPrestasi:', error);
        req.flash('error', 'Gagal memuat detail prestasi.');
        res.redirect('/user/prestasi');
    }
};
