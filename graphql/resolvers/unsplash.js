const validator = require('validator');
const axios = require('axios');

const { fromBuffer } = require('file-type');

const Image = require('../../models/image');

const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');
const { createUnsplashImage } = require('../../utils/files');
const { publicPath } = require('../../utils/path');
const { catchGraphqlConfimed } = require('../../utils/catchAsync');

module.exports = {
  addUnsplashImage: catchGraphqlConfimed(async ({ label, imageUrl }, req) => {
    if (
      // eslint-disable-next-line operator-linebreak
      !validator.isURL(imageUrl, { protocols: ['http', 'https'], require_protocol: true }) ||
      (!imageUrl.endsWith('.jpg') && !imageUrl.endsWith('.png') && !imageUrl.endsWith('.webp'))
    )
      throw new AppError(
        'Not valid photo url. Only http:// and https:// protocols and .jpg, .png and .webp files are allowed.',
        errorTypes.VALIDATION,
        400,
      );

    const res = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });

    const file = await fromBuffer(res.data);
    if (!file || !['image/jpg', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mime))
      throw new AppError('Not valid image.', errorTypes.VALIDATION, 400);

    const dir = await req.user.getImagesDirectory();
    const { filename, width, height } = await createUnsplashImage(res.data, dir);
    const path = `/${publicPath(filename).replace(/\\/g, '/')}`;

    const image = await Image.create({
      path,
      source: imageUrl,
      width,
      height,
      label,
      user: req.user,
    });

    return image;
  }),
  myUnsplashImages: catchGraphqlConfimed(async (args, req) => {
    const imagesQuery = Image.find({ user: req.user }).sort({ createdAt: -1 });
    const images = await imagesQuery;
    return images;
  }),
};
