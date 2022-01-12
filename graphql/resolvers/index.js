const authResolvers = require('./auth');
const accountResolvers = require('./account');
const unsplashResolvers = require('./unsplash');
const shoppingifyResolvers = require('./shoppingify');
const chatResolvers = require('./chat');

module.exports = {
  ...authResolvers,
  ...accountResolvers,
  ...unsplashResolvers,
  ...shoppingifyResolvers,
  ...chatResolvers,
};
