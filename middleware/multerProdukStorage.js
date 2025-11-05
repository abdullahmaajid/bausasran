// middleware/multerProdukStorage.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the destination directory exists
const uploadDir = 'public/images/produk';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Save to public/images/produk/
  },
  filename: function (req, file, cb) {
    // Sanitize product name for filename part
    const productNameSafe = (req.body.Nama || 'produk')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphen
        .replace(/-+/g, '-');      // Replace multiple hyphens with one
    const timestamp = Date.now();
    const uniqueSuffix = `${productNameSafe}-${timestamp}`;
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

const uploadProduk = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB limit per file
  }
});

// Middleware for multiple files (e.g., up to 10)
// 'productImages' is the name attribute of the file input in the form
module.exports = uploadProduk.array('productImages', 10);