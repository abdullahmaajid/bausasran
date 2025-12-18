"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ensure groupfoto exists (needed for kegiatan/product)
    let [groupFotos] = await queryInterface.sequelize.query(
      "SELECT ID_GroupFoto FROM groupfoto"
    );
    if (!groupFotos || groupFotos.length === 0) {
      await queryInterface.bulkInsert(
        "groupfoto",
        [{ Nama: "Default Foto" }],
        {}
      );
      [groupFotos] = await queryInterface.sequelize.query(
        "SELECT ID_GroupFoto FROM groupfoto"
      );
    }
    const groupFotoIds = groupFotos.map((r) => r.ID_GroupFoto);

    // Ensure groupsection exists (needed for kegiatan)
    let [groupSections] = await queryInterface.sequelize.query(
      "SELECT ID_GroupSection FROM groupsection"
    );
    if (!groupSections || groupSections.length === 0) {
      await queryInterface.bulkInsert(
        "groupsection",
        [{ Nama: "Default Section" }],
        {}
      );
      [groupSections] = await queryInterface.sequelize.query(
        "SELECT ID_GroupSection FROM groupsection"
      );
    }
    const groupSectionIds = groupSections.map((r) => r.ID_GroupSection);

    // Ensure pengguna (users) exist
    let [users] = await queryInterface.sequelize.query(
      "SELECT ID_Pengguna FROM pengguna"
    );
    if (!users || users.length === 0) {
      const seedUsers = [];
      for (let i = 1; i <= 10; i++) {
        seedUsers.push({
          Nama: `User ${i}`,
          Jabatan: `Tester`,
          Deskripsi: `Pengguna untuk seeder review`,
          Role: "User",
          password: "password",
          username: `user${i}`,
        });
      }
      await queryInterface.bulkInsert("pengguna", seedUsers, {});
      [users] = await queryInterface.sequelize.query(
        "SELECT ID_Pengguna FROM pengguna"
      );
    }
    const userIds = users.map((r) => r.ID_Pengguna);

    // Ensure there are some products
    let [products] = await queryInterface.sequelize.query(
      "SELECT ID_Product FROM product"
    );
    if (!products || products.length === 0) {
      const seedProducts = [];
      for (let i = 1; i <= 10; i++) {
        seedProducts.push({
          Nama: `Seed Product ${i}`,
          Deskripsi: `Produk dummy untuk seeder review`,
          Harga: (10000 + i * 5000).toFixed(2),
          Diskon: 0.0,
          Kategori: "Seed",
          ID_GroupFoto: groupFotoIds[0],
          ID_GroupParameter: null,
        });
      }
      await queryInterface.bulkInsert("product", seedProducts, {});
      [products] = await queryInterface.sequelize.query(
        "SELECT ID_Product FROM product"
      );
    }
    const productIds = products.map((r) => r.ID_Product);

    // Ensure there are some kegiatan
    let [kegiatans] = await queryInterface.sequelize.query(
      "SELECT ID_Kegiatan FROM kegiatan"
    );
    if (!kegiatans || kegiatans.length === 0) {
      const seedKeg = [];
      const today = new Date().toISOString().slice(0, 10);
      for (let i = 1; i <= 5; i++) {
        seedKeg.push({
          Judul: `Seed Kegiatan ${i}`,
          Tanggal: today,
          Kategori: "Seed",
          Status: "Past",
          ID_GroupFoto: groupFotoIds[0],
          ID_GroupSection: groupSectionIds[0],
        });
      }
      await queryInterface.bulkInsert("kegiatan", seedKeg, {});
      [kegiatans] = await queryInterface.sequelize.query(
        "SELECT ID_Kegiatan FROM kegiatan"
      );
    }
    const kegiatanIds = kegiatans.map((r) => r.ID_Kegiatan);

    // Prepare review data
    const fragments = [
      "Sangat memuaskan.",
      "Kualitas sesuai harapan.",
      "Pengiriman cepat.",
      "Rekomendasi untuk dibeli.",
      "Harga sebanding dengan kualitas.",
      "Pelayanan ramah.",
    ];

    const reviews = [];
    for (let i = 1; i <= 50; i++) {
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const rating = Math.floor(Math.random() * 5) + 1;
      const kategori = Math.random() < 0.6 ? "Product" : "Kegiatan";
      const ulasan = `SEED_TESTIMONI ${i}: ${
        fragments[Math.floor(Math.random() * fragments.length)]
      } ${fragments[Math.floor(Math.random() * fragments.length)]}`;

      const review = {
        Ulasan: ulasan,
        Rating: rating,
        Kategori: kategori,
        ID_Pengguna: userId,
        ID_Product: null,
        ID_Kegiatan: null,
      };

      if (kategori === "Product") {
        review.ID_Product =
          productIds[Math.floor(Math.random() * productIds.length)];
      } else {
        review.ID_Kegiatan =
          kegiatanIds[Math.floor(Math.random() * kegiatanIds.length)];
      }

      reviews.push(review);
    }

    await queryInterface.bulkInsert("review", reviews, {});
  },

  down: async (queryInterface, Sequelize) => {
    // Remove seeded reviews by the marker text
    await queryInterface.bulkDelete(
      "review",
      {
        Ulasan: { [Sequelize.Op.like]: "SEED_TESTIMONI %" },
      },
      {}
    );
  },
};
