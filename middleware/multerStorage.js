// middleware/multerStorage.js

const multer = require('multer');
const path = require('path');

// Tentukan lokasi penyimpanan
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Path folder penyimpanan
    cb(null, 'public/images/anggota'); 
  },
  filename: function (req, file, cb) {
    // Buat nama file unik: nama-anggota-timestamp.extensi
    // Ambil nama dari form body
    const namaAnggota = req.body.nama ? req.body.nama.toLowerCase().replace(/ /g, '-') : 'anggota';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname); // .png, .jpg
    
    cb(null, `${namaAnggota}-${timestamp}${ext}`);
  }
});

// Filter file (hanya izinkan gambar)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true); // Terima file
  } else {
    // Tolak file dan kirim error (akan ditangkap controller)
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

module.exports = upload;