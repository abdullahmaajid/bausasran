// controllers/user/testimoniController.js

module.exports.renderTestimoni = async (req, res) => {
    try {
        // Ambil data testimoni yang pernah dibuat user ini (Contoh)
        const myTestimoni = await db.review.findAll({
            where: { ID_Pengguna: req.user.ID_Pengguna }
        });
        
        res.render('user/testimoni', {
            myTestimoni: myTestimoni
        });
    } catch (error) {
        req.flash('error', 'Gagal memuat halaman testimoni.');
        res.redirect('/');
    }
};