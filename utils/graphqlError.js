const formatError = require('./formatError');

module.exports = (error) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🧨🧨🧨');
    console.log(error.originalError ? error.originalError : error);
    console.log('🧨🧨🧨');

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
