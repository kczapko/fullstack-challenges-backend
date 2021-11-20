const util = require('util');
const jwt = require('jsonwebtoken');

const generate = util.promisify(jwt.sign);

exports.generateToken = async (payload) => {
  return await generate(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};
