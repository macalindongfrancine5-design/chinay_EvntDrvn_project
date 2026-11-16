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
    
import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";

export const loginPage = (req, res) => res.render("login", {
  title: "Login",
  error_msg: req.query.deactivated === "1"
    ? ["This account is deactivated. Contact an administrator for access."]
    : res.locals.error_msg || [],
  info_msg: req.query.registration === "admin-only"
    ? ["StockTrack accounts are created by an administrator."]
    : []
});
export const registerPage = (req, res) => res.render("register", { title: "Register" });
export const forgotPasswordPage = (req, res) => res.render("forgotpassword", { title: "Forgot Password" });

export const loginUser = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      req.flash("error_msg", "The email or password you entered is incorrect.");
      return res.redirect("/login");
    }
    if (user.accountStatus !== "active") {
      req.flash("error_msg", "This account is deactivated. Contact an administrator for access.");
      return res.redirect("/login");
    }
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userRole = user.role;
    res.redirect(user.role === "admin" ? "/dashboard" : "/inventory");
  } catch (error) {
    console.error("Failed to sign in to StockTrack:", error);
    req.flash("error_msg", "Could not sign in right now. Please try again.");
    res.redirect("/login");
  }
};

export const registerUser = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    req.flash("error_msg", "Enter your name, a valid email address, and a password with at least 8 characters.");
    return res.redirect("/register");
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userRole = user.role;
    res.redirect("/inventory");
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      req.flash("error_msg", "An account with that email already exists.");
      return res.redirect("/register");
    }
    console.error("Failed to create a StockTrack account:", error);
    req.flash("error_msg", "Could not create your account right now. Please try again.");
    res.redirect("/register");
  }
};

export const logoutUser = (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).send("Could not log out. Please try again.");
    res.redirect("/login");
  });
};
