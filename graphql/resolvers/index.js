const authResolvers = require('./auth');
const accountResolvers = require('./account');
const unsplashResolvers = require('./unsplash');

module.exports = {
  ...authResolvers,
  ...accountResolvers,
  ...unsplashResolvers,
};
