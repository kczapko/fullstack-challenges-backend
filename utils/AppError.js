class AppError extends Error {
  constructor(message, type, httpStatus = 500) {
    super(message);

    this.isOperational = true;
    this.type = type;
    this.httpStatus = httpStatus;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
