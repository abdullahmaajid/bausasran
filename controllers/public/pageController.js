// controllers/public/pageController.js

const db = require('../../models');

// ==================================================================
// 1. Halaman List Kegiatan
// ==================================================================
module.exports.renderKegiatan = async (req, res) => {
    try {
        // Ambil semua kegiatan
        const kegiatanList = await db.kegiatan.findAll({
             include: [
                {
                    model: db.groupfoto,
                    as: 'ID_GroupFoto_groupfoto',
                    include: {
                        model: db.foto,
                        as: 'fotos',
                        attributes: ['ID_Foto', 'Foto']
                    }
                },
                {
                    model: db.groupsection,
                    as: 'ID_GroupSection_groupsection',
                    include: {
                        model: db.detailsection,
                        as: 'detailsections',
                        where: { Urutan: 1 },
                        required: false 
                    }
                }
            ],
            order: [['Tanggal', 'DESC']]
        });
        const displayList = kegiatanList.map(k => {
            const kJson = k.toJSON();
            kJson.photos = [];
            if (kJson.ID_GroupFoto_groupfoto && kJson.ID_GroupFoto_groupfoto.fotos) {
                kJson.photos = kJson.ID_GroupFoto_groupfoto.fotos;
            }
            
            // Ambil Deskripsi
            kJson.Deskripsi = '';
            if (kJson.ID_GroupSection_groupsection && 
                kJson.ID_GroupSection_groupsection.detailsections && 
                kJson.ID_GroupSection_groupsection.detailsections.length > 0) {
                kJson.Deskripsi = kJson.ID_GroupSection_groupsection.detailsections[0].Deskripsi;
            }
            
            return kJson;
        });

        res.render('public/kegiatan', {
            kegiatanList: displayList
        });
    } catch (error) {
        console.error('Error di renderKegiatan:', error);
        req.flash('error', 'Gagal memuat halaman kegiatan.');
        res.redirect('/');
    }
};

// ==================================================================
// 2. Halaman Detail Kegiatan
// ==================================================================
module.exports.renderKegiatanDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil detail kegiatan
        let kegiatan = await db.kegiatan.findByPk(id, {
            include: [{
                model: db.groupsection,
                as: 'ID_GroupSection_groupsection',
                include: {
                    model: db.detailsection,
                    as: 'detailsections',
                    where: { Urutan: 1 },
                    required: false
                }
            }]
        });

        if (!kegiatan) {
            req.flash('error', 'Kegiatan tidak ditemukan.');
            return res.redirect('/kegiatan');
        }

        // Convert to Plain JSON for easier property modification
        kegiatan = kegiatan.toJSON();

        // Attach Deskripsi
        kegiatan.Deskripsi = '';
        if (kegiatan.ID_GroupSection_groupsection && 
            kegiatan.ID_GroupSection_groupsection.detailsections && 
            kegiatan.ID_GroupSection_groupsection.detailsections.length > 0) {
            kegiatan.Deskripsi = kegiatan.ID_GroupSection_groupsection.detailsections[0].Deskripsi;
        }

        // Ambil foto-foto kegiatan
        let fotoFiles = [];
        if (kegiatan.ID_GroupFoto) {
            const fotoList = await db.foto.findAll({
                where: { ID_GroupFoto: kegiatan.ID_GroupFoto }
            });
            fotoFiles = fotoList.map(f => f.Foto);
        }

        // Ambil galeri info
        let groupFoto = null;
        if (kegiatan.ID_GroupFoto) {
            groupFoto = await db.groupfoto.findByPk(kegiatan.ID_GroupFoto);
        }

        // Ambil review/testimoni untuk kegiatan ini
        const reviewList = await db.review.findAll({
            where: { 
                ID_Kegiatan: id,
                Kategori: 'Kegiatan'
            },
            order: [['ID_Review', 'DESC']],
            limit: 10
        });

        // Ambil data pengguna untuk review
        const penggunaIds = [...new Set(reviewList.map(r => r.ID_Pengguna).filter(Boolean))];
        const penggunaList = await db.pengguna.findAll({
            where: { ID_Pengguna: penggunaIds }
        });
        const penggunaMap = new Map(penggunaList.map(p => [p.ID_Pengguna, p]));

        // Attach pengguna to review
        reviewList.forEach(review => {
            review.dataValues.pengguna = penggunaMap.get(review.ID_Pengguna);
        });

        // Hitung rata-rata rating
        const avgRating = reviewList.length > 0
            ? (reviewList.reduce((sum, r) => sum + r.Rating, 0) / reviewList.length).toFixed(1)
            : 0;

        res.render('public/kegiatan_detail', {
            kegiatan,
            fotoFiles,
            groupFoto,
            reviewList,
            avgRating,
            totalReview: reviewList.length
        });
    } catch (error) {
        console.error('Error di renderKegiatanDetail:', error);
        req.flash('error', 'Gagal memuat detail kegiatan.');
        res.redirect('/kegiatan');
    }
};

// ==================================================================
// 3. Halaman List Produk
// ==================================================================
module.exports.renderProduk = async (req, res) => {
    try {
        // Ambil semua produk dengan relasi foto dan parameter
        const produkList = await db.product.findAll({
            include: [
                {
                    model: db.groupfoto,
                    as: 'ID_GroupFoto_groupfoto',
                    include: {
                        model: db.foto,
                        as: 'fotos',
                        attributes: ['ID_Foto', 'Foto']
                    }
                },
                {
                    model: db.groupparameter,
                    as: 'ID_GroupParameter_groupparameter',
                    include: {
                        model: db.parameter,
                        as: 'parameters',
                        attributes: ['Nama', 'Minimal', 'Maksimal']
                    }
                }
            ],
            order: [['ID_Product', 'DESC']]
        });

        const displayList = produkList.map( p => {
            const productJson  = p.toJSON();

            if(productJson.ID_GroupFoto_groupfoto && productJson.ID_GroupFoto_groupfoto.fotos){
                productJson.photos = productJson.ID_GroupFoto_groupfoto.fotos
            }
            else{
                productJson.photos = []
            }

            return productJson
        });

        // Convert to plain JSON for client-side usage if needed, or pass as instance
        // passing as instance works fine with EJS serialization usually
        
        res.render('public/produk', {
            produkList: displayList
        });
    } catch (error) {
        console.error('Error di renderProduk:', error);
        req.flash('error', 'Gagal memuat halaman produk.');
        res.redirect('/');
    }
};

// ==================================================================
// 4. Halaman Detail Produk
// ==================================================================
module.exports.renderProdukDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil detail produk
        // Ambil detail produk dengan parameter untuk simulasi
        const produk = await db.product.findByPk(id, {
            include: [
                 {
                    model: db.groupparameter,
                    as: 'ID_GroupParameter_groupparameter',
                    include: {
                        model: db.parameter,
                        as: 'parameters',
                        attributes: ['Nama', 'Minimal', 'Maksimal']
                    }
                }
            ]
        });

        if (!produk) {
            req.flash('error', 'Produk tidak ditemukan.');
            return res.redirect('/produk');
        }

        // Ambil foto-foto produk
        let fotoFiles = [];
        if (produk.ID_GroupFoto) {
            const fotoList = await db.foto.findAll({
                where: { ID_GroupFoto: produk.ID_GroupFoto }
            });
            fotoFiles = fotoList.map(f => f.Foto);
        }

        // Ambil galeri info
        let groupFoto = null;
        if (produk.ID_GroupFoto) {
            groupFoto = await db.groupfoto.findByPk(produk.ID_GroupFoto);
        }

        // Ambil review/testimoni untuk produk ini
        const reviewList = await db.review.findAll({
            where: { 
                ID_Product: id,
                Kategori: 'Product'
            },
            order: [['ID_Review', 'DESC']],
            limit: 10
        });

        // Ambil data pengguna untuk review
        const penggunaIds = [...new Set(reviewList.map(r => r.ID_Pengguna).filter(Boolean))];
        const penggunaList = await db.pengguna.findAll({
            where: { ID_Pengguna: penggunaIds }
        });
        const penggunaMap = new Map(penggunaList.map(p => [p.ID_Pengguna, p]));

        // Attach pengguna to review
        reviewList.forEach(review => {
            review.dataValues.pengguna = penggunaMap.get(review.ID_Pengguna);
        });

        // Hitung rata-rata rating
        const avgRating = reviewList.length > 0
            ? (reviewList.reduce((sum, r) => sum + r.Rating, 0) / reviewList.length).toFixed(1)
            : 0;

        res.render('public/produk_detail', {
            produk,
            fotoFiles,
            groupFoto,
            reviewList,
            avgRating,
            totalReview: reviewList.length
        });
    } catch (error) {
        console.error('Error di renderProdukDetail:', error);
        req.flash('error', 'Gagal memuat detail produk.');
        res.redirect('/produk');
    }
};

// ==================================================================
// 5. Halaman List Prestasi
// ==================================================================
module.exports.renderPrestasi = async (req, res) => {
    try {
        const prestasiList = await db.prestasi.findAll({
            order: [['Tanggal', 'DESC']]
        });

        res.render('public/prestasi', {
            prestasiList
        });
    } catch (error) {
        console.error('Error di renderPrestasi:', error);
        req.flash('error', 'Gagal memuat halaman prestasi.');
        res.redirect('/');
    }
};

// ==================================================================
// 6. Halaman Detail Prestasi
// ==================================================================
module.exports.renderPrestasiDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const prestasi = await db.prestasi.findByPk(id);

        if (!prestasi) {
            req.flash('error', 'Prestasi tidak ditemukan.');
            return res.redirect('/prestasi');
        }

        // Ambil foto-foto prestasi
        let fotoFiles = [];
        if (prestasi.ID_GroupFoto) {
            const fotoList = await db.foto.findAll({
                where: { ID_GroupFoto: prestasi.ID_GroupFoto }
            });
            fotoFiles = fotoList.map(f => f.Foto);
        }

        // Ambil galeri info
        let groupFoto = null;
        let folder = 'prestasi'; // Default

        if (prestasi.ID_GroupFoto) {
             groupFoto = await db.groupfoto.findByPk(prestasi.ID_GroupFoto, {
                include: [
                    { model: db.product, as: 'products', attributes: ['ID_Product'] },
                    { model: db.kegiatan, as: 'kegiatans', attributes: ['ID_Kegiatan'] },
                    { model: db.prestasi, as: 'prestasis', attributes: ['ID_Prestasi'] }
                ]
            });

            // Logic determineFolder
            if (groupFoto) {
                if (groupFoto.products && groupFoto.products.length > 0) folder = 'produk';
                else if (groupFoto.kegiatans && groupFoto.kegiatans.length > 0) folder = 'kegiatan';
                else if (groupFoto.prestasis && groupFoto.prestasis.length > 0) folder = 'prestasi';
                else {
                     // Fallback nama
                     const lowerName = (groupFoto.Nama || '').toLowerCase();
                     if (lowerName.includes('kegiatan')) folder = 'kegiatan';
                     else if (lowerName.includes('produk') || lowerName.includes('spek')) folder = 'produk';
                     else if (lowerName.includes('prestasi')) folder = 'prestasi';
                     else if (lowerName.includes('anggota')) folder = 'anggota';
                     else folder = 'galeri';
                }
            }
        }

        res.render('public/prestasi_detail', {
            prestasi,
            fotoFiles,
            groupFoto,
            folder // Kirim folder ke view
        });
    } catch (error) {
        console.error('Error di renderPrestasiDetail:', error);
        req.flash('error', 'Gagal memuat detail prestasi.');
        res.redirect('/prestasi');
    }
};

// ==================================================================
// 7. Halaman List Anggota
// ==================================================================
module.exports.renderAnggota = async (req, res) => {
    try {
        // Ambil semua anggota (pengguna)
        const anggotaList = await db.pengguna.findAll({
            order: [['Nama', 'ASC']]
        });

        // Ambil foto untuk mapping
        const fotoIds = [...new Set(anggotaList.map(a => a.ID_Foto).filter(Boolean))];
        const fotoList = await db.foto.findAll({
            where: { ID_Foto: fotoIds }
        });
        const fotoMap = new Map(fotoList.map(f => [f.ID_Foto, f.Foto]));

        // Attach foto to anggota
        anggotaList.forEach(anggota => {
            anggota.dataValues.fotoFile = fotoMap.get(anggota.ID_Foto);
        });

        res.render('public/anggota', {
            anggotaList
        });
    } catch (error) {
        console.error('Error di renderAnggota:', error);
        req.flash('error', 'Gagal memuat halaman anggota.');
        res.redirect('/');
    }
};

// ==================================================================
// 8. Halaman Detail Anggota
// ==================================================================
module.exports.renderAnggotaDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const anggota = await db.pengguna.findByPk(id);

        if (!anggota) {
            req.flash('error', 'Anggota tidak ditemukan.');
            return res.redirect('/anggota');
        }

        // Ambil foto anggota
        if (anggota.ID_Foto) {
            const foto = await db.foto.findByPk(anggota.ID_Foto);
            if (foto) {
                anggota.dataValues.fotoFile = foto.Foto;
            }
        }

        res.render('public/anggota_detail', {
            anggota
        });
    } catch (error) {
        console.error('Error di renderAnggotaDetail:', error);
        req.flash('error', 'Gagal memuat detail anggota.');
        res.redirect('/anggota');
    }
};

// ==================================================================
// 9. Halaman Galeri
// ==================================================================
// ==================================================================
// 9. Halaman Galeri
// ==================================================================
module.exports.renderGaleri = async (req, res) => {
    try {
        // Helper determinasi folder (sama dengan admin/galeriController.js)
        const determineFolder = (group) => {
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

        // Ambil semua foto
        const fotoList = await db.foto.findAll({
            order: [['ID_Foto', 'DESC']]
        });

        // Ambil group foto BESERTA relasinya untuk deteksi folder yang akurat
        const groupFotoList = await db.groupfoto.findAll({
            include: [
                { model: db.product, as: 'products', attributes: ['ID_Product'] },
                { model: db.kegiatan, as: 'kegiatans', attributes: ['ID_Kegiatan'] },
                { model: db.prestasi, as: 'prestasis', attributes: ['ID_Prestasi'] }
            ],
            order: [['Nama', 'ASC']]
        });

        // Map Group ID -> { Nama, Folder }
        const groupInfoMap = new Map();
        groupFotoList.forEach(g => {
            groupInfoMap.set(g.ID_GroupFoto, {
                nama: g.Nama,
                folder: determineFolder(g)
            });
        });

        // Attach info to photo objects
        fotoList.forEach(foto => {
            const info = groupInfoMap.get(foto.ID_GroupFoto);
            if (info) {
                foto.dataValues.kategoriName = info.nama;
                foto.dataValues.folder = info.folder;
            } else {
                foto.dataValues.kategoriName = 'Umum';
                foto.dataValues.folder = 'galeri';
            }
        });

        res.render('public/galeri', {
            fotoList,
            groupFotoList
        });
    } catch (error) {
        console.error('Error di renderGaleri:', error);
        req.flash('error', 'Gagal memuat galeri.');
        res.redirect('/');
    }
};

// ==================================================================
// 10. Halaman Testimoni
// ==================================================================
module.exports.renderTestimoni = async (req, res) => {
    try {
        // Ambil semua testimoni (review)
        const testimoniList = await db.review.findAll({
            order: [['ID_Review', 'DESC']]
        });

        // Ambil data pengguna
        const penggunaIds = [...new Set(testimoniList.map(t => t.ID_Pengguna).filter(Boolean))];
        let penggunaList = [];
        if (penggunaIds.length > 0) {
            penggunaList = await db.pengguna.findAll({
                where: { ID_Pengguna: penggunaIds }
            });
        }

        // Ambil foto pengguna dengan info folder
        const fotoIds = [...new Set(penggunaList.map(p => p.ID_Foto).filter(Boolean))];
        let fotoList = [];
        if (fotoIds.length > 0) {
            fotoList = await db.foto.findAll({
                where: { ID_Foto: fotoIds },
                include: [{
                    model: db.groupfoto,
                    as: 'ID_GroupFoto_groupfoto',
                    include: [
                        { model: db.product, as: 'products', attributes: ['ID_Product'] },
                        { model: db.kegiatan, as: 'kegiatans', attributes: ['ID_Kegiatan'] },
                        { model: db.prestasi, as: 'prestasis', attributes: ['ID_Prestasi'] }
                    ]
                }]
            });
        }

        // Helper Folder
        const determineFolder = (group) => {
            if (!group) return 'galeri';
            if (group.products && group.products.length > 0) return 'produk';
            if (group.kegiatans && group.kegiatans.length > 0) return 'kegiatan';
            if (group.prestasis && group.prestasis.length > 0) return 'prestasi';
            
            const groupName = group.Nama || '';
            const lowerName = groupName.toLowerCase();
            if (lowerName.includes('kegiatan')) return 'kegiatan';
            if (lowerName.includes('produk') || lowerName.includes('spek')) return 'produk';
            if (lowerName.includes('prestasi')) return 'prestasi';
            if (lowerName.includes('anggota')) return 'anggota';
            
            return 'galeri';
        };

        const fotoMap = new Map(fotoList.map(f => {
            const group = f.ID_GroupFoto_groupfoto;
            const folder = determineFolder(group);
            return [f.ID_Foto, { filename: f.Foto, folder: folder }];
        }));

        // Create pengguna map
        const penggunaMap = new Map(penggunaList.map(p => [p.ID_Pengguna, p]));

        // Ambil nama produk dan kegiatan
        const produkIds = [...new Set(testimoniList.map(t => t.ID_Product).filter(Boolean))];
        const kegiatanIds = [...new Set(testimoniList.map(t => t.ID_Kegiatan).filter(Boolean))];

        let produkList = [];
        let kegiatanList = [];
        
        if (produkIds.length > 0) {
            produkList = await db.product.findAll({
                where: { ID_Product: produkIds }
            });
        }
        
        if (kegiatanIds.length > 0) {
            kegiatanList = await db.kegiatan.findAll({
                where: { ID_Kegiatan: kegiatanIds }
            });
        }

        const produkMap = new Map(produkList.map(p => [p.ID_Product, p.Nama]));
        const kegiatanMap = new Map(kegiatanList.map(k => [k.ID_Kegiatan, k.Judul]));

        // Attach data to testimoni
        testimoniList.forEach(testimoni => {
            const pengguna = penggunaMap.get(testimoni.ID_Pengguna);
            if (pengguna) {
                testimoni.dataValues.penggunaName = pengguna.Nama;
                const fotoInfo = fotoMap.get(pengguna.ID_Foto);
                if (fotoInfo) {
                    testimoni.dataValues.penggunaFoto = fotoInfo.filename;
                    testimoni.dataValues.penggunaFolder = fotoInfo.folder;
                } else {
                    testimoni.dataValues.penggunaFoto = null;
                    testimoni.dataValues.penggunaFolder = 'anggota';
                }
            }

            if (testimoni.Kategori === 'Product') {
                testimoni.dataValues.entityName = produkMap.get(testimoni.ID_Product);
            } else if (testimoni.Kategori === 'Kegiatan') {
                testimoni.dataValues.entityName = kegiatanMap.get(testimoni.ID_Kegiatan);
            }
        });

        res.render('public/testimoni', {
            testimoniList
        });
    } catch (error) {
        console.error('Error di renderTestimoni:', error);
        console.error('Error stack:', error.stack);
        req.flash('error', 'Gagal memuat testimoni.');
        res.redirect('/');
    }
};
    