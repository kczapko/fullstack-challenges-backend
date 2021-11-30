const formatError = require('./formatError');

module.exports = (error) => {
  console.log('🧨🧨🧨');
  console.error(error.originalError ? error.originalError : error);
  console.log('🧨🧨🧨');

  if (process.env.NODE_ENV === 'development') {
    return {
      message: error.message,
      locations: error.locations,
      stack: error.stack ? error.stack.split('\n') : [],
      path: error.path,
      error: error,
      original: error.originalError,
    };
  }

  return formatError(error);
};
