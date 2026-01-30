// ============================================
// USER CONTROLLER - Handles user registration and retrieval
// ============================================

// Import User model (database schema)
const User = require("../models/User.model");

/**
 * FUNCTION: Register a new user
 * Purpose: Create a new user account in the database
 * Route: POST /api/users/register
 */
exports.registerUser = async (req, res) => {
  // Extract user data from request body
  // Example: {name: "John", email: "john@gmail.com", password: "123456", role: "user"}
  const { name, email, password, role } = req.body;

  // ✅ VALIDATION STEP 1: Check if all required fields are provided
  // name, email, password are mandatory. role is optional (defaults to "user")
  if (!name || !email || !password) {
    return res.status(400).json({
      // status: 400 means "Bad Request" - client's fault
      success: false,
      message: "name, email, and password are required",
    });
  }

  // ✅ VALIDATION STEP 2: Check if user with this email already exists
  // This prevents duplicate accounts with same email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User with this email already exists",
    });
  }

  try {
    // ✅ CREATE USER: Save new user to MongoDB database
    const user = await User.create({
      name, // User's full name
      email, // User's email address
      password, // User's password (⚠️ Should be hashed in production!)
      role: role || "user", // Assign role, default to "user" if not provided
    });

    // ✅ SEND SUCCESS RESPONSE with status 201 (Created)
    res.status(201).json({
      success: true,
      // Only return safe data (exclude password)
      data: {
        _id: user._id, // MongoDB unique ID
        name: user.name, // User's name
        email: user.email, // User's email
        role: user.role, // User's role
      },
    });
  } catch (error) {
    // ❌ ERROR HANDLING: If something goes wrong during creation
    res.status(500).json({
      // status: 500 means "Internal Server Error" - server's fault
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};

/**
 * FUNCTION: Get user by ID
 * Purpose: Retrieve a specific user's information from database
 * Route: GET /api/users/:id
 */
exports.getUserById = async (req, res) => {
  // Extract user ID from URL parameter
  // Example: GET /api/users/697b3d133a8ba6d8547a4bac → id = "697b3d133a8ba6d8547a4bac"
  const { id } = req.params;

  try {
    // ✅ FETCH USER: Search database by ID
    // .select("-password") means: "Return everything EXCEPT password field"
    const user = await User.findById(id).select("-password");

    // ❌ IF NOT FOUND: User doesn't exist in database
    if (!user) {
      return res.status(404).json({
        // status: 404 means "Not Found"
        success: false,
        message: "User not found",
      });
    }

    // ✅ SEND SUCCESS RESPONSE with user data
    res.status(200).json({
      // status: 200 means "OK" - request successful
      success: true,
      data: user,
    });
  } catch (error) {
    // ❌ ERROR HANDLING: If database query fails
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};
