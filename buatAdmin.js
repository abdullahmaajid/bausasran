// ISI YANG BENAR UNTUK: buatAdmin.js
// (Versi ini menggunakan 'mysql2' langsung, seperti dbInit.js)

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
// Ambil konfigurasi dari file config.json
const config = require('./config/config.json')['development'];

// --- KONFIGURASI ADMIN ---
const NAMA_ADMIN = "Administrator";
const USERNAME_ADMIN = "admin123";
const PASSWORD_PLAIN = "admin123"; // Ganti ini jika mau
const ROLE_ADMIN = "Admin";
// -------------------------

/**
 * Fungsi untuk membuat user admin pertama kali.
 */
async function buatUserAdmin() {
  console.log("Memulai proses pembuatan admin...");

  let connection; // Definisikan koneksi di luar try-catch

  try {
    // 1. Buat koneksi ke database (termasuk nama databasenya)
    // Berbeda dengan dbInit, kita sekarang menghubungkan ke DB 'bausasran'
    console.log(`Menghubungkan ke database '${config.database}'...`);
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database // INI PENTING!
    });
    console.log("Koneksi berhasil.");

    // 2. Cek apakah user admin sudah ada
    console.log(`Mengecek apakah user '${USERNAME_ADMIN}' sudah ada...`);
    const [cekUser] = await connection.query(
      "SELECT * FROM pengguna WHERE username = ?",
      [USERNAME_ADMIN]
    );

    if (cekUser.length > 0) {
      console.warn("========================================");
      console.warn("PERINGATAN: User admin sudah ada.");
      console.warn(`Username: ${cekUser[0].username}`);
      console.warn("Proses dihentikan.");
      console.warn("========================================");
      return; // Hentikan proses
    }

    // 3. Jika belum ada, hash password
    console.log(`User belum ada. Menghash password: '${PASSWORD_PLAIN}'...`);
    const hashedPassword = await bcrypt.hash(PASSWORD_PLAIN, 10);
    console.log("Password berhasil di-hash.");

    // 4. Masukkan ke database
    console.log("Menyimpan user ke database...");
    const query = `
      INSERT INTO pengguna (Nama, username, password, Role, Jabatan) 
      VALUES (?, ?, ?, ?, ?)
    `;

    await connection.query(query, [
      NAMA_ADMIN,
      USERNAME_ADMIN,
      hashedPassword,
      ROLE_ADMIN,
      "Pengelola Sistem" // Jabatan (opsional)
    ]);

    console.log("\n========================================");
    console.log("✅ SUKSES!");
    console.log("User admin berhasil dibuat.");
    console.log("Silakan login dengan kredensial berikut:");
    console.log(`   Username: ${USERNAME_ADMIN}`);
    console.log(`   Password: ${PASSWORD_PLAIN}`);
    console.log("========================================");

  } catch (error) {
    console.error("\n❌ GAGAL: Terjadi kesalahan saat membuat user admin:");
    console.error(error.message);
    // Jika error karena tabel 'pengguna' belum ada, beri petunjuk
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error("-> (Error: Tabel 'pengguna' tidak ditemukan. Pastikan Anda sudah menjalankan migrasi Sequelize/membuat tabel).");
    }
  } finally {
    // 5. Tutup koneksi database agar script bisa berhenti
    if (connection) {
      await connection.end();
      console.log("\nKoneksi database ditutup.");
    }
  }
}

// Panggil fungsi utamanya
buatUserAdmin();