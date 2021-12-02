const multer = require('multer');

const AppError = require('../utils/AppError');

module.exports = (error, req, res, next) => {
  console.error(`🎃🎃🎃 EXPRESS ERROR START 🎃🎃🎃`);
  console.error(error);
  console.error(`🎃🎃🎃 EXPRESS ERROR END 🎃🎃🎃`);

  let status = 500;
  if (error instanceof AppError) status = error.httpStatus;

  if (process.env.NODE_ENV === 'development') {
    return res.status(status).json({ message: error.message, error });
  }

  let message = 'Internal server error';
  if (error instanceof AppError) message = error.message;
  if (error instanceof multer.MulterError) message = error.message;

  res.status(500).json({ message });
};
