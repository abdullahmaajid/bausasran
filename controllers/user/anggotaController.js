// controllers/user/anggotaController.js
// Controller untuk User melihat data Anggota (Read Only)

const db = require('../../models');

// ==================================================================
// 1. Menampilkan List Anggota
// ==================================================================
module.exports.renderListAnggota = async (req, res) => {
    try {
        // Ambil semua anggota dengan role User (bukan admin)
        const anggotaList = await db.pengguna.findAll({
            where: { role: 'User' },
            order: [['Nama', 'ASC']]
        });

        // Manual data joining untuk foto
        const fotoList = await db.foto.findAll();
        const fotoMap = new Map(fotoList.map(f => [f.ID_Foto, f.Foto]));

        const displayList = anggotaList.map(a => {
            a.dataValues.fotoFile = fotoMap.get(a.ID_Foto) || null;
            return a;
        });

        res.render('user/anggota/index', {
            anggotaList: displayList
        });

    } catch (error) {
        console.error('Error di renderListAnggota:', error);
        req.flash('error', 'Gagal memuat daftar anggota.');
        res.redirect('/user/testimoni');
    }
};

// ==================================================================
// 2. Menampilkan Detail Anggota
// ==================================================================
module.exports.renderDetailAnggota = async (req, res) => {
    try {
        const { id } = req.params;

        const anggota = await db.pengguna.findByPk(id);

        if (!anggota) {
            req.flash('error', 'Anggota tidak ditemukan.');
            return res.redirect('/user/anggota');
        }

        // Ambil foto jika ada
        let fotoFile = null;
        if (anggota.ID_Foto) {
            const foto = await db.foto.findByPk(anggota.ID_Foto);
            fotoFile = foto ? foto.Foto : null;
        }

        anggota.dataValues.fotoFile = fotoFile;

        res.render('user/anggota/detail', {
            anggota
        });

    } catch (error) {
        console.error('Error di renderDetailAnggota:', error);
        req.flash('error', 'Gagal memuat detail anggota.');
        res.redirect('/user/anggota');
    }
};
