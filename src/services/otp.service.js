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
  const title = isRegister ? "Verify Your Email" : "Login Verification";
  const subtitle = isRegister
    ? "You're almost there! Enter the OTP below to complete your registration."
    : "A login attempt was made to your Eventix account. Use the OTP below to confirm it was you.";
  const badgeText = isRegister ? "Registration OTP" : "Login OTP";
  const badgeColor = isRegister ? "#059669" : "#2563eb";
  const badgeBg = isRegister ? "#d1fae5" : "#dbeafe";

  // Base64-encoded SVG logo (better email client compatibility than inline SVG)
  const logoBase64 =
    "PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCAxMjAgMTIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE0IiBmaWxsPSIjNjFkYWZiIi8+PGNpcmNsZSBjeD0iNTUiIGN5PSIyMCIgcj0iMTQiIGZpbGw9IiM0ZmMzZTgiIG9wYWNpdHk9IjAuODUiLz48Y2lyY2xlIGN4PSI5MCIgY3k9IjIwIiByPSIxNCIgZmlsbD0iIzNkYWVkNSIgb3BhY2l0eT0iMC43Ii8+PGNpcmNsZSBjeD0iMjAiIGN5PSI1NSIgcj0iMTQiIGZpbGw9IiM2MWRhZmIiLz48Y2lyY2xlIGN4PSI1NSIgY3k9IjU1IiByPSIxNCIgZmlsbD0iIzRmYzNlOCIgb3BhY2l0eT0iMC44NSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iOTAiIHI9IjE0IiBmaWxsPSIjNjFkYWZiIi8+PGNpcmNsZSBjeD0iNTUiIGN5PSI5MCIgcj0iMTQiIGZpbGw9IiM0ZmMzZTgiIG9wYWNpdHk9IjAuODUiLz48Y2lyY2xlIGN4PSI5MCIgY3k9IjkwIiByPSIxNCIgZmlsbD0iIzNkYWVkNSIgb3BhY2l0eT0iMC43Ii8+PC9zdmc+";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- HEADER / LOGO -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" valign="middle" style="padding-right:12px;">
                    <img src="data:image/svg+xml;base64,${logoBase64}" alt="Eventix" width="48" height="48" style="display:block;" />
                  </td>
                  <td align="left" valign="middle">
                    <span style="font-size:26px;font-weight:800;color:#0f172a;letter-spacing:0.5px;">Eventix</span>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8;font-size:13px;margin:10px 0 0;text-transform:uppercase;letter-spacing:1px;">Enterprise Event Management</p>
            </td>
          </tr>

          <!-- MAIN CARD -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

              <!-- Top accent line -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#0ea5e9,#3b82f6,#6366f1);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 40px 36px;">

                <!-- Badge -->
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <span style="background:${badgeBg};color:${badgeColor};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:5px 16px;border-radius:100px;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <h1 style="margin:0;font-size:26px;font-weight:800;color:#0f172a;">${title}</h1>
                  </td>
                </tr>

                <!-- Subtitle -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <p style="margin:0;font-size:15px;color:#64748b;line-height:1.7;max-width:400px;">${subtitle}</p>
                  </td>
                </tr>

                <!-- OTP Box -->
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <table cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#3b82f6 100%);border-radius:16px;padding:28px 40px;text-align:center;width:100%;">
                      <tr>
                        <td align="center">
                          <p style="margin:0 0 12px;font-size:12px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;font-weight:600;">Your One-Time Password</p>
                          <span style="font-size:48px;font-weight:900;letter-spacing:16px;color:#ffffff;display:block;text-shadow:0 2px 12px rgba(0,0,0,0.3);">${otp}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Timer warning -->
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 20px;">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:13px;color:#78350f;">
                            &#9201;&nbsp; This OTP expires in <strong style="color:#d97706;">2 minutes</strong>. Do not share it with anyone.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Security tip -->
                <tr>
                  <td align="center" style="padding-bottom:4px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 20px;">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                            &#128274;&nbsp;<strong style="color:#475569;">Security tip:</strong> Eventix will never call you to ask for this OTP. If you didn't request this, ignore this email — your account is safe.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} Eventix &nbsp;&middot;&nbsp; Enterprise Event Management
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
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
