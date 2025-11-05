// ISI YANG BENAR UNTUK: buatUser.js
// (Versi ini menggunakan 'mysql2' langsung dan mengambil input dari command line)

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
// Ambil konfigurasi dari file config.json
const config = require('./config/config.json')['development'];

// --- KONFIGURASI PENGGUNA BARU ---
// Ambil input dari argumen command line
// process.argv[0] = node
// process.argv[1] = buatUser.js
// process.argv[2] = NAMA
// process.argv[3] = USERNAME
// process.argv[4] = PASSWORD
const NAMA_USER = process.argv[2];
const USERNAME_USER = process.argv[3];
const PASSWORD_PLAIN = process.argv[4];
const ROLE_USER = "User"; // Role di-set 'User'
// --------------------------------

/**
 * Fungsi untuk membuat user baru (Role: User) dari command line.
 */
async function buatUser() {
  // 1. Validasi input
  if (!NAMA_USER || !USERNAME_USER || !PASSWORD_PLAIN) {
    console.error("========================================");
    console.error("❌ GAGAL: Input tidak lengkap.");
    console.error("Harap sediakan Nama, Username, dan Password.");
    console.error("\nCara penggunaan:");
    console.error("   node buatUser.js \"Nama Lengkap Anda\" usernameanda passwordanda");
    console.error("\nContoh:");
    console.error("   node buatUser.js \"Budi Santoso\" budi123 budi_rahasia");
    console.error("========================================");
    return; // Hentikan proses
  }

  console.log("Memulai proses pembuatan user...");
  let connection; // Definisikan koneksi di luar try-catch

  try {
    // 2. Buat koneksi ke database
    console.log(`Menghubungkan ke database '${config.database}'...`);
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database // INI PENTING!
    });
    console.log("Koneksi berhasil.");

    // 3. Cek apakah username sudah ada
    console.log(`Mengecek apakah user '${USERNAME_USER}' sudah ada...`);
    const [cekUser] = await connection.query(
      "SELECT * FROM pengguna WHERE username = ?",
      [USERNAME_USER]
    );

    if (cekUser.length > 0) {
      console.warn("========================================");
      console.warn(`PERINGATAN: Username '${USERNAME_USER}' sudah terdaftar.`);
      console.warn("Gunakan username lain.");
      console.warn("Proses dihentikan.");
      console.warn("========================================");
      return; // Hentikan proses
    }

    // 4. Jika belum ada, hash password
    console.log(`User belum ada. Menghash password: '${PASSWORD_PLAIN}'...`);
    const hashedPassword = await bcrypt.hash(PASSWORD_PLAIN, 10);
    console.log("Password berhasil di-hash.");

    // 5. Masukkan ke database
    console.log("Menyimpan user ke database...");
    const query = `
      INSERT INTO pengguna (Nama, username, password, Role, Jabatan) 
      VALUES (?, ?, ?, ?, ?)
    `;

    await connection.query(query, [
      NAMA_USER,
      USERNAME_USER,
      hashedPassword,
      ROLE_USER,
      "User" // Jabatan (opsional, bisa di-set 'User' atau 'Anggota')
    ]);

    console.log("\n========================================");
    console.log("✅ SUKSES!");
    console.log(`User '${ROLE_USER}' berhasil dibuat.`);
    console.log("Silakan login dengan kredensial berikut:");
    console.log(`   Nama: ${NAMA_USER}`);
    console.log(`   Username: ${USERNAME_USER}`);
    console.log(`   Password: ${PASSWORD_PLAIN}`);
    console.log("========================================");

  } catch (error) {
    console.error("\n❌ GAGAL: Terjadi kesalahan saat membuat user:");
    console.error(error.message);
    // Jika error karena tabel 'pengguna' belum ada, beri petunjuk
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error("-> (Error: Tabel 'pengguna' tidak ditemukan. Pastikan Anda sudah menjalankan server 'npm run dev' setidaknya sekali untuk sinkronisasi tabel).");
    }
  } finally {
    // 6. Tutup koneksi database agar script bisa berhenti
    if (connection) {
      await connection.end();
      console.log("\nKoneksi database ditutup.");
    }
  }
}

// Panggil fungsi utamanya
buatUser();