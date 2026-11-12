import { Sequelize } from "sequelize";
import { sequelize } from "./models/db.js";
import "./models/userModel.js";
import "./models/productModel.js";
import "./models/stockMovementModel.js";
import { ensureInventorySchema } from "./models/inventorySchema.js";
import { ensureUserSchema } from "./models/roleSchema.js";
import inquirer from "inquirer";

const databaseName = process.env.DB_NAME || "Final_proj";
if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  throw new Error("DB_NAME may contain only letters, numbers, and underscores.");
}

const rootSequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  logging: false
});
const createDb = process.argv.includes("--yes")
  ? true
  : (await inquirer.prompt([{
    type: "confirm",
    name: "createDb",
    message: `Create database '${databaseName}' if it does not exist?`,
    default: true
  }])).createDb;

try {
  if (createDb) {
    await rootSequelize.authenticate();
    await rootSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;`);
    console.log(`✅ Database '${databaseName}' is ready.`);
  }
  await sequelize.authenticate();
  await sequelize.sync();
  await ensureUserSchema();
  await ensureInventorySchema();
  console.log("✅ StockTrack tables are ready.");
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exitCode = 1;
} finally {
  await Promise.all([rootSequelize.close(), sequelize.close()]);
}
