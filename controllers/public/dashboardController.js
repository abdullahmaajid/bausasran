// controllers/public/dashboardController.js

// Impor model Sequelize Anda
// PERBAIKAN: Path diubah dari ../models menjadi ../../models
const db = require('../../models');

// Fungsi untuk me-render halaman dashboard publik (HomePage)
module.exports.renderDashboard = async (req, res) => {
    try {
        // 1. Ambil 3 Kegiatan Terbaru (Past)
        const kegiatan = await db.kegiatan.findAll({
            include: [
                {
                    model: db.groupfoto,
                    as: 'ID_GroupFoto_groupfoto',
                    include: {
                        model: db.foto,
                        as: 'fotos',
                        attributes: ['ID_Foto', 'Foto']
                    }
                }
            ],
            where: { Status: 'Past' },
            limit: 3,
            order: [['Tanggal', 'DESC']]
        });

        const kegiatanList = kegiatan.map(k => {
            const kJson = k.toJSON();
            kJson.photos = [];
            if (kJson.ID_GroupFoto_groupfoto && kJson.ID_GroupFoto_groupfoto.fotos) {
                kJson.photos = kJson.ID_GroupFoto_groupfoto.fotos;
            }
            return kJson;
        });

        // 2. Ambil 3 Produk Unggulan
        const produk = await db.product.findAll({
            include: [
                {
                    model: db.groupfoto,
                    as: 'ID_GroupFoto_groupfoto',
                    include: {
                        model: db.foto,
                        as: 'fotos',
                        attributes: ['ID_Foto', 'Foto']
                    }
                }
            ],
            limit: 3,
            order: [['ID_Product', 'DESC']]
        });

        const produkList = produk.map(p => {
            const pJson = p.toJSON();
            pJson.photos = [];
            if (pJson.ID_GroupFoto_groupfoto && pJson.ID_GroupFoto_groupfoto.fotos) {
                pJson.photos = pJson.ID_GroupFoto_groupfoto.fotos;
            }
            return pJson;
        });

        // 3. Ambil 3 Prestasi Terbaru
        const prestasi = await db.prestasi.findAll({
            include: [
                {
                    model: db.groupfoto,
                    as: 'ID_GroupFoto_groupfoto',
                    include: {
                        model: db.foto,
                        as: 'fotos',
                        attributes: ['ID_Foto', 'Foto']
                    }
                }
            ],
            limit: 3,
            order: [['Tanggal', 'DESC']]
        });

        const prestasiList = prestasi.map(p => {
            const pJson = p.toJSON();
            pJson.photos = [];
            // Folder prestasi selalu 'prestasi' atau bisa dicek via group, tapi default 'prestasi' aman jika relasi benar
            // Namun kita bisa gunakan logic detect yang lebih robust nanti static di view atau disini
            // Untuk simplifikasi, kita ambil array photos
            if (pJson.ID_GroupFoto_groupfoto && pJson.ID_GroupFoto_groupfoto.fotos) {
                pJson.photos = pJson.ID_GroupFoto_groupfoto.fotos;
            }
            // Logic folder untuk prestasi biasanya 'prestasi' atau 'kegiatan' tergantung group
            // Kita set default 'prestasi' krn ini section prestasi
            pJson.folder = 'prestasi'; 
            
            // Cek detail folder jika perlu (opsional, jika ingin sempurna seperti galeri)
             if (pJson.ID_GroupFoto_groupfoto) {
                // simple check
                const gName = (pJson.ID_GroupFoto_groupfoto.Nama || '').toLowerCase();
                if (gName.includes('kegiatan')) pJson.folder = 'kegiatan';
                else if (gName.includes('produk')) pJson.folder = 'produk';
            }

            return pJson;
        });


        // Helper Determine Folder (Sama seperti di pageController/galeriController)
        const determineFolder = (group) => {
            if (!group) return 'galeri';
            // 1. Cek Relasi Database
            if (group.products && group.products.length > 0) return 'produk';
            if (group.kegiatans && group.kegiatans.length > 0) return 'kegiatan';
            if (group.prestasis && group.prestasis.length > 0) return 'prestasi';
            
            // 2. Fallback: Cek Nama
            const groupName = group.Nama || '';
            const lowerName = groupName.toLowerCase();
            if (lowerName.includes('kegiatan')) return 'kegiatan';
            if (lowerName.includes('produk') || lowerName.includes('spek')) return 'produk';
            if (lowerName.includes('prestasi')) return 'prestasi';
            if (lowerName.includes('anggota')) return 'anggota';
            
            return 'galeri';
        };

        // 4. Ambil 3 Galeri Terbaru (Foto)
        const galeri = await db.foto.findAll({
             include: [{
                model: db.groupfoto,
                as: 'ID_GroupFoto_groupfoto',
                include: [
                    { model: db.product, as: 'products', attributes: ['ID_Product'] },
                    { model: db.kegiatan, as: 'kegiatans', attributes: ['ID_Kegiatan'] },
                    { model: db.prestasi, as: 'prestasis', attributes: ['ID_Prestasi'] }
                ]
            }],
            limit: 4,
            order: [['ID_Foto', 'DESC']]
        });

        const galeriList = galeri.map(f => {
            const fJson = f.toJSON();
            const group = fJson.ID_GroupFoto_groupfoto;
            fJson.folder = determineFolder(group);
            return fJson;
        });

        // 5. Ambil 3 Anggota
        const anggota = await db.pengguna.findAll({
            limit: 3,
            order: [['Nama', 'ASC']] // Atau random
        });
        
        // Fetch foto anggota
        const anggotaFotoIds = [...new Set(anggota.map(a => a.ID_Foto).filter(Boolean))];
        let anggotaFotoMap = new Map();
        if(anggotaFotoIds.length > 0){
             const fList = await db.foto.findAll({
                where: { ID_Foto: anggotaFotoIds },
                include: [{
                     model: db.groupfoto,
                     as: 'ID_GroupFoto_groupfoto' // Kita butuh ini jika folder anggota dinamis, tapi biasanya 'anggota'
                }]
             });
             fList.forEach(f => {
                 // Asumsi folder anggota bisa 'anggota' atau 'galeri'
                 // Jika ikut logic determine:
                 // const folder = determineFolder(f.ID_GroupFoto_groupfoto); 
                 // Tapi biasanya anggota disimpan di folder 'anggota' jika uploadan profil.
                 // Jika ambil dari galeri... kita cek simple aja
                 let folder = 'anggota'; 
                 // Jika mau robust:
                 // if(f.ID_GroupFoto_groupfoto) folder = determineFolder(f.ID_GroupFoto_groupfoto);
                 
                 anggotaFotoMap.set(f.ID_Foto, { file: f.Foto, folder: folder });
             });
        }

        const anggotaList = anggota.map(a => {
            const aJson = a.toJSON();
            aJson.fotoFile = null;
            aJson.folder = 'anggota';
            
            if(aJson.ID_Foto && anggotaFotoMap.has(aJson.ID_Foto)){
                const info = anggotaFotoMap.get(aJson.ID_Foto);
                aJson.fotoFile = info.file;
                // aJson.folder = info.folder; // Jika mau support dynamic folder user
            }
            return aJson;
        });


        // 6. Ambil 3 Testimoni Terbaru
        const testimoni = await db.review.findAll({
            limit: 3,
            order: [['ID_Review', 'DESC']]
        });

        // Ambil data user untuk testimoni
        const userIds = [...new Set(testimoni.map(t => t.ID_Pengguna).filter(Boolean))];
        let userMap = new Map();
        if(userIds.length > 0){
            const users = await db.pengguna.findAll({
                where: { ID_Pengguna: userIds }
            });
            // Kita juga butuh foto user
            const uFotoIds = [...new Set(users.map(u => u.ID_Foto).filter(Boolean))];
            let uFotoMap = new Map();
             if(uFotoIds.length > 0){
                 const uPhotos = await db.foto.findAll({ where: { ID_Foto: uFotoIds }});
                 uPhotos.forEach(p => uFotoMap.set(p.ID_Foto, p.Foto));
             }

            users.forEach(u => {
                const uJson = u.toJSON();
                uJson.fotoFile = null;
                if(u.ID_Foto) uJson.fotoFile = uFotoMap.get(u.ID_Foto);
                userMap.set(u.ID_Pengguna, uJson);
            });
        }

        const testimoniList = testimoni.map(t => {
            const tJson = t.toJSON();
            tJson.pengguna = userMap.get(tJson.ID_Pengguna) || null;
            return tJson;
        });

        // Render file EJS dan kirimkan datanya
        res.render('public/dashboard_public', {
            kegiatan : kegiatanList,
            produk : produkList,
            prestasi : prestasiList,
            galeri : galeriList,
            anggota : anggotaList,
            testimoni : testimoniList
        });

    } catch (error) {
        console.error("Error mengambil data dashboard:", error);
        // Tampilkan halaman error sederhana jika gagal
        res.status(500).send("<h1>500 - Terjadi Kesalahan Internal</h1><p>Tidak dapat memuat data halaman utama.</p>");
    }
};