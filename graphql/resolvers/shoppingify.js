const validator = require('validator');
const axios = require('axios');

const { fromBuffer } = require('file-type');

const Product = require('../../models/product');
const ProductCategory = require('../../models/productCategory');
const ShoppingList = require('../../models/shoppingList');

const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');
const { createShoppingifyImage, deleteFile } = require('../../utils/files');
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
      image: imagePath,
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
  myShoppingifyProduct: catchGraphqlConfimed(async ({ id }, req) => {
    const product = await Product.findOne({ _id: id, user: req.user }).populate('category');

    if (!product) throw new AppError('Product not found!', errorTypes.VALIDATION, 400);

    return product;
  }),
  deleteMyShoppingifyProduct: catchGraphqlConfimed(async ({ id }, req) => {
    const product = await Product.findOne({ _id: id, user: req.user }).populate('category');

    if (!product) throw new AppError('Product not found!', errorTypes.VALIDATION, 400);

    await product.remove();
    if (!product.image.endsWith('undefined')) await deleteFile(product.image);

    return product;
  }),
  myShoppingList: catchGraphqlConfimed(async (args, req) => {
    const shoppingList = await ShoppingList.findOne({ state: 'active', user: req.user });

    return shoppingList;
  }),
  saveMyShoppingList: catchGraphqlConfimed(async ({ shoppingListInput }, req) => {
    const shoppingList = await ShoppingList.create({
      name: shoppingListInput.name,
      products: shoppingListInput.products,
      user: req.user,
    });

    return shoppingList;
  }),
  updateMyShoppingList: catchGraphqlConfimed(async ({ shoppingListInput }, req) => {
    const shoppingList = await ShoppingList.findOne({ state: 'active', user: req.user });

    if (!shoppingList) throw new AppError('Shopping List not found!', errorTypes.VALIDATION, 400);

    shoppingList.set({
      name: shoppingListInput.name,
      products: shoppingListInput.products,
    });

    await shoppingList.save();

    return shoppingList;
  }),
  toggleShoppingifyProductCompletion: catchGraphqlConfimed(async ({ id, completed }, req) => {
    const shoppingList = await ShoppingList.findOne({ state: 'active', user: req.user });

    if (!shoppingList) throw new AppError('Shopping List not found!', errorTypes.VALIDATION, 400);

    // eslint-disable-next-line no-underscore-dangle
    const product = shoppingList.products.find((p) => p.product._id.toString() === id);

    if (!product)
      throw new AppError('Product not found in Shopping List!', errorTypes.VALIDATION, 400);

    product.set({ completed });
    await shoppingList.save();

    return true;
  }),
  completeMyShoppingList: catchGraphqlConfimed(async (args, req) => {
    const shoppingList = await ShoppingList.findOne({ state: 'active', user: req.user });

    if (!shoppingList) throw new AppError('Shopping List not found!', errorTypes.VALIDATION, 400);

    shoppingList.set({
      state: 'completed',
    });
    await shoppingList.save();

    return true;
  }),
  cancelMyShoppingList: catchGraphqlConfimed(async (args, req) => {
    const shoppingList = await ShoppingList.findOne({ state: 'active', user: req.user });

    if (!shoppingList) throw new AppError('Shopping List not found!', errorTypes.VALIDATION, 400);

    shoppingList.set({
      state: 'cancelled',
    });
    await shoppingList.save();

    return true;
  }),
};
