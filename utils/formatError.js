const AppError = require('./AppError');
const errorTypes = require('./errorTypes');

const handleDBValidationError = (err) => {
  const message = Object.values(err.errors)
    .map((e) => e.message)
    .join(' ');
  return new AppError(message, errorTypes.VALIDATION, 400);
};

module.exports = (error) => {
  let err;

  if (error.originalError) {
    const e = error.originalError;

    if (e instanceof AppError) err = e;
    if (e.name === 'ValidationError') err = handleDBValidationError(err);
  }

  return { message: err ? err.message : error.message };
};
