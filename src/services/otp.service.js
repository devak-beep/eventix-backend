// ============================================
// OTP SERVICE - Generate, send, and verify OTPs
// ============================================

const nodemailer = require("nodemailer");
const Otp = require("../models/Otp.model");

// -----------------------------------------------
// Generate a random 6-digit OTP number
// -----------------------------------------------
function generateOtp() {
  // Math.random() gives 0.0 to 0.9999...
  // * 900000 gives 0 to 899999
  // + 100000 gives 100000 to 999999 (always 6 digits)
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// -----------------------------------------------
// Create email transporter using Gmail SMTP
// Uses EMAIL_USER and EMAIL_PASS from .env
// -----------------------------------------------
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Must be a Gmail App Password (not your regular password)
    },
  });
}

// -----------------------------------------------
// Build HTML email content for OTP
// -----------------------------------------------
function buildEmailHtml(otp, purpose) {
  const isRegister = purpose === "register";
  const title = isRegister
    ? "Verify Your Email Address"
    : "Login Verification Code";
  const subtitle = isRegister
    ? "You're almost there! Use the OTP below to complete your Eventix registration."
    : "Someone is trying to log in to your Eventix account. Use the OTP below to confirm.";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6c3de8; font-size: 28px; margin: 0;">Eventix</h1>
          <p style="color: #888; font-size: 14px; margin: 4px 0 0;">Enterprise Event Management Platform</p>
        </div>

        <!-- Title -->
        <h2 style="color: #1a1a2e; font-size: 22px; text-align: center;">${title}</h2>
        <p style="color: #555; text-align: center; line-height: 1.6;">${subtitle}</p>

        <!-- OTP Box -->
        <div style="background: linear-gradient(135deg, #6c3de8, #a855f7); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
          <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 10px;">Your One-Time Password</p>
          <span style="font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #fff; display: block;">${otp}</span>
        </div>

        <!-- Validity Note -->
        <div style="background: #fff8e1; border-left: 4px solid #ffc107; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; color: #7a6300; font-size: 14px;">
            ⏱️ This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.
          </p>
        </div>

        <!-- Footer -->
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 20px;">
          If you didn't request this, you can safely ignore this email.<br/>
          &copy; ${new Date().getFullYear()} Eventix. All rights reserved.
        </p>

      </div>
    </div>
  `;
}

// -----------------------------------------------
// SEND OTP
// - Rate limited: only 1 OTP per 2 minutes (idempotency)
// - Generates OTP
// - Deletes any old OTPs for same email/purpose
// - Saves new OTP to MongoDB
// - Sends email
// -----------------------------------------------
async function sendOtp(email, purpose, tempData = null) {
  const normalizedEmail = email.toLowerCase().trim();
  const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
  const now = new Date();

  // ATOMIC UPSERT: Try to insert a new OTP document.
  // If a document already exists for this email+purpose (unique index), the upsert
  // will UPDATE it — but only if the cooldown has passed (using $lt filter on createdAt).
  // If the cooldown has NOT passed, the filter won't match and no update happens.
  const otp = generateOtp();
  const cooldownCutoff = new Date(now.getTime() - COOLDOWN_MS);

  const result = await Otp.findOneAndUpdate(
    {
      email: normalizedEmail,
      purpose,
      // Only allow update if the existing OTP is older than 2 minutes
      // (i.e. the cooldown has expired). If it's newer, this filter won't match.
      createdAt: { $lt: cooldownCutoff },
    },
    {
      $set: { otp, tempData, createdAt: now },
    },
    { new: true },
  );

  // If no existing doc matched the filter, it could mean:
  //   (a) No doc exists yet → try to insert a fresh one
  //   (b) A doc exists but is within cooldown → rate limit
  if (!result) {
    const existing = await Otp.findOne({ email: normalizedEmail, purpose });
    if (existing) {
      // Doc exists and is within cooldown — reject
      const ageMs = now.getTime() - new Date(existing.createdAt).getTime();
      const secondsLeft = Math.ceil((COOLDOWN_MS - ageMs) / 1000);
      const err = new Error(
        `Please wait ${secondsLeft} seconds before requesting a new OTP.`,
      );
      err.code = "RATE_LIMITED";
      err.secondsLeft = secondsLeft;
      throw err;
    }

    // No doc exists — insert a fresh one.
    // The unique index ensures only ONE concurrent request can succeed here.
    try {
      await Otp.create({
        email: normalizedEmail,
        otp,
        purpose,
        tempData,
        createdAt: now,
      });
    } catch (insertErr) {
      // Duplicate key error: another concurrent request already inserted.
      // Treat this as "already sent" — fetch the existing one for secondsLeft.
      if (insertErr.code === 11000) {
        const race = await Otp.findOne({ email: normalizedEmail, purpose });
        const ageMs = race
          ? now.getTime() - new Date(race.createdAt).getTime()
          : 0;
        const secondsLeft = Math.ceil((COOLDOWN_MS - ageMs) / 1000);
        const err = new Error(
          `Please wait ${secondsLeft} seconds before requesting a new OTP.`,
        );
        err.code = "RATE_LIMITED";
        err.secondsLeft = secondsLeft;
        throw err;
      }
      throw insertErr;
    }
  }

  // Send email
  const transporter = createTransporter();
  const subject =
    purpose === "register"
      ? "Your Eventix Registration OTP"
      : "Your Eventix Login OTP";

  await transporter.sendMail({
    from: `"Eventix" <${process.env.EMAIL_USER}>`,
    to: normalizedEmail,
    subject,
    html: buildEmailHtml(otp, purpose),
  });

  console.log(`[OTP Service] Sent ${purpose} OTP to ${normalizedEmail}`);
}

// -----------------------------------------------
// VERIFY OTP
// - Looks up OTP in database
// - Compares with provided OTP
// - Deletes OTP on success (one-time use)
// - Returns { valid: true/false, message, tempData }
// -----------------------------------------------
async function verifyOtp(email, otp, purpose) {
  const normalizedEmail = email.toLowerCase().trim();

  // Find OTP record in database
  const record = await Otp.findOne({ email: normalizedEmail, purpose });

  if (!record) {
    return {
      valid: false,
      message: "OTP has expired or was not found. Please request a new one.",
    };
  }

  // Compare OTPs
  if (record.otp !== otp.trim()) {
    return {
      valid: false,
      message: "Incorrect OTP. Please check your email and try again.",
    };
  }

  // OTP is valid — delete it (one-time use)
  const tempData = record.tempData;
  await Otp.deleteOne({ _id: record._id });

  return { valid: true, tempData };
}

module.exports = { sendOtp, verifyOtp };
