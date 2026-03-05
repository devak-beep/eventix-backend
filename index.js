require("dotenv").config();

let app = null;

module.exports = async (req, res) => {
  console.log(`[VERCEL] ${req.method} ${req.url}`);

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "https://eventix-frontend-8v2j.vercel.app");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Correlation-ID,x-user-id,x-user-role");
    return res.status(200).end();
  }

  try {
    if (!app) {
      console.log("[VERCEL] Loading app...");
      app = require("./src/app");
      console.log("[VERCEL] App loaded");
    }

    return app(req, res);
  } catch (error) {
    console.error("[VERCEL] Error:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Server error",
        message: error.message,
      });
    }
  }
};
