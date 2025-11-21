// controllers/public/authControllers.js

// 1. Menampilkan halaman login
module.exports.renderLogin = (req, res) => {
    if (req.isAuthenticated()) {
        req.flash('error', 'Anda sudah login.');
        // Jika sudah login, redirect sesuai role
        if (req.user.Role === 'Admin') return res.redirect('/admin/dashboard');
        if (req.user.Role === 'User') return res.redirect('/user/dashboard');
        return res.redirect('/');
    }
    res.render('public/login');
};

// 2. Memproses Logout
module.exports.logoutUser = (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success', 'Anda berhasil logout.');
        res.redirect('/');
    });
};