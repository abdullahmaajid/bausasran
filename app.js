// 1. IMPORT DEPENDENSI
if (process.env.NODE_ENV !== "production") {
    require('dotenv').config(); // Panggil dotenv di paling atas
}

const express = require('express');
const app = express();
const path = require('path');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

// 2. IMPORT LOKAL
const initializeDatabase = require('./config/dbInit');
const seedDatabase = require('./config/seeder');
const db = require('./models');
const { pengguna } = db; // Ambil model pengguna
const authMiddleware = require('./middleware/auth'); // Impor middleware

// Impor Rute
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth'); // Rute baru untuk /login, /logout
const adminRoutes = require('./routes/admin'); // Rute baru untuk /admin/*
const userRoutes = require('./routes/user');   // Rute baru untuk /user/*
const apiRoutes = require('./routes/api');
// 3. KONFIGURASI EJS (VIEW ENGINE)
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. KONFIGURASI MIDDLEWARE DASAR
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 5. KONFIGURASI SESSION
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'fallbacksecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true, // (Aktifkan 'secure: true' saat deploy ke HTTPS)
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 hari
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};
app.use(session(sessionConfig));

// 6. KONFIGURASI PASSPORT & FLASH
app.use(flash());
app.use(passport.initialize());
app.use(passport.session()); // Harus setelah app.use(session(...))

// Konfigurasi Strategi Login (Passport)
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await pengguna.findOne({ where: { username: username } });
            
            // 1. Cek jika user tidak ditemukan
            if (!user) {
                return done(null, false, { message: 'Username tidak ditemukan.' });
            }
            
            // 2. Cek password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return done(null, false, { message: 'Password salah.' });
            }
            
            // 3. Jika berhasil
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

// Menyimpan user ke dalam session
passport.serializeUser((user, done) => {
    done(null, user.ID_Pengguna);
});

// Mengambil user dari session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await pengguna.findByPk(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// ==================================================================
// 7. MIDDLEWARE GLOBAL (Res.locals) - INI SOLUSINYA
// ==================================================================
// Ini akan mengirimkan data ke SEMUA views
app.use((req, res, next) => {
    // Info user yang sedang login (jika ada) akan tersedia di 'currentUser'
    res.locals.currentUser = req.user; 
    res.locals.success_flash = req.flash('success'); // Pesan sukses
    res.locals.error_flash = req.flash('error');     // Pesan error
    next();
});
// ==================================================================


// 8. MENGHUBUNGKAN RUTE (ROUTING)
// (Pastikan ini ada SETELAH Bagian 7)
app.use('/', publicRoutes);
app.use('/', authRoutes); // Menggunakan rute auth ( /login, /logout )
// Rute Admin (Diproteksi)
app.use('/admin', authMiddleware.isLoggedIn, authMiddleware.isAdmin, adminRoutes);
// Rute User (Diproteksi)
app.use('/user', authMiddleware.isLoggedIn, authMiddleware.isUser, userRoutes);
app.use('/api', apiRoutes); // (Pastikan ini sebelum error handler)

// 9. ERROR HANDLER (Sederhana)
// 9. ERROR HANDLER (Sederhana) - DIPERBAIKI
app.use((err, req, res, next) => {
    console.error(err.stack);
    req.flash('error', err.message || 'Terjadi kesalahan pada server.');
    
    // JANGAN GUNAKAN 'back' KARENA BISA GAGAL
    // res.redirect('back');
    
    // GANTI DENGAN HALAMAN YANG PASTI ADA (cth: Homepage)
    res.redirect('/');
});

// 10. FUNGSI START SERVER
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ [SERVER 1/4] Inisialisasi Database Selesai.');

    await db.sequelize.sync({ alter: true });
    console.log('✅ [SERVER 2/4] Sinkronisasi Model & Tabel Selesai.');

    await seedDatabase();
    console.log('✅ [SERVER 3/4] Pengecekan Data Awal (Seed) Selesai.');
    
    await db.sequelize.authenticate();
    console.log('✅ [SERVER 4/4] Koneksi Sequelize ke database berhasil.');
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ GAGAL TOTAL memulai server:', error);
    process.exit(1); 
  }
}

// 11. JALANKAN SERVER
startServer();