import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

const productColumns = {
  brand: { type: DataTypes.STRING(80), allowNull: true },
  barcode: { type: DataTypes.STRING(80), allowNull: true },
  purchasePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  sellingPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  supplier: { type: DataTypes.STRING(120), allowNull: true },
  imageUrl: { type: DataTypes.STRING(255), allowNull: true }
};

export async function ensureInventorySchema() {
  const queryInterface = sequelize.getQueryInterface();
  const productTable = await queryInterface.describeTable("Products");
  let addedSellingPrice = false;
  for (const [column, definition] of Object.entries(productColumns)) {
    if (!productTable[column]) {
      await queryInterface.addColumn("Products", column, definition);
      if (column === "sellingPrice") addedSellingPrice = true;
    }
  }
  if (addedSellingPrice) {
    await sequelize.query("UPDATE Products SET sellingPrice = unitPrice WHERE unitPrice > 0");
  }

  const movementTable = await queryInterface.describeTable("StockMovements");
  if (!movementTable.UserId) {
    await queryInterface.addColumn("StockMovements", "UserId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  }
}
