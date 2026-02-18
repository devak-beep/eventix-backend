// ============================================
// ROLE CHECK MIDDLEWARE - Verify user role
// ============================================

/**
 * Middleware to check if user has admin role
 * Note: This is a simple check. In production, use JWT tokens for authentication.
 */
exports.requireAdmin = (req, res, next) => {
  const { userId, userRole } = req.body;

  // Check if role is provided
  if (!userRole) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Role information required.",
    });
  }

  // Check if user is admin
  if (userRole !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required to create events.",
    });
  }

  // User is admin, proceed to next middleware/controller
  next();
};

/**
 * Middleware to check if user has superAdmin role
 * Used to protect admin management routes
 */
exports.requireSuperAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Authentication token required.",
    });
  }

  try {
    // For now, we'll do a basic check. In production, decode JWT and verify role.
    // This is a placeholder - actual implementation should verify JWT
    const { userRole, userId } = req.headers;

    if (userRole !== "superAdmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. SuperAdmin privileges required.",
      });
    }

    // Attach user info to request for use in controller
    req.userId = userId;
    req.userRole = userRole;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};
