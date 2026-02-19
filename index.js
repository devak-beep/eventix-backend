// DIAGNOSTIC: minimal handler to test if Vercel function can run at all
module.exports = async (req, res) => {
  res.json({
    ok: true,
    mongoSet: !!process.env.MONGO_URI,
    emailSet: !!process.env.EMAIL_USER,
    node: process.version,
  });
};
