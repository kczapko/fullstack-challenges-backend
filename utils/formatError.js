const multer = require('multer');

const AppError = require('./AppError');
const errorTypes = require('./errorTypes');

const handleDBValidationError = (err) => {
  const message = Object.values(err.errors)
    .map((e) => e.message)
    .join(' ');
  return new AppError(message, errorTypes.VALIDATION, 400);
};

const handleDBDuplicateKeyError = (err) => {
  if (err.keyValue.email) {
    return new AppError('User with that e-mail already exists', errorTypes.VALIDATION, 400);
  } else {
    return new AppError('Internal server error', errorTypes.DATABASE, 500);
  }
};

const handleWebTokenError = (err) => new AppError('Wrong token', errorTypes.AUTHENTICATION, 401);

const handleWebTokenExpiredError = (err) =>
  new AppError('Token expired', errorTypes.AUTHENTICATION, 401);

module.exports = (error, graphqlError = false) => {
  let err;

  if (error instanceof AppError) err = error;
  if (error.name === 'ValidationError') err = handleDBValidationError(error);
  if (error.code === 11000 && e.name === 'MongoServerError') err = handleDBDuplicateKeyError(error);
  if (error.name === 'JsonWebTokenError') err = handleWebTokenError(error);
  if (error.name === 'TokenExpiredError') err = handleWebTokenExpiredError(error);
  if (error instanceof multer.MulterError) err = error;

  return { message: err ? err.message : graphqlError ? 'GraphQL Error' : 'Internal server error' };
};
