import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

export default function uploadProductImage(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();

    if (error.code === "LIMIT_FILE_SIZE") {
      req.flash("error_msg", "Product images must be 5 MB or smaller.");
    } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
      req.flash("error_msg", "Upload one product image at a time.");
    } else {
      console.error("Failed to receive a StockTrack product image:", error);
      req.flash("error_msg", "Could not receive the product image. Please try again.");
    }
    res.redirect("/inventory");
  });
}
