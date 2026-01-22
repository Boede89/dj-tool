const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Kein Token bereitgestellt' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.djId = decoded.djId;
    req.isSuperadmin = decoded.isSuperadmin || false;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Ungültiger Token' });
  }
};

module.exports = { authenticate };
