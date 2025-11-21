// middleware/multerGaleriStorage.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pastikan folder tujuan ada
const uploadDir = 'public/images/galeri';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Simpan ke public/images/galeri/
  },
  filename: function (req, file, cb) {
    // Gunakan nama group atau 'galeri' sebagai prefix
    const groupName = (req.body.groupName || 'galeri')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
    const timestamp = Date.now();
    const uniqueSuffix = `${groupName}-${timestamp}`;
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

const uploadGaleri = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Limit 5MB per file
  }
});

// Export untuk multiple files (max 20)
module.exports = uploadGaleri.array('fotoGaleri', 20);
