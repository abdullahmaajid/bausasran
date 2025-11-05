// controllers/admin/anggotaController.js

const db = require('../../models');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Fungsi helper untuk hapus file fisik (Tidak berubah)
const deleteFile = (filename) => {
  if (filename) {
    const filePath = path.join(__dirname, '../../public/images/anggota', filename);
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
// 1. (READ) Menampilkan List Anggota (DIPERBAIKI)
// ==================================================================
module.exports.renderList = async (req, res) => {
    try {
        // 1. Ambil SEMUA anggota
        const anggotaList = await db.pengguna.findAll({
            order: [['Nama', 'ASC']]
        });
        
        // 2. Ambil SEMUA foto
        const fotoList = await db.foto.findAll();

        // 3. Buat Peta (Map) untuk foto agar mudah dicari
        //    (Key: ID_Foto, Value: 'nama-file.png')
        const fotoMap = new Map();
        for (const foto of fotoList) {
            fotoMap.set(foto.ID_Foto, foto.Foto);
        }

        // 4. Gabungkan data secara manual
        //    Kita tambahkan properti 'fotoFile' baru ke setiap anggota
        const displayList = anggotaList.map(anggota => {
            // 'anggota.dataValues' adalah tempat data aslinya
            anggota.dataValues.fotoFile = fotoMap.get(anggota.ID_Foto) || null;
            return anggota;
        });

        res.render('admin/anggota/index', {
            anggotaList: displayList // Kirim data yang sudah digabung
        });

    } catch (error) {
        console.error("Error di renderList Anggota:", error);
        req.flash('error', 'Gagal memuat daftar anggota.');
        res.redirect('/admin/dashboard');
    }
};

// 2. (CREATE) Menampilkan Form (Tidak berubah)
module.exports.renderNewForm = (req, res) => {
    res.render('admin/anggota/new');
};

// 3. (CREATE) Memproses Form (Tidak berubah, ini sudah benar)
module.exports.createAnggota = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { nama, jabatan, deskripsi, role, username, password } = req.body;

        const cekUser = await db.pengguna.findOne({ where: { username: username } });
        if (cekUser) {
            req.flash('error', `Username '${username}' sudah digunakan.`);
            if (req.file) deleteFile(req.file.filename); 
            await t.rollback();
            return res.redirect('/admin/anggota/new');
        }
        if (!nama || !username || !password || !role) {
             req.flash('error', 'Field Nama, Username, Password, dan Role wajib diisi.');
             if (req.file) deleteFile(req.file.filename);
             await t.rollback();
             return res.redirect('/admin/anggota/new');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let newFotoId = null; 

        if (req.file) {
            const [group] = await db.groupfoto.findOrCreate({
                where: { Nama: 'Foto Profil Anggota' },
                defaults: { Nama: 'Foto Profil Anggota' },
                transaction: t
            });
            const newFoto = await db.foto.create({
                Foto: req.file.filename,
                ID_GroupFoto: group.ID_GroupFoto
            }, { transaction: t });
            newFotoId = newFoto.ID_Foto; // Ambil INT ID
        }
        
        await db.pengguna.create({
            Nama: nama,
            Jabatan: jabatan,
            Deskripsi: deskripsi,
            Role: role,
            username: username,
            password: hashedPassword,
            ID_Foto: newFotoId // Simpan INT ID
        }, { transaction: t });

        await t.commit();
        req.flash('success', 'Data anggota baru berhasil ditambahkan.');
        res.redirect('/admin/anggota');

    } catch (error) {
        await t.rollback(); 
        if (req.file) deleteFile(req.file.filename); 

        let flashError = 'Gagal menambahkan data baru.';
        if (error.name === 'SequelizeValidationError') {
            flashError = error.errors.map(err => err.message).join(', ');
        } else if (error.message.includes('Hanya file')) {
             flashError = error.message;
        }
        console.error("Error di createAnggota:", error);
        req.flash('error', flashError);
        res.redirect('/admin/anggota/new');
    }
};

// ==================================================================
// 4. (UPDATE) Menampilkan Form (DIPERBAIKI)
// ==================================================================
module.exports.renderEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        // 1. Ambil data anggota
        const anggota = await db.pengguna.findByPk(id);
        
        if (!anggota) {
            req.flash('error', 'Data anggota tidak ditemukan.');
            return res.redirect('/admin/anggota');
        }

        // 2. Ambil data foto secara manual (jika ada)
        if (anggota.ID_Foto) {
            const fotoData = await db.foto.findByPk(anggota.ID_Foto);
            anggota.dataValues.fotoFile = fotoData ? fotoData.Foto : null;
        } else {
            anggota.dataValues.fotoFile = null;
        }

        // 3. Kirim ke view
        res.render('admin/anggota/edit', { anggota });
    } catch (error) {
        console.error("Error di renderEditForm Anggota:", error);
        req.flash('error', 'Gagal memuat form edit.');
        res.redirect('/admin/anggota');
    }
};

// 5. (UPDATE) Memproses Form (Tidak berubah, ini sudah benar)
module.exports.updateAnggota = async (req, res) => {
    const { id } = req.params;
    const t = await db.sequelize.transaction();
    try {
        const { nama, jabatan, deskripsi, role, username, password } = req.body;
        const anggota = await db.pengguna.findByPk(id);

        if (!anggota) {
            req.flash('error', 'Data anggota tidak ditemukan.');
            if (req.file) deleteFile(req.file.filename);
            await t.rollback();
            return res.redirect('/admin/anggota');
        }
        
        if (username !== anggota.username) {
             const cekUser = await db.pengguna.findOne({ where: { username: username } });
             if (cekUser) {
                req.flash('error', `Username '${username}' sudah digunakan.`);
                if (req.file) deleteFile(req.file.filename);
                await t.rollback();
                return res.redirect(`/admin/anggota/${id}/edit`);
             }
        }
        
        if (!nama || !username || !role) {
             req.flash('error', 'Field Nama, Username, dan Role wajib diisi.');
             if (req.file) deleteFile(req.file.filename);
             await t.rollback();
             return res.redirect(`/admin/anggota/${id}/edit`);
        }

        let dataToUpdate = {
            Nama: nama, Jabatan: jabatan, Deskripsi: deskripsi, Role: role, username: username
        };
        if (password && password.length > 0) {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        let oldFotoId = anggota.ID_Foto; 

        if (req.file) {
            const [group] = await db.groupfoto.findOrCreate({
                where: { Nama: 'Foto Profil Anggota' },
                defaults: { Nama: 'Foto Profil Anggota' },
                transaction: t
            });
            const newFoto = await db.foto.create({
                Foto: req.file.filename,
                ID_GroupFoto: group.ID_GroupFoto
            }, { transaction: t });
            dataToUpdate.ID_Foto = newFoto.ID_Foto; // INT ID
        }

        await anggota.update(dataToUpdate, { transaction: t });
        await t.commit(); 
        req.flash('success', 'Data anggota berhasil diperbarui.');

        if (req.file && oldFotoId) {
            const oldFotoData = await db.foto.findByPk(oldFotoId);
            if (oldFotoData) {
                const oldFotoFile = oldFotoData.Foto; 
                await oldFotoData.destroy(); 
                deleteFile(oldFotoFile); 
            }
        }
        res.redirect('/admin/anggota');

    } catch (error) {
        await t.rollback();
        if (req.file) deleteFile(req.file.filename); 

        let flashError = 'Gagal memperbarui data.';
        if (error.name === 'SequelizeValidationError') {
            flashError = error.errors.map(err => err.message).join(', ');
        } else if (error.message.includes('Hanya file')) {
             flashError = error.message;
        }
        console.error("Error di updateAnggota:", error);
        req.flash('error', flashError);
        res.redirect(`/admin/anggota/${id}/edit`);
    }
};

// 6. (DELETE) Memproses Hapus (Tidak berubah, ini sudah benar)
module.exports.deleteAnggota = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.ID_Pengguna == id) {
            req.flash('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
            return res.redirect('/admin/anggota');
        }
        const anggota = await db.pengguna.findByPk(id);
        if (!anggota) {
            req.flash('error', 'Data anggota tidak ditemukan.');
            return res.redirect('/admin/anggota');
        }
        
        const oldFotoId = anggota.ID_Foto; 
        await anggota.destroy(); 

        if (oldFotoId) {
            const oldFotoData = await db.foto.findByPk(oldFotoId);
            if (oldFotoData) {
                const oldFotoFile = oldFotoData.Foto; 
                await oldFotoData.destroy(); 
                deleteFile(oldFotoFile); 
            }
        }
        
        req.flash('success', `Data anggota '${anggota.Nama}' berhasil dihapus.`);
        res.redirect('/admin/anggota');

    } catch (error) {
        console.error("Error di deleteAnggota:", error);
        req.flash('error', 'Gagal menghapus data.');
        res.redirect('/admin/anggota');
    }
};

// controllers/admin/anggotaController.js

// ... (renderList, renderNewForm, createAnggota) ...

// ==================================================================
// BARU: (READ) Menampilkan Halaman Detail Anggota
// ==================================================================
module.exports.renderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const anggota = await db.pengguna.findByPk(id);
        
        if (!anggota) {
            req.flash('error', 'Data anggota tidak ditemukan.');
            return res.redirect('/admin/anggota');
        }

        // Ambil data foto secara manual (jika ada)
        // (Ini logika yang sama dari renderEditForm)
        if (anggota.ID_Foto) {
            const fotoData = await db.foto.findByPk(anggota.ID_Foto);
            anggota.dataValues.fotoFile = fotoData ? fotoData.Foto : null;
        } else {
            anggota.dataValues.fotoFile = null;
        }

        res.render('admin/anggota/detail', { anggota });

    } catch (error) {
        console.error("Error di renderDetail Anggota:", error);
        req.flash('error', 'Gagal memuat detail anggota.');
        res.redirect('/admin/anggota');
    }
};

