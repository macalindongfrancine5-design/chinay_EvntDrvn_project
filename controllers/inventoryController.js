import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequelize } from "../models/db.js";
import { Product } from "../models/productModel.js";
import { StockMovement } from "../models/stockMovementModel.js";
import { User } from "../models/userModel.js";

const uploadDirectory = fileURLToPath(new URL("../public/uploads/products/", import.meta.url));
const expirationWarningDays = 30;

function isValidAmount(value, { allowZero = false } = {}) {
  if (String(value ?? "").trim() === "") return false;
  const amount = Number(value);
  return Number.isFinite(amount)
    && (allowZero ? amount >= 0 : amount > 0)
    && amount <= 99999999.99
    && Math.round(amount * 100) === amount * 100;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function readProductForm(body, { creating = false } = {}) {
  const value = {
    name: String(body.name || "").trim(),
    category: String(body.category || "").trim(),
    brand: String(body.brand || "").trim(),
    barcode: String(body.barcode || "").trim(),
    supplier: String(body.supplier || "").trim(),
    unit: String(body.unit || "").trim(),
    quantity: String(body.quantity ?? "").trim(),
    reorderLevel: String(body.reorderLevel ?? "").trim(),
    purchasePrice: String(body.purchasePrice ?? "").trim(),
    sellingPrice: String(body.sellingPrice ?? "").trim(),
    expiryDate: String(body.expiryDate || "").trim()
  };

  if (!value.name || !value.category || !value.unit || !value.expiryDate) {
    return { error: "Enter the product name, category, unit, and expiration date." };
  }
  if (value.name.length > 120 || value.category.length > 60 || value.brand.length > 80
      || value.barcode.length > 80 || value.supplier.length > 120 || value.unit.length > 20) {
    return { error: "One or more product details are too long." };
  }
  if (!isValidDate(value.expiryDate)) {
    return { error: "Enter a valid expiration date." };
  }
  if (!isValidAmount(value.reorderLevel, { allowZero: true })
      || !isValidAmount(value.purchasePrice, { allowZero: true })
      || !isValidAmount(value.sellingPrice, { allowZero: true })
      || (creating && !isValidAmount(value.quantity, { allowZero: true }))) {
    return { error: "Enter valid prices and stock amounts with up to 2 decimal places." };
  }

  return {
    value: {
      name: value.name,
      category: value.category,
      brand: value.brand || null,
      barcode: value.barcode || null,
      supplier: value.supplier || null,
      unit: value.unit,
      reorderLevel: Number(value.reorderLevel),
      purchasePrice: Number(value.purchasePrice),
      sellingPrice: Number(value.sellingPrice),
      expiryDate: value.expiryDate,
      ...(creating ? { quantity: Number(value.quantity) } : {})
    }
  };
}

function getImageType(file) {
  if (!file) return null;
  const { buffer, mimetype } = file;
  if (mimetype === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }
  if (mimetype === "image/png" && buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    return ".png";
  }
  if (mimetype === "image/webp" && buffer.toString("ascii", 0, 4) === "RIFF"
      && buffer.toString("ascii", 8, 12) === "WEBP") {
    return ".webp";
  }
  return null;
}

async function saveProductImage(file) {
  const extension = getImageType(file);
  if (!extension) throw new Error("INVALID_IMAGE");
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  await writeFile(path.join(uploadDirectory, filename), file.buffer, { flag: "wx" });
  return `/uploads/products/${filename}`;
}

async function removeProductImage(imageUrl) {
  if (!/^\/uploads\/products\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(String(imageUrl || ""))) return;
  try {
    await unlink(path.join(uploadDirectory, path.basename(imageUrl)));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function mapProduct(product, today) {
  const item = product.get({ plain: true });
  item.quantityDisplay = Number(item.quantity).toLocaleString("en-PH", { maximumFractionDigits: 2 });
  item.reorderLevelDisplay = Number(item.reorderLevel).toLocaleString("en-PH", { maximumFractionDigits: 2 });
  item.purchasePriceDisplay = Number(item.purchasePrice).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  item.sellingPriceDisplay = Number(item.sellingPrice).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  item.expiryDateDisplay = item.expiryDate
    ? new Date(`${item.expiryDate}T00:00:00.000Z`).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
    : "Not set";
  item.isOutOfStock = Number(item.quantity) <= 0;
  item.isLowStock = !item.isOutOfStock && Number(item.quantity) <= Number(item.reorderLevel);
  item.stockStatus = item.isOutOfStock ? "Out of stock" : item.isLowStock ? "Low stock" : "In stock";
  item.stockBadgeClass = item.isOutOfStock ? "badge-red" : item.isLowStock ? "badge-amber" : "badge-green";
  item.isExpired = Boolean(item.expiryDate && item.expiryDate < today);
  item.isExpiringSoon = Boolean(item.expiryDate && !item.isExpired
    && item.expiryDate <= addDays(today, expirationWarningDays));
  item.isMissingExpiryDate = !item.expiryDate;
  item.expiryBadgeClass = item.isExpired ? "badge-red"
    : item.isExpiringSoon || item.isMissingExpiryDate ? "badge-amber" : "";
  item.brandDisplay = item.brand || "—";
  item.barcodeDisplay = item.barcode || "—";
  item.supplierDisplay = item.supplier || "—";
  return item;
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function matchesStockFilter(product, filter) {
  if (filter === "in_stock") return !product.isOutOfStock && !product.isLowStock;
  if (filter === "low_stock") return product.isLowStock;
  if (filter === "out_of_stock") return product.isOutOfStock;
  if (filter === "expired") return product.isExpired;
  if (filter === "expiring") return product.isExpiringSoon;
  return true;
}

async function renderInventory(req, res) {
  const rows = await Product.findAll({
    where: { isActive: true },
    order: [["name", "ASC"]]
  });
  const today = new Date().toISOString().slice(0, 10);
  const products = rows.map((product) => mapProduct(product, today));
  const search = String(req.query.search || "").trim().slice(0, 100);
  const category = String(req.query.category || "").trim().slice(0, 60);
  const status = String(req.query.status || "");
  const sort = String(req.query.sort || "name_asc");
  const validStatuses = ["in_stock", "low_stock", "out_of_stock", "expired", "expiring"];
  const validSorts = ["name_asc", "name_desc", "quantity_asc", "quantity_desc", "expiry_asc"];
  const selectedStatus = validStatuses.includes(status) ? status : "";
  const selectedSort = validSorts.includes(sort) ? sort : "name_asc";

  let filteredProducts = products.filter((product) => {
    const matchesSearch = !search
      || `${product.name} ${product.barcode || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || product.category === category;
    return matchesSearch && matchesCategory && matchesStockFilter(product, selectedStatus);
  });

  const sorters = {
    name_asc: (a, b) => a.name.localeCompare(b.name),
    name_desc: (a, b) => b.name.localeCompare(a.name),
    quantity_asc: (a, b) => Number(a.quantity) - Number(b.quantity),
    quantity_desc: (a, b) => Number(b.quantity) - Number(a.quantity),
    expiry_asc: (a, b) => String(a.expiryDate || "9999-12-31").localeCompare(String(b.expiryDate || "9999-12-31"))
  };
  filteredProducts = filteredProducts.sort(sorters[selectedSort]);

  const recentMovements = await StockMovement.findAll({
    include: [
      { model: Product, attributes: ["name", "sku"] },
      { model: User, attributes: ["name"] }
    ],
    order: [["createdAt", "DESC"]],
    limit: 30
  });

  const categories = [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b));
  const summary = {
    totalProducts: products.length,
    availableStock: products.reduce((sum, product) => sum + Number(product.quantity), 0),
    lowStockCount: products.filter((product) => product.isLowStock).length,
    outOfStockCount: products.filter((product) => product.isOutOfStock).length,
    expiredCount: products.filter((product) => product.isExpired).length,
    expiringSoonCount: products.filter((product) => product.isExpiringSoon).length,
    missingExpiryCount: products.filter((product) => product.isMissingExpiryDate).length
  };

  res.render("dashboard", {
    title: "Inventory",
    pageTitle: "Inventory",
    displayName: req.session.userName || "StockTrack user",
    isInventory: true,
    isAdmin: req.session.userRole === "admin",
    canAddProducts: ["admin", "staff"].includes(req.session.userRole),
    products: filteredProducts,
    categories: categories.map((name) => ({ name, isSelected: name === category })),
    recentMovements: recentMovements.map((movement) => {
      const item = movement.get({ plain: true });
      item.movementLabel = item.type === "stock_in" ? "Stock in" : "Stock out";
      item.movementClass = item.type === "stock_in" ? "movement-in" : "movement-out";
      item.quantityDisplay = Number(item.quantity).toLocaleString("en-PH", { maximumFractionDigits: 2 });
      item.dateDisplay = new Date(item.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
      item.userResponsible = item.User?.name || "System / legacy record";
      return item;
    }),
    search,
    category,
    status: selectedStatus,
    sort: selectedSort,
    statusIsInStock: selectedStatus === "in_stock",
    statusIsLowStock: selectedStatus === "low_stock",
    statusIsOutOfStock: selectedStatus === "out_of_stock",
    statusIsExpiring: selectedStatus === "expiring",
    statusIsExpired: selectedStatus === "expired",
    sortIsNameAsc: selectedSort === "name_asc",
    sortIsNameDesc: selectedSort === "name_desc",
    sortIsQuantityAsc: selectedSort === "quantity_asc",
    sortIsQuantityDesc: selectedSort === "quantity_desc",
    sortIsExpiryAsc: selectedSort === "expiry_asc",
    hasProducts: products.length > 0,
    hasFilteredProducts: filteredProducts.length > 0,
    hasMovements: recentMovements.length > 0,
    ...summary,
    availableStockDisplay: summary.availableStock.toLocaleString("en-PH", { maximumFractionDigits: 2 })
  });
}

export const inventoryPage = async (req, res) => {
  try {
    await renderInventory(req, res);
  } catch (error) {
    console.error("Failed to load StockTrack inventory:", error);
    req.flash("error_msg", "Could not load inventory. Check the database connection and try again.");
    res.status(500).render("dashboard", {
      title: "Inventory",
      pageTitle: "Inventory",
      displayName: req.session.userName || "StockTrack user",
      isInventory: true,
      isAdmin: req.session.userRole === "admin",
      canAddProducts: ["admin", "staff"].includes(req.session.userRole),
      products: [],
      categories: [],
      recentMovements: [],
      hasProducts: false,
      hasFilteredProducts: false,
      hasMovements: false,
      totalProducts: 0,
      availableStockDisplay: "0",
      lowStockCount: 0,
      outOfStockCount: 0,
      expiredCount: 0,
      expiringSoonCount: 0,
      error_msg: ["Could not load inventory. Check the database connection and try again."]
    });
  }
};

export const createProduct = async (req, res) => {
  const input = readProductForm(req.body, { creating: true });
  if (input.error) {
    req.flash("error_msg", input.error);
    return res.redirect("/inventory");
  }

  let imageUrl;
  try {
    if (req.file) {
      imageUrl = await saveProductImage(req.file);
      input.value.imageUrl = imageUrl;
    }
    await sequelize.transaction(async (transaction) => {
      const { quantity, ...details } = input.value;
      const product = await Product.create({
        ...details,
        sku: `STK-${randomUUID()}`,
        quantity,
        unitPrice: details.sellingPrice
      }, { transaction });
      if (quantity > 0) {
        await StockMovement.create({
          ProductId: product.id,
          UserId: req.session.userId,
          type: "stock_in",
          quantity,
          balanceAfter: quantity,
          note: "Opening stock"
        }, { transaction });
      }
    });
    req.flash("success_msg", "Product added.");
  } catch (error) {
    if (imageUrl) {
      try {
        await removeProductImage(imageUrl);
      } catch (cleanupError) {
        console.error("Failed to remove an unused StockTrack product image:", cleanupError);
      }
    }
    if (error.message === "INVALID_IMAGE") {
      req.flash("error_msg", "Upload a valid JPEG, PNG, or WebP product image.");
    } else {
      console.error("Failed to add StockTrack product:", error);
      req.flash("error_msg", "Could not add the product. Please try again.");
    }
  }
  res.redirect("/inventory");
};

export const updateProduct = async (req, res) => {
  const input = readProductForm(req.body);
  if (input.error) {
    req.flash("error_msg", input.error);
    return res.redirect("/inventory");
  }

  let newImageUrl;
  let previousImageUrl;
  try {
    if (req.file) {
      newImageUrl = await saveProductImage(req.file);
      input.value.imageUrl = newImageUrl;
    }
    await sequelize.transaction(async (transaction) => {
      const product = await Product.findOne({
        where: { id: req.params.id, isActive: true },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");
      previousImageUrl = product.imageUrl;
      await product.update({
        ...input.value,
        unitPrice: input.value.sellingPrice
      }, { transaction });
    });
    if (newImageUrl && previousImageUrl) {
      try {
        await removeProductImage(previousImageUrl);
      } catch (error) {
        console.error("Failed to remove a replaced StockTrack product image:", error);
      }
    }
    req.flash("success_msg", "Product details updated.");
  } catch (error) {
    if (newImageUrl) {
      try {
        await removeProductImage(newImageUrl);
      } catch (cleanupError) {
        console.error("Failed to remove an unused StockTrack product image:", cleanupError);
      }
    }
    if (error.message === "INVALID_IMAGE") {
      req.flash("error_msg", "Upload a valid JPEG, PNG, or WebP product image.");
    } else if (error.message === "PRODUCT_NOT_FOUND") {
      req.flash("error_msg", "That product could not be found.");
    } else {
      console.error("Failed to update StockTrack product:", error);
      req.flash("error_msg", "Could not update the product. Please try again.");
    }
  }
  res.redirect("/inventory");
};

async function recordStockMovement(req, res, type) {
  const quantityValue = String(req.body.quantity ?? "").trim();
  const note = String(req.body.note || "").trim();
  if (!isValidAmount(quantityValue) || note.length > 255) {
    req.flash("error_msg", "Enter a valid quantity and a note no longer than 255 characters.");
    return res.redirect("/inventory");
  }

  const quantity = Number(quantityValue);
  try {
    await sequelize.transaction(async (transaction) => {
      const product = await Product.findOne({
        where: { id: req.params.id, isActive: true },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");

      const currentQuantity = Number(product.quantity);
      if (type === "stock_out" && quantity > currentQuantity) throw new Error("INSUFFICIENT_STOCK");
      const nextQuantity = type === "stock_in"
        ? currentQuantity + quantity
        : currentQuantity - quantity;
      await product.update({ quantity: nextQuantity }, { transaction });
      await StockMovement.create({
        ProductId: product.id,
        UserId: req.session.userId,
        type,
        quantity,
        balanceAfter: nextQuantity,
        note: note || (type === "stock_in" ? "Stock received" : "Stock removed")
      }, { transaction });
    });
    req.flash("success_msg", type === "stock_in" ? "Stock received and inventory updated." : "Stock removed and inventory updated.");
  } catch (error) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      req.flash("error_msg", "That product could not be found.");
    } else if (error.message === "INSUFFICIENT_STOCK") {
      req.flash("error_msg", "Stock out quantity cannot exceed the available quantity.");
    } else {
      console.error("Failed to record StockTrack stock movement:", error);
      req.flash("error_msg", "Could not update stock. Please try again.");
    }
  }
  res.redirect("/inventory");
}

export const stockIn = (req, res) => recordStockMovement(req, res, "stock_in");
export const stockOut = (req, res) => recordStockMovement(req, res, "stock_out");
