const Upload = require('../utils/Upload');
const { createUserPhoto, deleteFile } = require('../utils/files');
const { publicPath } = require('../utils/path');
const { catchExpressConfimed } = require('../utils/catchAsync');

const userPhotoUpload = new Upload({});

exports.uploadUserPhoto = userPhotoUpload.upload.single('files');
exports.saveUserPhoto = catchExpressConfimed(async (req, res, next) => {
  const dir = await req.user.getImagesDirectory();
  const filename = await createUserPhoto(req.file.buffer, dir);

  if (req.user.photo) {
    await deleteFile(req.user.photo);
    await deleteFile(req.user.photo.replace('.webp', '.png'));
  }

  req.user.photo = `/${publicPath(filename).replace(/\\/g, '/')}`;
  await req.user.save();

  return res.status(201).json({ file: req.user.photo });
});
