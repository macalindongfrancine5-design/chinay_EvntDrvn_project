import bcrypt from "bcrypt";
import { Sequelize } from "sequelize";
import { sequelize } from "./models/db.js";
import { Product } from "./models/productModel.js";
import { StockMovement } from "./models/stockMovementModel.js";
import { User } from "./models/userModel.js";
import { ensureInventorySchema } from "./models/inventorySchema.js";
import { ensureUserSchema } from "./models/roleSchema.js";

const databaseName = process.env.DB_NAME || "Final_proj";
if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  throw new Error("DB_NAME may contain only letters, numbers, and underscores.");
}

async function ensureDatabaseReady() {
  const rootSequelize = new Sequelize({
    dialect: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    logging: false
  });

  try {
    await rootSequelize.authenticate();
    await rootSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;`);
  } finally {
    await rootSequelize.close();
  }

  await sequelize.authenticate();
  await sequelize.sync();
  await ensureUserSchema();
  await ensureInventorySchema();
}

async function createSeedUsers() {
  const profiles = [
    { name: "StockTrack Admin", email: "admin@stocktrack.local", role: "admin" },
    { name: "StockTrack Staff", email: "staff@stocktrack.local", role: "staff" },
    { name: "Elaine Ramos", email: "cashier@stocktrack.local", role: "cashier" },
    { name: "Daniel Chen", email: "inventory@stocktrack.local", role: "staff" },
    { name: "Nina Gomez", email: "checkout@stocktrack.local", role: "cashier" }
  ];

  const createdUsers = [];
  const users = [];
  for (const profile of profiles) {
    const password = profile.role === "admin"
      ? process.env.SEED_ADMIN_PASSWORD || "Admin123!"
      : profile.role === "staff"
        ? process.env.SEED_STAFF_PASSWORD || "Password123!"
        : "Password123!";
    const [user, created] = await User.findOrCreate({
      where: { email: profile.email },
      defaults: {
        name: profile.name,
        role: profile.role,
        accountStatus: "active",
        password: await bcrypt.hash(password, 10)
      }
    });
    users.push(user);
    if (created) createdUsers.push({ user, password });
  }

  return { users, createdUsers };
}

function buildProductSeed(index) {
  const templates = [
    { name: "Coconut Water", category: "Beverages", brand: "PureSip", unit: "bottles", unitPrice: 44.5, buyingPrice: 30.0, reorderLevel: 18, quantity: 60 },
    { name: "Instant Noodles", category: "Groceries", brand: "MamiTime", unit: "packs", unitPrice: 24.0, buyingPrice: 16.5, reorderLevel: 22, quantity: 90 },
    { name: "Toothpaste", category: "Personal Care", brand: "BrightSmile", unit: "tubes", unitPrice: 62.0, buyingPrice: 42.0, reorderLevel: 16, quantity: 45 },
    { name: "Rice", category: "Groceries", brand: "Golden Harvest", unit: "kg", unitPrice: 60.0, buyingPrice: 45.0, reorderLevel: 25, quantity: 120 },
    { name: "Orange Juice", category: "Beverages", brand: "SunBurst", unit: "bottles", unitPrice: 58.0, buyingPrice: 39.5, reorderLevel: 14, quantity: 55 },
    { name: "Bath Soap", category: "Personal Care", brand: "FreshGlow", unit: "bars", unitPrice: 28.0, buyingPrice: 18.5, reorderLevel: 26, quantity: 80 },
    { name: "Coffee Beans", category: "Beverages", brand: "RoastHill", unit: "bags", unitPrice: 180.0, buyingPrice: 120.0, reorderLevel: 10, quantity: 35 },
    { name: "Instant Coffee", category: "Beverages", brand: "RoastHill", unit: "packs", unitPrice: 85.0, buyingPrice: 58.0, reorderLevel: 18, quantity: 62 },
    { name: "Vegetable Oil", category: "Groceries", brand: "Arawan", unit: "liters", unitPrice: 130.0, buyingPrice: 92.0, reorderLevel: 12, quantity: 42 },
    { name: "Salted Crackers", category: "Snacks", brand: "CrunchyBite", unit: "boxes", unitPrice: 38.5, buyingPrice: 26.0, reorderLevel: 24, quantity: 85 },
    { name: "Shampoo", category: "Personal Care", brand: "SilkCare", unit: "bottles", unitPrice: 95.0, buyingPrice: 66.5, reorderLevel: 15, quantity: 48 },
    { name: "Corned Beef", category: "Canned Goods", brand: "HarvestBox", unit: "cans", unitPrice: 74.0, buyingPrice: 52.0, reorderLevel: 20, quantity: 68 },
    { name: "Candles", category: "Household", brand: "LunaGlow", unit: "pieces", unitPrice: 35.0, buyingPrice: 22.0, reorderLevel: 18, quantity: 70 },
    { name: "Floor Cleaner", category: "Household", brand: "SpotFree", unit: "bottles", unitPrice: 140.0, buyingPrice: 104.0, reorderLevel: 9, quantity: 30 },
    { name: "Baby Powder", category: "Personal Care", brand: "TenderNest", unit: "packs", unitPrice: 88.0, buyingPrice: 59.5, reorderLevel: 14, quantity: 52 },
    { name: "Canned Tuna", category: "Canned Goods", brand: "OceanFresh", unit: "cans", unitPrice: 66.0, buyingPrice: 44.0, reorderLevel: 21, quantity: 78 },
    { name: "Potato Chips", category: "Snacks", brand: "CrunchyBite", unit: "packs", unitPrice: 42.5, buyingPrice: 29.0, reorderLevel: 30, quantity: 96 },
    { name: "Dishwashing Liquid", category: "Household", brand: "SparkClean", unit: "bottles", unitPrice: 75.0, buyingPrice: 50.0, reorderLevel: 12, quantity: 40 },
    { name: "Detergent Powder", category: "Household", brand: "CleanBurst", unit: "packs", unitPrice: 120.0, buyingPrice: 81.0, reorderLevel: 16, quantity: 54 },
    { name: "Mineral Water", category: "Beverages", brand: "PureSip", unit: "cases", unitPrice: 280.0, buyingPrice: 210.0, reorderLevel: 12, quantity: 36 },
    { name: "Biscuits", category: "Snacks", brand: "CrumbJoy", unit: "packs", unitPrice: 33.5, buyingPrice: 20.5, reorderLevel: 22, quantity: 88 },
    { name: "Sardines", category: "Canned Goods", brand: "CoastalCatch", unit: "cans", unitPrice: 49.0, buyingPrice: 33.5, reorderLevel: 24, quantity: 92 },
    { name: "Toilet Paper", category: "Household", brand: "SoftNest", unit: "rolls", unitPrice: 92.0, buyingPrice: 64.5, reorderLevel: 18, quantity: 66 },
    { name: "Hand Sanitizer", category: "Personal Care", brand: "PureCare", unit: "bottles", unitPrice: 110.0, buyingPrice: 74.0, reorderLevel: 15, quantity: 58 },
    { name: "Pasta", category: "Groceries", brand: "Bella Italy", unit: "packs", unitPrice: 36.0, buyingPrice: 23.5, reorderLevel: 19, quantity: 72 }
  ];

  const template = templates[index % templates.length];
  const nextIndex = index + 1;
  const quantity = Number(template.quantity) + (index % 7) * 4;
  const expiryDate = new Date(Date.now() + (index % 4 + 1) * 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);

  return {
    sku: `ST-${String(nextIndex).padStart(4, "0")}`,
    name: template.name,
    category: template.category,
    brand: template.brand,
    barcode: `BAR${String(nextIndex).padStart(6, "0")}`,
    unit: template.unit,
    quantity,
    reorderLevel: template.reorderLevel,
    unitPrice: Number(template.unitPrice) + (index % 3) * 2.5,
    purchasePrice: Number(template.buyingPrice),
    sellingPrice: Number(template.unitPrice) + (index % 3) * 2.5,
    supplier: `${template.brand} Supply Co.`,
    expiryDate,
    isActive: true
  };
}

function nextMovement(product, userId, index) {
  const stockIn = index % 3 === 0;
  const quantity = index % 5 === 0 ? 12 : 8 + (index % 6) * 2;
  const balanceAfter = stockIn
    ? Number(product.quantity) + quantity
    : Math.max(0, Number(product.quantity) - quantity);

  return {
    ProductId: product.id,
    UserId: userId,
    type: stockIn ? "stock_in" : "stock_out",
    quantity,
    balanceAfter,
    note: stockIn ? "Seed inventory restock" : "Seed sales adjustment",
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

async function seedData() {
  const { users, createdUsers } = await createSeedUsers();
  const userIds = users.map((user) => user.id);
  const productSeeds = Array.from({ length: 25 }, (_, index) => buildProductSeed(index));
  const existingProducts = await Product.findAll({
    attributes: ["sku"],
    where: { sku: productSeeds.map((product) => product.sku) }
  });
  const existingSkus = new Set(existingProducts.map((product) => product.sku));
  const missingProducts = productSeeds.filter((product) => !existingSkus.has(product.sku));
  const createdProducts = await Product.bulkCreate(missingProducts, { validate: true });

  const movementRecords = createdProducts.flatMap((product, index) => {
    const movementCount = 2;
    const productIndex = Number(product.sku.slice(3)) - 1;
    return Array.from({ length: movementCount }, (_, movementIndex) => {
      const userId = userIds[(productIndex + movementIndex) % userIds.length];
      return nextMovement(product, userId, productIndex + movementIndex + 1);
    });
  });

  if (movementRecords.length > 0) {
    await StockMovement.bulkCreate(movementRecords, { validate: true });
  }

  console.log(`✅ Added ${createdProducts.length} products and ${movementRecords.length} stock movements.`);
  for (const { user, password } of createdUsers) {
    console.log(`- New ${user.role} account: ${user.email} / ${password}`);
  }
}

try {
  await ensureDatabaseReady();
  await seedData();
} catch (error) {
  console.error("❌ Seed failed:", error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
