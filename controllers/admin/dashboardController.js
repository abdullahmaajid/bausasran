// controllers/admin/dashboardController.js

module.exports.renderDashboard = (req, res) => {
    // Anda bisa ambil data statistik di sini nanti
    // const totalUsers = await db.pengguna.count();
    
    res.render('admin/dashboard', {
        // Kirim data ke view jika perlu
        // totalUsers: totalUsers 
    });
};