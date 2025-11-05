// middleware/multerPrestasiStorage.js

const multer = require('multer');
const path = require('path');

// Tentukan lokasi penyimpanan
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Path folder penyimpanan FOTO PRESTASI
    cb(null, 'public/images/prestasi'); 
  },
  filename: function (req, file, cb) {
    // Buat nama file unik: [judul-prestasi]-[timestamp]-[random].extensi
    const judul = req.body.Judul ? req.body.Judul.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30) : 'prestasi';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const random = Math.floor(Math.random() * 1000);
    
    cb(null, `${judul}-${timestamp}-${random}${ext}`);
  }
});

// Filter file (hanya izinkan gambar)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true); // Terima file
  } else {
    cb(new Error('Hanya file .jpeg, .jpg, atau .png yang diizinkan!'), false); 
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Batas 5MB per file
  }
});

// Kita export .array() karena satu prestasi punya BANYAK foto (sertifikat/dokumentasi)
// 'fotoPrestasi' adalah 'name' dari input <input type="file" name="fotoPrestasi" multiple>
// GANTI DENGAN BARIS INI:
module.exports = upload;