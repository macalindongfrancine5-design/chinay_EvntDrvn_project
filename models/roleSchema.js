import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export async function ensureUserSchema() {
  const queryInterface = sequelize.getQueryInterface();
  const users = await queryInterface.describeTable("Users");
  const roleType = String(users.role?.type || "").toLowerCase();

  if (roleType.includes("visitors")) {
    await sequelize.query("ALTER TABLE `Users` MODIFY COLUMN `role` ENUM('admin','staff','visitors') NOT NULL DEFAULT 'staff'");
    await sequelize.query("UPDATE `Users` SET `role` = 'staff' WHERE `role` = 'visitors'");
    await sequelize.query("ALTER TABLE `Users` MODIFY COLUMN `role` ENUM('admin','staff') NOT NULL DEFAULT 'staff'");
  }

  if (!users.accountStatus) {
    await queryInterface.addColumn("Users", "accountStatus", {
      type: DataTypes.ENUM("active", "deactivated"),
      allowNull: false,
      defaultValue: "active"
    });
  }
}
