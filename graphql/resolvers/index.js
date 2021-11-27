const authResolvers = require('./auth');
const accountResolvers = require('./account');

module.exports = {
  ...authResolvers,
  ...accountResolvers,
};
