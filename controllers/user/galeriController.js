// controllers/user/galeriController.js
// Controller untuk User melihat data Galeri (Read Only)

const db = require('../../models');

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
// 1. Menampilkan List Galeri (Group Foto)
// ==================================================================
module.exports.renderListGaleri = async (req, res) => {
    try {
        const groupFotoList = await db.groupfoto.findAll({
            include: [
                { model: db.product, as: 'products', attributes: ['ID_Product'] },
                { model: db.kegiatan, as: 'kegiatans', attributes: ['ID_Kegiatan'] },
                { model: db.prestasi, as: 'prestasis', attributes: ['ID_Prestasi'] }
            ],
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
            // Tentukan folder
            gf.dataValues.folder = determineFolder(gf);
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

        const groupFoto = await db.groupfoto.findByPk(id, {
            include: [
                { model: db.product, as: 'products', attributes: ['ID_Product'] },
                { model: db.kegiatan, as: 'kegiatans', attributes: ['ID_Kegiatan'] },
                { model: db.prestasi, as: 'prestasis', attributes: ['ID_Prestasi'] }
            ]
        });

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

        // Tentukan folder
        const folder = determineFolder(groupFoto);

        res.render('user/galeri/detail', {
            groupFoto,
            folder
        });

    } catch (error) {
        console.error('Error di renderDetailGaleri:', error);
        req.flash('error', 'Gagal memuat detail galeri.');
        res.redirect('/user/galeri');
    }
};
