  /*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
    
import express from "express";
import { homePage } from "../controllers/homeController.js";
const router = express.Router();
router.get("/", homePage);

import { loginPage, forgotPasswordPage, loginUser, logoutUser } from "../controllers/authController.js";
import {
  createProduct,
  inventoryPage,
  stockIn,
  stockOut,
  updateProduct
} from "../controllers/inventoryController.js";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { dashboardPage } from "../controllers/dashboardController.js";
import {
  createUser,
  deleteUser,
  resetUserPassword,
  updateUser,
  usersPage
} from "../controllers/userManagementController.js";
import uploadProductImage from "../middleware/uploadProductImage.js";

function requireInventoryStaff(req, res, next) {
  if (!["admin", "staff"].includes(req.session.userRole)) {
    return res.status(403).send("Staff access is required to add products.");
  }
  next();
}

router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/register", (req, res) => res.redirect("/login?registration=admin-only"));
router.post("/register", (req, res) => res.redirect("/login?registration=admin-only"));
router.get("/forgot-password", forgotPasswordPage);
router.get("/dashboard", requireAuth, requireAdmin, dashboardPage);
router.get("/inventory", requireAuth, inventoryPage);
router.get("/users", requireAuth, requireAdmin, usersPage);
router.post("/users", requireAuth, requireAdmin, createUser);
router.post("/users/:id/update", requireAuth, requireAdmin, updateUser);
router.post("/users/:id/delete", requireAuth, requireAdmin, deleteUser);
router.post("/users/:id/password", requireAuth, requireAdmin, resetUserPassword);
router.post("/products", requireAuth, requireInventoryStaff, uploadProductImage, createProduct);
router.post("/products/:id/update", requireAuth, requireAdmin, uploadProductImage, updateProduct);
router.post("/products/:id/stock-in", requireAuth, requireAdmin, stockIn);
router.post("/products/:id/stock-out", requireAuth, requireAdmin, stockOut);
router.get("/logout", logoutUser);

export default router;
