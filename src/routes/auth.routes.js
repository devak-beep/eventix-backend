const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User.model");

const router = express.Router();

// Configure Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || "https://eventix-backend-gules.vercel.app"}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value.toLowerCase();
        let user = await User.findOne({ email });

        if (!user) {
          // Auto-register via Google
          user = await User.create({
            name: profile.displayName,
            email,
            password: `google_${profile.id}`, // placeholder, not used for login
            role: "user",
            isApproved: true,
            otpEnabled: false, // Google already verified identity
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Step 1: Redirect to Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

// Step 2: Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL}?error=google_auth_failed` }),
  (req, res) => {
    const user = req.user;
    // Pass user data to frontend via query params (simple, no JWT needed)
    const params = new URLSearchParams({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });
    res.redirect(`${process.env.FRONTEND_URL}?googleAuth=${encodeURIComponent(params.toString())}`);
  }
);

module.exports = router;
