const formatError = require('./formatError');

module.exports = (error) => {
  if (
    // prettier-ignore
    process.env.NODE_ENV === 'production'
    && error.originalError
    && error.originalError.code === 11000
  )
    console.error(error.originalError);

  console.error('🧨🧨🧨 GRAPHQL ERROR START 🧨🧨🧨');
  console.error(`${new Date().toLocaleString()}`);
  if (error.originalError) {
    console.error('🧨🧨🧨 GRAPHQL ORIGINAL ERROR 🧨🧨🧨');
    console.error(error.originalError);
  } else console.error(error);

  console.error('🧨🧨🧨 GRAPHQL ERROR END 🧨🧨🧨');

  if (process.env.NODE_ENV === 'development')
    return {
      message: error.message,
      locations: error.locations,
      stack: error.stack ? error.stack.split('\n') : [],
      path: error.path,
      error,
      original: error.originalError,
    };

  return error.originalError
    ? formatError(error.originalError, true)
    : { message: 'GraphQL Error' };
};
