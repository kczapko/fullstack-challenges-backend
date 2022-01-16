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
  if (err.keyValue.email)
    return new AppError('User with that e-mail already exists', errorTypes.VALIDATION, 400);

  if (err.keyValue.name) {
    // if (err.message.includes('fullstack.products'))
    if (err.message.indexOf('fullstack.products') > -1)
      return new AppError('Product with that name already exists', errorTypes.VALIDATION, 400);
    // if (err.message.includes('fullstack.chatchannels'))
    if (err.message.indexOf('fullstack.chatchannels') > -1)
      return new AppError('Channel with that name already exists', errorTypes.VALIDATION, 400);

    return new AppError('Internal server error', errorTypes.DATABASE, 500);
  }

  return new AppError('Internal server error', errorTypes.DATABASE, 500);
};

const handleWebTokenError = () => new AppError('Wrong token', errorTypes.AUTHENTICATION, 401);
// prettier-ignore
const handleWebTokenExpiredError = () => new AppError('Token expired', errorTypes.AUTHENTICATION, 401);
// prettier-ignore
const handleMailSendError = (err) => new AppError(`It looks like ${err.rejected.join(' ')} does not exist.`, errorTypes.MAIL, 400);

module.exports = (error, graphqlError = false) => {
  let err;

  if (error instanceof AppError) err = error;
  if (error.name === 'ValidationError') err = handleDBValidationError(error);
  if (error.code === 11000 && error.name === 'MongoServerError')
    err = handleDBDuplicateKeyError(error);
  if (error.name === 'JsonWebTokenError') err = handleWebTokenError(error);
  if (error.name === 'TokenExpiredError') err = handleWebTokenExpiredError(error);
  if (error instanceof multer.MulterError) err = error;
  if (error.code === 'EENVELOPE' && error.responseCode === 550) err = handleMailSendError(error);

  return {
    message: err ? err.message : 'Internal server error',
  };
};
