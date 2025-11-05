// middleware/multerProdukSingleStorage.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'public/images/produk';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Buat nama unik (bisa pakai ID produk + timestamp, atau cara lain)
    const productId = req.params.id || 'produk'; // Ambil ID produk dari parameter rute
    const timestamp = Date.now();
    const uniqueSuffix = `edit-${productId}-${timestamp}`;
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true);
  } else {
    cb(new Error('Hanya file .jpeg, .jpg, atau .png yang diizinkan!'), false);
  }
};

const uploadProdukSingle = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
});

// Middleware untuk satu file
// 'editedPhoto' adalah nama yang akan kita gunakan di FormData JavaScript
module.exports = uploadProdukSingle.single('editedPhoto');