import { User } from "../models/userModel.js";

export default async function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const user = await User.findByPk(req.session.userId, {
      attributes: ["id", "name", "role", "accountStatus"]
    });
    if (!user) {
      return req.session.destroy((error) => {
        if (error) {
          console.error("Failed to clear an invalid StockTrack session:", error);
          return res.status(500).send("Could not verify your account. Please try again.");
        }
        res.redirect("/login");
      });
    }
    if (user.accountStatus !== "active") {
      return req.session.destroy((error) => {
        if (error) {
          console.error("Failed to clear a deactivated StockTrack session:", error);
          return res.status(500).send("Could not verify your account. Please try again.");
        }
        res.redirect("/login?deactivated=1");
      });
    }

    req.session.userName = user.name;
    req.session.userRole = user.role;
    res.locals.displayName = user.name;
    res.locals.avatarInitial = user.name.trim().charAt(0).toUpperCase() || "S";
    res.locals.userRole = user.role;
    res.locals.isAdmin = user.role === "admin";
    next();
  } catch (error) {
    console.error("Failed to verify StockTrack account access:", error);
    res.status(500).send("Could not verify your account. Please try again.");
  }
}
