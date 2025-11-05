// middleware/multerKegiatanStorage.js

const multer = require('multer');
const path = require('path');

// Tentukan lokasi penyimpanan
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Path folder penyimpanan FOTO KEGIATAN
    cb(null, 'public/images/kegiatan'); 
  },
  filename: function (req, file, cb) {
    // Buat nama file unik: judul-kegiatan-timestamp-random.extensi
    const judul = req.body.Judul ? req.body.Judul.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30) : 'kegiatan';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname); // .png, .jpg
    const random = Math.floor(Math.random() * 1000); // Penomoran acak
    
    // Format: [judul]-[timestamp]-[random].[ext]
    cb(null, `${judul}-${timestamp}-${random}${ext}`);
  }
});

// Filter file (hanya izinkan gambar)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true); // Terima file
  } else {
    // Tolak file dan kirim error
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

// Kita export .array() karena satu kegiatan punya BANYAK foto (galeri)
// 'fotoKegiatan' adalah 'name' dari input <input type="file" name="fotoKegiatan" multiple>
// Angka '10' adalah batas maksimal file per sekali upload
module.exports = upload;