// controllers/public/authController.js

const db = require('../../models');
const bcrypt = require('bcrypt');

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

// 2. Menampilkan halaman register
module.exports.renderRegister = (req, res) => {
    if (req.isAuthenticated()) {
        req.flash('error', 'Anda sudah login.');
        return res.redirect('/');
    }
    res.render('public/register');
};

// 3. Memproses pendaftaran
module.exports.registerUser = async (req, res) => {
    try {
        const { Nama, Username, Password, ConfirmPassword, Deskripsi } = req.body;

        // Validasi input
        if (!Nama || !Username || !Password || !ConfirmPassword) {
            req.flash('error', 'Nama, Username, dan Password wajib diisi.');
            return res.redirect('/register');
        }

        // Validasi password match
        if (Password !== ConfirmPassword) {
            req.flash('error', 'Password dan Konfirmasi Password tidak cocok.');
            return res.redirect('/register');
        }

        // Validasi panjang password
        if (Password.length < 6) {
            req.flash('error', 'Password minimal 6 karakter.');
            return res.redirect('/register');
        }

        // Cek username sudah ada atau belum (field username huruf kecil di database)
        const existingUser = await db.pengguna.findOne({ where: { username: Username } });
        if (existingUser) {
            req.flash('error', 'Username sudah digunakan. Silakan pilih username lain.');
            return res.redirect('/register');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(Password, 10);

        // Buat user baru dengan role User
        await db.pengguna.create({
            Nama: Nama,
            username: Username,  // Field di database huruf kecil
            password: hashedPassword,  // Field di database huruf kecil
            Role: 'User',  // Default role adalah User
            Jabatan: null,
            Deskripsi: Deskripsi || null,
            ID_Foto: null
        });

        req.flash('success', 'Pendaftaran berhasil! Silakan login.');
        res.redirect('/login');

    } catch (error) {
        console.error('Error saat register:', error);
        req.flash('error', 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
        res.redirect('/register');
    }
};

// 4. Menampilkan halaman lupa password
module.exports.renderLupaPassword = (req, res) => {
    res.render('public/lupa-password');
};

// 5. Memproses lupa password (reset password)
module.exports.resetPassword = async (req, res) => {
    try {
        const { Username, Nama, NewPassword, ConfirmPassword } = req.body;

        // Validasi input
        if (!Username || !Nama || !NewPassword || !ConfirmPassword) {
            req.flash('error', 'Semua field wajib diisi.');
            return res.redirect('/lupa-password');
        }

        // Validasi password match
        if (NewPassword !== ConfirmPassword) {
            req.flash('error', 'Password baru dan Konfirmasi Password tidak cocok.');
            return res.redirect('/lupa-password');
        }

        // Validasi panjang password
        if (NewPassword.length < 6) {
            req.flash('error', 'Password minimal 6 karakter.');
            return res.redirect('/lupa-password');
        }

        // Cari user berdasarkan username dan nama (sebagai verifikasi)
        const user = await db.pengguna.findOne({ 
            where: { 
                username: Username,
                Nama: Nama 
            } 
        });

        if (!user) {
            req.flash('error', 'Username atau Nama tidak cocok.');
            return res.redirect('/lupa-password');
        }

        // Hash password baru
        const hashedPassword = await bcrypt.hash(NewPassword, 10);

        // Update password (field di database huruf kecil)
        await user.update({ password: hashedPassword });

        req.flash('success', 'Password berhasil direset! Silakan login dengan password baru.');
        res.redirect('/login');

    } catch (error) {
        console.error('Error saat reset password:', error);
        req.flash('error', 'Terjadi kesalahan. Silakan coba lagi.');
        res.redirect('/lupa-password');
    }
};

// 6. Memproses Logout
module.exports.logoutUser = (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success', 'Anda berhasil logout.');
        res.redirect('/');
    });
};