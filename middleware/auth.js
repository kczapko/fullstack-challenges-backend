const User = require('../models/user');
const { decodeToken } = require('../utils/token');

module.exports = async (req, res, next) => {
  if (!req.headers.authorization) return next();

  const token = req.headers.authorization.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = await decodeToken(token);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch (e) {
    console.log(e);
  }

  next();
};
