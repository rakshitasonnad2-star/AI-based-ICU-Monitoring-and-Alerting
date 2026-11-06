const jwt = require('jsonwebtoken');
const { userStore } = require('../storage/fileStore');

exports.protect = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Access denied. Please login.' });
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = userStore.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    const { password, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: `Role '${req.user.role}' is not authorized for this action.` });
  next();
};
