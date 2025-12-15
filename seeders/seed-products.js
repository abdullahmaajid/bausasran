"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ensure there are groupfoto entries
    let [groupFotos] = await queryInterface.sequelize.query(
      "SELECT ID_GroupFoto FROM groupfoto"
    );
    if (!groupFotos || groupFotos.length === 0) {
      await queryInterface.bulkInsert(
        "groupfoto",
        [{ Nama: "Default Foto" }, { Nama: "Produk Utama" }],
        {}
      );
      [groupFotos] = await queryInterface.sequelize.query(
        "SELECT ID_GroupFoto FROM groupfoto"
      );
    }
    const groupFotoIds = groupFotos.map((r) => r.ID_GroupFoto);

    // Ensure there are groupparameter entries
    let [groupParams] = await queryInterface.sequelize.query(
      "SELECT ID_GroupParameter FROM groupparameter"
    );
    if (!groupParams || groupParams.length === 0) {
      await queryInterface.bulkInsert(
        "groupparameter",
        [
          { Nama: "Ukuran" },
          { Nama: "Warna" },
          { Nama: "Bahan" },
          { Nama: "Berat" },
        ],
        {}
      );
      [groupParams] = await queryInterface.sequelize.query(
        "SELECT ID_GroupParameter FROM groupparameter"
      );
    }
    const groupParamIds = groupParams.map((r) => r.ID_GroupParameter);

    // Helpers to generate varied data
    const categories = [
      "Pertanian",
      "Makanan",
      "Kerajinan",
      "Elektronik",
      "Pakaian",
      "Perkakas",
    ];
    const adjectives = [
      "Unggul",
      "Baru",
      "Premium",
      "Ekonomis",
      "Terlaris",
      "Rekomendasi",
    ];
    const nouns = ["Bibit", "Pupuk", "Alat", "Produk", "Aksesoris", "Komponen"];
    const descFragments = [
      "Kualitas terjamin.",
      "Cocok untuk penggunaan harian.",
      "Diolah dengan standar tinggi.",
      "Bahan ramah lingkungan.",
      "Garansi resmi dari produsen.",
      "Stok terbatas, segera pesan.",
    ];

    const products = [];
    for (let i = 1; i <= 50; i++) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const name = `${
        adjectives[Math.floor(Math.random() * adjectives.length)]
      } ${nouns[Math.floor(Math.random() * nouns.length)]} ${i}`;
      const desc = `${
        descFragments[Math.floor(Math.random() * descFragments.length)]
      } ${descFragments[Math.floor(Math.random() * descFragments.length)]}`;
      const price = (Math.floor(Math.random() * 1999000) + 10000).toFixed(2);
      const diskon = Number((Math.random() * 0.35).toFixed(3));
      const idFoto =
        groupFotoIds[Math.floor(Math.random() * groupFotoIds.length)];
      // Occasionally leave groupparameter null
      const idParam =
        Math.random() < 0.2
          ? null
          : groupParamIds[Math.floor(Math.random() * groupParamIds.length)];

      products.push({
        Nama: name,
        Deskripsi: desc,
        Harga: price,
        Diskon: diskon,
        Kategori: cat,
        ID_GroupFoto: idFoto,
        ID_GroupParameter: idParam,
      });
    }

    await queryInterface.bulkInsert("product", products, {});
  },

  down: async (queryInterface, Sequelize) => {
    // Remove products created by this seeder (Nama pattern ends with a number 1..50)
    const names = [];
    const adjectives = [
      "Unggul",
      "Baru",
      "Premium",
      "Ekonomis",
      "Terlaris",
      "Rekomendasi",
    ];
    const nouns = ["Bibit", "Pupuk", "Alat", "Produk", "Aksesoris", "Komponen"];
    for (let i = 1; i <= 50; i++) {
      for (const adj of adjectives) {
        for (const noun of nouns) {
          names.push(`${adj} ${noun} ${i}`);
        }
      }
    }
    await queryInterface.bulkDelete("product", { Nama: names }, {});
  },
};
