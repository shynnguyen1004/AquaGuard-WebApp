function rateLimit({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = "Too many requests, please try again later.",
} = {}) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.startTime >= windowMs) hits.delete(key);
    }
  }, windowMs);

  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || "unknown";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now - entry.startTime >= windowMs) {
      hits.set(key, { count: 1, startTime: now });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
}

module.exports = { rateLimit };
