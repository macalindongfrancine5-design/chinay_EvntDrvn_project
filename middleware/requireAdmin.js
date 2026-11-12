export default function requireAdmin(req, res, next) {
  if (req.session.userRole !== "admin") return res.status(403).send("Administrator access is required.");
  res.locals.isAdmin = true;
  next();
}
