// controllers/api/parameterController.js
const db = require('../../models');

// Mengambil data parameter (Min/Max) dari DB
module.exports.getParameters = async (req, res) => {
    try {
        const { id } = req.params; // id = ID_GroupParameter
        
        const parameterList = await db.parameter.findAll({
            where: { ID_GroupParameter: id }
        });

        if (!parameterList || parameterList.length === 0) {
            return res.status(404).json({ error: 'Data parameter tidak ditemukan.' });
        }

        // Kirim data sebagai JSON
        res.json(parameterList);

    } catch (error) {
        console.error("Error API getParameters:", error);
        res.status(500).json({ error: 'Gagal mengambil data parameter.' });
    }
};