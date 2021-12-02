const formatError = require('./formatError');

module.exports = (error) => {
  console.error('🧨🧨🧨 GRAPHQL ERROR START 🧨🧨🧨');
  console.error(error);
  if (error.originalError) {
    console.error('🧨🧨🧨 GRAPHQL ORIGINAL ERROR 🧨🧨🧨');
    console.error(error.originalError);
  }
  console.error('🧨🧨🧨 GRAPHQL ERROR END 🧨🧨🧨');

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
