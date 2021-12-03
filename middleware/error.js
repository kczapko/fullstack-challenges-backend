const AppError = require('../utils/AppError');
const formatError = require('../utils/formatError');

module.exports = (error, req, res, next) => {
  console.error(`🎃🎃🎃 EXPRESS ERROR START 🎃🎃🎃`);
  console.error(error);
  console.error(`🎃🎃🎃 EXPRESS ERROR END 🎃🎃🎃`);

  let status = 500;
  if (error instanceof AppError) status = error.httpStatus;

  if (process.env.NODE_ENV === 'development') {
    return res.status(status).json({ message: error.message, error });
  }

  res.status(500).json(formatError(error));
};
