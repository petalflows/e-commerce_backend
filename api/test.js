module.exports = function (req, res) {
  try {
    return res.status(200).json({
      hello: "it works",
      node: process.version,
      env_check: process.env.SUPABASE_URL ? "URL set" : "URL missing"
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
};
