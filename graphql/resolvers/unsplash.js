const validator = require('validator');
const axios = require('axios');

const { fromBuffer } = require('file-type');

const Image = require('../../models/image');

const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');
const { createUnsplashImage, deleteFile } = require('../../utils/files');
const { publicPath } = require('../../utils/path');
const { catchGraphqlConfimed } = require('../../utils/catchAsync');

module.exports = {
  addMyUnsplashImage: catchGraphqlConfimed(async ({ label, imageUrl }, req) => {
    if (!validator.isURL(imageUrl, { protocols: ['http', 'https'], require_protocol: true }))
      throw new AppError(
        'Not valid photo url. Only http:// and https:// protocols are allowed.',
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
  myUnsplashImages: catchGraphqlConfimed(async ({ search, page, perPage }, req) => {
    const usePage = page > 0 ? page : 1;
    const usePerPage = perPage > 0 ? perPage : 10;

    const getBaseQuery = () => Image.find({ user: req.user }).sort({ createdAt: -1 });
    const getFullSearchQuery = (searchStr) =>
      // eslint-disable-next-line implicit-arrow-linebreak
      getBaseQuery().find({ $text: { $search: searchStr } });
    const getPartialSearchQuery = (regex) => getBaseQuery().find({ label: { $regex: regex } });

    let total = 0;
    let imagesQuery;
    let imagesCountQuery;

    if (!search) {
      imagesQuery = getBaseQuery();
      imagesCountQuery = getBaseQuery();
      total = await imagesCountQuery.countDocuments();
    } else {
      imagesQuery = getFullSearchQuery(search);
      imagesCountQuery = getFullSearchQuery(search);
      total = await imagesCountQuery.countDocuments();

      if (!total) {
        let regex;
        try {
          regex = new RegExp(search, 'gi');
        } catch (err) {
          return {
            total: 0,
            images: [],
          };
        }
        imagesQuery = getPartialSearchQuery(regex);
        imagesCountQuery = getPartialSearchQuery(regex);
        total = await imagesCountQuery.countDocuments();
      }
    }

    imagesQuery.skip((usePage - 1) * usePerPage).limit(usePerPage);
    const images = await imagesQuery;

    return {
      total,
      images,
    };
  }),
  editMyUnsplashImage: catchGraphqlConfimed(async ({ id, label }, req) => {
    const image = await Image.findOne({ _id: id, user: req.user });

    if (!image) throw new AppError('Image not found!', errorTypes.VALIDATION, 400);

    image.set({ label });
    await image.save();

    return image;
  }),
  deleteMyUnsplashImage: catchGraphqlConfimed(async ({ id, password }, req) => {
    if (!(await req.user.comparePassword(password)))
      throw new AppError('Wrong password', errorTypes.VALIDATION, 400);

    const image = await Image.findOne({ _id: id, user: req.user });

    if (!image) throw new AppError('Image not found!', errorTypes.VALIDATION, 400);

    await image.remove();
    await deleteFile(image.path);

    return image;
  }),
};
