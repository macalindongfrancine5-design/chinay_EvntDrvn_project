import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";
import { Product } from "./productModel.js";
import { User } from "./userModel.js";

export const StockMovement = sequelize.define("StockMovement", {
  type: { type: DataTypes.ENUM("stock_in", "stock_out"), allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  balanceAfter: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  note: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
  UserId: { type: DataTypes.INTEGER, allowNull: true }
});

Product.hasMany(StockMovement, { foreignKey: { allowNull: false }, onDelete: "RESTRICT" });
StockMovement.belongsTo(Product, { foreignKey: { allowNull: false } });
User.hasMany(StockMovement, { foreignKey: "UserId", onDelete: "SET NULL" });
StockMovement.belongsTo(User, { foreignKey: "UserId" });
