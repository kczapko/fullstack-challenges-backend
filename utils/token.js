const util = require('util');
const jwt = require('jsonwebtoken');

const generate = util.promisify(jwt.sign);
const decode = util.promisify(jwt.verify);

exports.generateToken = async (payload) => {
  return generate(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

exports.decodeToken = async (token) => {
  return decode(token, process.env.JWT_SECRET);
};
