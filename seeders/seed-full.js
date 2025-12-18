"use strict";

const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Ensure Dependencies Exist (GroupFoto, GroupParameter, GroupSection)
    
    // GroupFoto
    let [groupFotos] = await queryInterface.sequelize.query("SELECT ID_GroupFoto FROM groupfoto");
    if (!groupFotos || groupFotos.length === 0) {
      await queryInterface.bulkInsert("groupfoto", [{ Nama: "General" }], {});
      [groupFotos] = await queryInterface.sequelize.query("SELECT ID_GroupFoto FROM groupfoto");
    }
    const groupFotoIds = groupFotos.map(r => r.ID_GroupFoto);

    // GroupParameter
    let [groupParams] = await queryInterface.sequelize.query("SELECT ID_GroupParameter FROM groupparameter");
    if (!groupParams || groupParams.length === 0) {
      await queryInterface.bulkInsert("groupparameter", [{ Nama: "Standard" }], {});
      [groupParams] = await queryInterface.sequelize.query("SELECT ID_GroupParameter FROM groupparameter");
    }
    const groupParamIds = groupParams.map(r => r.ID_GroupParameter);

    // GroupSection
    let [groupSections] = await queryInterface.sequelize.query("SELECT ID_GroupSection FROM groupsection");
    if (!groupSections || groupSections.length === 0) {
      await queryInterface.bulkInsert("groupsection", [{ Nama: "Main Section" }], {});
      [groupSections] = await queryInterface.sequelize.query("SELECT ID_GroupSection FROM groupsection");
    }
    const groupSectionIds = groupSections.map(r => r.ID_GroupSection);


    // 2. Generate Users (Pengguna)
    console.log("Generating 50 Users...");
    const users = [];
    const passwordHash = await bcrypt.hash("password123", 10); // Standard password for all dummy users

    for (let i = 1; i <= 50; i++) {
        users.push({
            Nama: `User Dummy ${i}`,
            username: `userdummy${i}`,
            password: passwordHash,
            Role: 'User',
            Jabatan: 'Warga',
            Deskripsi: `Akun dummy untuk testing nomor ${i}`
        });
    }
    await queryInterface.bulkInsert("pengguna", users, {});
    
    // Fetch inserted users to get IDs
    const [insertedUsers] = await queryInterface.sequelize.query("SELECT ID_Pengguna FROM pengguna WHERE username LIKE 'userdummy%'");
    const userIds = insertedUsers.map(u => u.ID_Pengguna);


    // 3. Generate Products
    console.log("Generating 50 Products...");
    const products = [];
    const prodCategories = ["Pertanian", "Makanan", "Kerajinan", "Bibit", "Pupuk"];
    
    for (let i = 1; i <= 50; i++) {
        products.push({
            Nama: `Produk Dummy ${i}`,
            Deskripsi: `Deskripsi lengkap untuk produk dummy ${i}. Produk ini sangat berkualitas.`,
            Harga: (Math.random() * 500000 + 10000).toFixed(2),
            Diskon: (Math.random() * 0.5).toFixed(2),
            Kategori: prodCategories[Math.floor(Math.random() * prodCategories.length)],
            ID_GroupFoto: groupFotoIds[Math.floor(Math.random() * groupFotoIds.length)],
            ID_GroupParameter: groupParamIds[Math.floor(Math.random() * groupParamIds.length)]
        });
    }
    await queryInterface.bulkInsert("product", products, {});

    // Fetch inserted products
    const [insertedProducts] = await queryInterface.sequelize.query("SELECT ID_Product FROM product WHERE Nama LIKE 'Produk Dummy%'");
    const productIds = insertedProducts.map(p => p.ID_Product);


    // 4. Generate Activities (Kegiatan)
    console.log("Generating 50 Activities...");
    const activities = [];
    const activityStatuses = ['Upcoming', 'Past'];
    const activityCategories = ['Sosial', 'Budaya', 'Lingkungan', 'Edukasi'];

    for (let i = 1; i <= 50; i++) {
        const isPast = Math.random() > 0.3; // 70% chance of past
        const date = new Date();
        date.setDate(date.getDate() + (isPast ? -Math.floor(Math.random() * 365) : Math.floor(Math.random() * 60)));

        activities.push({
            Judul: `Kegiatan Dummy ${i}`,
            Tanggal: date.toISOString().split('T')[0],
            Kategori: activityCategories[Math.floor(Math.random() * activityCategories.length)],
            Status: isPast ? 'Past' : 'Upcoming',
            ID_GroupFoto: groupFotoIds[Math.floor(Math.random() * groupFotoIds.length)],
            ID_GroupSection: groupSectionIds[Math.floor(Math.random() * groupSectionIds.length)]
        });
    }
    await queryInterface.bulkInsert("kegiatan", activities, {});

    // Fetch inserted activities
    const [insertedActivities] = await queryInterface.sequelize.query("SELECT ID_Kegiatan FROM kegiatan WHERE Judul LIKE 'Kegiatan Dummy%'");
    const activityIds = insertedActivities.map(a => a.ID_Kegiatan);


    // 5. Generate Testimonials (Review)
    console.log("Generating 50 Testimonials...");
    const reviews = [];
    const ratingComments = [
        "Sangat bagus!", "Lumayan, tapi bisa ditingkatkan.", "Luar biasa, sangat puas.", 
        "Cukup oke.", "Mantap jiwa!", "Rekomended banget.", "Biasa aja sih.", "Keren!"
    ];

    for (let i = 1; i <= 50; i++) {
        const isProductReview = Math.random() > 0.5;
        const targetId = isProductReview 
            ? (productIds.length > 0 ? productIds[Math.floor(Math.random() * productIds.length)] : null)
            : (activityIds.length > 0 ? activityIds[Math.floor(Math.random() * activityIds.length)] : null);

        if (targetId && userIds.length > 0) {
            reviews.push({
                Ulasan: ratingComments[Math.floor(Math.random() * ratingComments.length)] + ` (Review #${i})`,
                Rating: Math.floor(Math.random() * 5) + 1,
                Kategori: isProductReview ? 'Product' : 'Kegiatan',
                ID_Pengguna: userIds[Math.floor(Math.random() * userIds.length)],
                ID_Product: isProductReview ? targetId : null,
                ID_Kegiatan: !isProductReview ? targetId : null
            });
        }
    }
    
    if (reviews.length > 0) {
        await queryInterface.bulkInsert("review", reviews, {});
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Delete in reverse order of creation
    await queryInterface.bulkDelete("review", { Ulasan: { [Sequelize.Op.like]: '%(Review #%)' } }, {});
    await queryInterface.bulkDelete("kegiatan", { Judul: { [Sequelize.Op.like]: 'Kegiatan Dummy%' } }, {});
    await queryInterface.bulkDelete("product", { Nama: { [Sequelize.Op.like]: 'Produk Dummy%' } }, {});
    await queryInterface.bulkDelete("pengguna", { username: { [Sequelize.Op.like]: 'userdummy%' } }, {});
  },
};
