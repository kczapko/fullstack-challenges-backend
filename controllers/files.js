const path = require('path');

const AppError = require('../utils/AppError');
const errorTypes = require('../utils/errorTypes');

const Upload = require('../utils/Upload');

const photoUpload = new Upload({});

exports.uploadUserPhoto = photoUpload.upload.single('files');
exports.saveUserPhoto = async (req, res, next) => {
  if (req.authError) return next(req.authError);

  console.log(req.file);
  return next(new AppError('Work in progress', errorTypes.VALIDATION, 400));
};
