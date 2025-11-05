// middleware/auth.js

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        // Simpan halaman yang ingin diakses user
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'Anda harus login terlebih dahulu.');
        return res.redirect('/login');
    }
    next();
};

module.exports.isAdmin = (req, res, next) => {
    if (req.user.Role !== 'Admin') {
        req.flash('error', 'Akses ditolak. Halaman ini khusus Admin.');
        return res.redirect('/'); // Redirect ke halaman utama
    }
    next();
};

module.exports.isUser = (req, res, next) => {
    if (req.user.Role !== 'User') {
        req.flash('error', 'Akses ditolak.');
        return res.redirect('/'); // Redirect ke halaman utama
    }
    next();
};

// Middleware ini akan mengarahkan user setelah login
// Sesuai permintaan: Admin ke dashboard, User ke testimoni
module.exports.checkReturnTo = (req, res, next) => {
    let returnTo = req.session.returnTo; // Cek jika ada halaman tersimpan

    // Jika tidak ada halaman tersimpan, tentukan default berdasarkan Role
    if (!returnTo) {
        if (req.user.Role === 'Admin') {
            returnTo = '/admin/dashboard';
        } else if (req.user.Role === 'User') {
            returnTo = '/user/testimoni';
        } else {
            returnTo = '/'; // Fallback
        }
    }
    
    delete req.session.returnTo; // Hapus session 'returnTo'
    res.redirect(returnTo);
};