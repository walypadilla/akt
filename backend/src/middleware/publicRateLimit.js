// backend/src/middleware/publicRateLimit.js
const requestCounts = new Map();

/**
 * Rate limiting simple en memoria por IP
 * @param {number} maxRequests - Máximo de requests por ventana
 * @param {number} windowMs - Ventana en milisegundos
 */
const publicRateLimit = (maxRequests = 30, windowMs = 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    // Limpiar entradas viejas periódicamente
    if (requestCounts.size > 5000) requestCounts.clear();

    const now = Date.now();
    const key = `public_${ip}`;

    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      const entry = requestCounts.get(key);
      if (now > entry.resetAt) {
        requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      } else if (entry.count >= maxRequests) {
        return res.status(429).json({
          message: 'Demasiadas solicitudes. Intenta más tarde.',
        });
      } else {
        entry.count++;
      }
    }

    // Headers de seguridad
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    next();
  };
};

module.exports = { publicRateLimit };