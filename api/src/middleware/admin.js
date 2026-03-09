/**
 * Admin middleware.
 * Checks that the authenticated user has role "admin".
 * Must be chained after authMiddleware so req.agency and req.role are set.
 */
function adminMiddleware(req, res, next) {
  // Primary check: role from JWT (set by authMiddleware)
  if (req.role === "admin") return next();

  // Fallback: check wallet against DEPLOYER_ADDRESS env var
  const deployer = (process.env.DEPLOYER_ADDRESS || "").toLowerCase();
  const caller   = (
    req.agency?.wallet_address ||
    req.agency?.wallet ||
    req.wallet ||
    ""
  ).toLowerCase();

  if (deployer && caller && caller === deployer) return next();

  return res.status(403).json({
    error: "Forbidden — admin role required",
    hint:  "Only the protocol deployer can access admin endpoints",
  });
}

module.exports = { adminMiddleware };