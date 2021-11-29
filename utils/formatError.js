const AppError = require('./AppError');
const errorTypes = require('./errorTypes');

const handleDBValidationError = (err) => {
  const message = Object.values(err.errors)
    .map((e) => e.message)
    .join(' ');
  return new AppError(message, errorTypes.VALIDATION, 400);
};

const handleWebTokenError = (err) => new AppError('Wrong token', errorTypes.AUTHENTICATION, 401);

const handleWebTokenExpiredError = (err) =>
  new AppError('Token expired', errorTypes.AUTHENTICATION, 401);

module.exports = (error) => {
  let err;

  if (error.originalError) {
    const e = error.originalError;

    if (e instanceof AppError) err = e;
    if (e.name === 'ValidationError') err = handleDBValidationError(e);
    if (e.name === 'JsonWebTokenError') err = handleWebTokenError(e);
    if (e.name === 'TokenExpiredError') err = handleWebTokenExpiredError(e);
  }

  return { message: err ? err.message : error.message };
};
