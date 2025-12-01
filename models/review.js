const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('review', {
    ID_Review: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    Ulasan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    Rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    Kategori: {
      type: DataTypes.ENUM('Product','Kegiatan'),
      allowNull: false
    },
    ID_Pengguna: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pengguna',
        key: 'ID_Pengguna'
      }
    },
    ID_Product: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'product',
        key: 'ID_Product'
      }
    },
    ID_Kegiatan: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'kegiatan',
        key: 'ID_Kegiatan'
      }
    }
  }, {
    sequelize,
    tableName: 'review',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "ID_Review" },
        ]
      },
      {
        name: "ID_Pengguna",
        using: "BTREE",
        fields: [
          { name: "ID_Pengguna" },
        ]
      },
      {
        name: "ID_Product",
        using: "BTREE",
        fields: [
          { name: "ID_Product" },
        ]
      },
      {
        name: "ID_Kegiatan",
        using: "BTREE",
        fields: [
          { name: "ID_Kegiatan" },
        ]
      },
    ]
  });
};
