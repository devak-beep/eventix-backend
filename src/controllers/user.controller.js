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
  const { name, email, password, role } = req.body;

  // Validation: Check if all required fields are provided
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "name, email, and password are required",
    });
  }

  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  // Check if user with this email already exists (case-insensitive)
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User with this email already exists",
    });
  }

  try {
    // Create user with normalized email
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || "user",
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

/**
 * FUNCTION: Login user
 * Purpose: Authenticate user with email and password
 * Route: POST /api/users/login
 */
exports.loginUser = async (req, res) => {
  // Extract credentials from request body
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Find user by normalized email
    const user = await User.findOne({ email: normalizedEmail });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if password matches (simple comparison - should use bcrypt in production)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Login successful - return user data (without password)
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: error.message,
    });
  }
};
