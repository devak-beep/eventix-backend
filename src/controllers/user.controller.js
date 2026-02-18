// ============================================
// USER CONTROLLER - Handles user registration and retrieval
// ============================================

// Import User model (database schema)
const User = require("../models/User.model");
const AdminRequest = require("../models/AdminRequest.model");

/**
 * FUNCTION: Register a new user
 * Purpose: Create a new user account in the database
 * Route: POST /api/users/register
 */
exports.registerUser = async (req, res) => {
  // Extract user data from request body
  const { name, email, password, role, requestAdmin } = req.body;

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
    // If user is requesting admin role
    if (requestAdmin === true || role === "admin") {
      // Create user account but mark as unapproved
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: "user", // Start as regular user
        isApproved: false, // Account not approved yet
        adminRequestStatus: "pending", // Waiting for super admin approval
        adminRequestDate: new Date(),
      });

      // Create admin request
      await AdminRequest.create({
        user: user._id,
        name: user.name,
        email: user.email,
        status: "pending",
      });

      // ✅ SEND RESPONSE: Request submitted, waiting for approval
      return res.status(201).json({
        success: true,
        message:
          "Admin request submitted. Your account will be created once approved by a super admin.",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          adminRequestStatus: "pending",
        },
        isAdminRequest: true, // Flag to show different message on frontend
      });
    }

    // Regular user registration
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "user",
      isApproved: true, // Regular users approved by default
    });

    // ✅ SEND SUCCESS RESPONSE with status 201 (Created)
    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      data: {
        _id: user._id, // MongoDB unique ID
        name: user.name, // User's name
        email: user.email, // User's email
        role: user.role, // User's role
      },
      isAdminRequest: false,
    });
  } catch (error) {
    // ❌ ERROR HANDLING: If something goes wrong during creation
    res.status(500).json({
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

/**
 * FUNCTION: Get all pending admin requests
 * Purpose: Super admin views requests to become admin
 * Route: GET /api/users/admin-requests/pending
 */
exports.getAdminRequests = async (req, res) => {
  try {
    // Get all pending requests with user details
    const requests = await AdminRequest.find({ status: "pending" })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching admin requests",
      error: error.message,
    });
  }
};

/**
 * FUNCTION: Approve admin request
 * Purpose: Super admin approves a user's request to become admin
 * Route: POST /api/users/admin-requests/:requestId/approve
 */
exports.approveAdminRequest = async (req, res) => {
  const { requestId } = req.params;
  const { superAdminId } = req.body;

  try {
    // Find the admin request
    const adminRequest = await AdminRequest.findById(requestId);
    if (!adminRequest) {
      return res.status(404).json({
        success: false,
        message: "Admin request not found",
      });
    }

    // Update user role to admin and mark as approved
    await User.findByIdAndUpdate(adminRequest.user, {
      role: "admin",
      isApproved: true,
      adminRequestStatus: "approved",
    });

    // Update admin request status
    adminRequest.status = "approved";
    adminRequest.approvedBy = superAdminId;
    adminRequest.approvalDate = new Date();
    await adminRequest.save();

    res.status(200).json({
      success: true,
      message: "Admin request approved successfully",
      data: adminRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error approving admin request",
      error: error.message,
    });
  }
};

/**
 * FUNCTION: Reject admin request
 * Purpose: Super admin rejects a user's request to become admin
 * Route: POST /api/users/admin-requests/:requestId/reject
 */
exports.rejectAdminRequest = async (req, res) => {
  const { requestId } = req.params;
  const { superAdminId, rejectionReason } = req.body;

  try {
    // Find the admin request
    const adminRequest = await AdminRequest.findById(requestId);
    if (!adminRequest) {
      return res.status(404).json({
        success: false,
        message: "Admin request not found",
      });
    }

    // Delete the user account
    await User.findByIdAndDelete(adminRequest.user);

    // Update admin request status
    adminRequest.status = "rejected";
    adminRequest.approvedBy = superAdminId;
    adminRequest.rejectionReason = rejectionReason || "";
    adminRequest.approvalDate = new Date();
    await adminRequest.save();

    res.status(200).json({
      success: true,
      message: "Admin request rejected and account deleted",
      data: adminRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error rejecting admin request",
      error: error.message,
    });
  }
};
