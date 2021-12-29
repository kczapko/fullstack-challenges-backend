const validator = require('validator');
const axios = require('axios');

const { fromBuffer } = require('file-type');

const Product = require('../../models/product');
const ProductCategory = require('../../models/productCategory');

const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');
const { createShoppingifyImage } = require('../../utils/files');
const { publicPath } = require('../../utils/path');
const { catchGraphqlConfimed } = require('../../utils/catchAsync');

module.exports = {
  addMyShoppingifyProduct: catchGraphqlConfimed(async ({ productInput }, req) => {
    // category - check for existience / create
    let category = await ProductCategory.findOne({ name: productInput.category, user: req.user });

    if (!category)
      category = await ProductCategory.create({ name: productInput.category, user: req.user });

    // image
    let imagePath;
    if (productInput.imageUrl) {
      if (
        !validator.isURL(productInput.imageUrl, {
          protocols: ['http', 'https'],
          require_protocol: true,
        })
      )
        throw new AppError(
          'Not valid photo url. Only http:// and https:// protocols are allowed.',
          errorTypes.VALIDATION,
          400,
        );

      const res = await axios.get(productInput.imageUrl, {
        responseType: 'arraybuffer',
      });

      const file = await fromBuffer(res.data);
      if (!file || !['image/jpg', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mime))
        throw new AppError('Not valid image.', errorTypes.VALIDATION, 400);

      const dir = await req.user.getImagesDirectory();
      const { filename } = await createShoppingifyImage(res.data, dir);

      imagePath = `/${publicPath(filename).replace(/\\/g, '/')}`;
    }

    const product = Product.create({
      name: productInput.name,
      note: productInput.note,
      imageUrl: imagePath,
      category,
      user: req.user,
    });

    return product;
  }),
  myShoppingifyProductCategories: catchGraphqlConfimed(async (args, req) => {
    const productCategories = await ProductCategory.find({ user: req.user });

    return productCategories;
  }),
  myShoppingifyProducts: catchGraphqlConfimed(async (args, req) => {
    const products = await Product.find({ user: req.user });

    return products;
  }),
};
