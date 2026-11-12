import { Product } from "../models/productModel.js";
import { StockMovement } from "../models/stockMovementModel.js";

export const dashboardPage = async (req, res) => {
  try {
    const [products, recentMovements, movementCount] = await Promise.all([
      Product.findAll({
        where: { isActive: true },
        attributes: ["quantity", "reorderLevel"]
      }),
      StockMovement.findAll({
        include: [{ model: Product, attributes: ["name"] }],
        order: [["createdAt", "DESC"]],
        limit: 8
      }),
      StockMovement.count()
    ]);

    const lowStockCount = products.filter(
      (product) => Number(product.quantity) <= Number(product.reorderLevel)
    ).length;
    const outOfStockCount = products.filter((product) => Number(product.quantity) <= 0).length;

    res.render("overview", {
      title: "Dashboard",
      pageTitle: "Dashboard",
      displayName: req.session.userName || "StockTrack user",
      isDashboard: true,
      isAdmin: req.session.userRole === "admin",
      totalProducts: products.length,
      lowStockCount,
      outOfStockCount,
      movementCount,
      hasRecentMovements: recentMovements.length > 0,
      recentMovements: recentMovements.map((movement) => {
        const item = movement.get({ plain: true });
        item.movementLabel = item.type === "stock_in" ? "Stock received" : "Stock removed";
        item.quantityDisplay = Number(item.quantity).toLocaleString("en-PH", { maximumFractionDigits: 2 });
        item.dateDisplay = new Date(item.createdAt).toLocaleString("en-PH", {
          dateStyle: "medium",
          timeStyle: "short"
        });
        return item;
      })
    });
  } catch (error) {
    console.error("Failed to load StockTrack dashboard:", error);
    req.flash("error_msg", "Could not load the dashboard. Check the database connection and try again.");
    res.status(500).render("overview", {
      title: "Dashboard",
      pageTitle: "Dashboard",
      displayName: req.session.userName || "StockTrack user",
      isDashboard: true,
      isAdmin: req.session.userRole === "admin",
      totalProducts: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      movementCount: 0,
      hasRecentMovements: false,
      recentMovements: [],
      error_msg: ["Could not load the dashboard. Check the database connection and try again."]
    });
  }
};
