const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Owner only
const ownerMiddleware = async (req, res, next) => {
  await authMiddleware(req, res, () => {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Owner access required' });
    }
    next();
  });
};

// Player only
const playerMiddleware = async (req, res, next) => {
  await authMiddleware(req, res, () => {
    if (req.user.role !== 'player') {
      return res.status(403).json({ error: 'Player access required' });
    }
    next();
  });
};

module.exports = { authMiddleware, ownerMiddleware, playerMiddleware };
