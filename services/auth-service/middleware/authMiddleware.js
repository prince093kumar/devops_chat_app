const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

module.exports = (req, res, next) => {
  // If API Gateway already processed the request and injected x-user-id, bypass JWT check
  if (req.headers['x-user-id']) {
    req.user = {
      id: req.headers['x-user-id'],
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role'],
      username: req.headers['x-user-username']
    };
    return next();
  }

  // Fallback JWT verification (useful for local dev or direct unit testing of service)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
