import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Product = sequelize.define("Product", {
  sku: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  category: { type: DataTypes.STRING(60), allowNull: false },
  brand: { type: DataTypes.STRING(80), allowNull: true },
  barcode: { type: DataTypes.STRING(80), allowNull: true },
  unit: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pcs" },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  reorderLevel: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 5 },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  purchasePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  sellingPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  supplier: { type: DataTypes.STRING(120), allowNull: true },
  imageUrl: { type: DataTypes.STRING(255), allowNull: true },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});
