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
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required to create events.",
    });
  }

  // User is admin, proceed to next middleware/controller
  next();
};
