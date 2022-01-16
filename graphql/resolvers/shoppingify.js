/* eslint-disable no-underscore-dangle */
/* eslint-disable object-shorthand */
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
    // PROD handle duplicate keys
    let product = await Product.findOne({ name: productInput.name });
    if (product)
      throw new AppError('Product with that name already exists', errorTypes.VALIDATION, 400);
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

    product = Product.create({
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
    /* demo user */
    if (req.user.email === 'demo@demo.demo')
      throw new AppError("Demo user can't delete products", errorTypes.VALIDATION, 400);

    const product = await Product.findOne({ _id: id, user: req.user }).populate('category');

    if (!product) throw new AppError('Product not found!', errorTypes.VALIDATION, 400);

    // Remove product from shopping lists and eventually delete list if it's empty
    const shoppingLists = await ShoppingList.find({
      user: req.user,
      'products.product': product._id,
      state: { $ne: 'active' },
    });

    if (shoppingLists.length) {
      const updatePromises = shoppingLists
        .map((list) => {
          const prod = list.products.find((p) => p.product.toString() === product._id.toString());
          if (prod) {
            list.products.pull(prod);

            if (list.products.length === 0) return list.remove();
            return list.save({ timestamps: false });
          }
          return null;
        })
        .filter((p) => p !== null);

      await Promise.all(updatePromises);
    }

    // Remove category if products count in it is exactly one (our product will be removed)
    const categoryProductsCount = await Product.find({
      user: req.user,
      category: product.category,
    }).countDocuments();

    if (categoryProductsCount === 1) await ProductCategory.findByIdAndDelete(product.category);

    // Remove product
    await product.remove();
    if (product.image) await deleteFile(product.image);

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

    if (!shoppingList.products.length)
      throw new AppError("You can't complete empty shopping list!", errorTypes.VALIDATION, 400);

    shoppingList.set({
      state: 'completed',
    });
    await shoppingList.save();

    return true;
  }),
  cancelMyShoppingList: catchGraphqlConfimed(async (args, req) => {
    const shoppingList = await ShoppingList.findOne({ state: 'active', user: req.user });

    if (!shoppingList) throw new AppError('Shopping List not found!', errorTypes.VALIDATION, 400);

    if (!shoppingList.products.length)
      throw new AppError("You can't cancel empty shopping list!", errorTypes.VALIDATION, 400);

    shoppingList.set({
      state: 'cancelled',
    });
    await shoppingList.save();

    return true;
  }),
  myShoppingHistory: catchGraphqlConfimed(async (args, req) => {
    const shoppingLists = await ShoppingList.find({
      state: { $in: ['completed', 'cancelled'] },
      user: req.user,
    }).sort({ updatedAt: -1 });

    return shoppingLists;
  }),
  mySingleShoppingHistory: catchGraphqlConfimed(async ({ id }, req) => {
    const shoppingList = await ShoppingList.findOne({
      _id: id,
      state: { $in: ['completed', 'cancelled'] },
      user: req.user,
    }).populate({ path: 'products.product', populate: { path: 'category' } });

    if (!shoppingList) throw new AppError('Shopping List not found!', errorTypes.VALIDATION, 400);

    return shoppingList;
  }),
  myShoppingStatistics: catchGraphqlConfimed(async (args, req) => {
    const year = new Date().getFullYear();

    const statistics = await ShoppingList.aggregate([
      {
        $match: {
          state: 'completed',
          user: req.user._id,
          updatedAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $unwind: '$products',
      },
      {
        $match: { 'products.completed': true },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'products.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $lookup: {
          from: 'productcategories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category',
        },
      },
      /* Temporary block = not working on production */
      // {
      //   $group: {
      //     _id: null,
      //     stats: {
      //       $accumulator: {
      //         init: function () {
      //           const currentDate = new Date();
      //           const currentYear = currentDate.getFullYear();
      //           const currentMonth = currentDate.getMonth();
      //           const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

      //           const state = {
      //             currentDate,
      //             currentYear,
      //             currentMonth,
      //             products: [],
      //             categories: [],
      //             monthly: Array(12).fill(0),
      //             daily: Array(daysInMonth[currentMonth]).fill(0),
      //             total: 0,
      //           };

      //           return state;
      //         },
      //         accumulate: function (state, products, product, category, date) {
      //           const prod = state.products.find((p) => p.name === product[0].name);
      //           if (prod) prod.count += products.quantity;
      //           else
      //             state.products.push({
      //               name: product[0].name,
      //               count: products.quantity,
      //             });

      //           const cat = state.categories.find((c) => c.name === category[0].name);
      //           if (cat) cat.count += products.quantity;
      //           else
      //             state.categories.push({
      //               name: category[0].name,
      //               count: products.quantity,
      //             });

      //           const month = date.getMonth();
      //           const day = date.getDate();
      //           // eslint-disable-next-line no-param-reassign
      //           state.monthly[month] += products.quantity;
      //           // eslint-disable-next-line no-param-reassign
      //           if (month === state.currentMonth) state.daily[day - 1] += products.quantity;

      //           // eslint-disable-next-line no-param-reassign
      //           state.total += products.quantity;

      //           return state;
      //         },
      //         accumulateArgs: ['$products', '$product', '$category', '$updatedAt'],
      //         merge: function (state1, state2) {
      //           return {
      //             currentDate: state1.currentDate,
      //             currentYear: state1.currentYear,
      //             currentMonth: state1.currentMonth,
      //             products: [...state1.products, ...state2.products],
      //             categories: [...state1.categories, ...state2.categories],
      //             monthly: [...state1.monthly, ...state2.monthly],
      //             daily: [...state1.daily, ...state2.daily],
      //             total: state1.total + state2.total,
      //           };
      //         },
      //         finalize: function (state) {
      //           state.products.sort((a, b) => b.count - a.count);
      //           state.categories.sort((a, b) => b.count - a.count);
      //           return state;
      //         },
      //         lang: 'js',
      //       },
      //     },
      //   },
      // },
      {
        $project: {
          _id: 0,
          'category.name': 1,
          'product.name': 1,
          'products.quantity': 1,
          updatedAt: 1,
        },
      },
    ]);

    if (statistics.length)
      return JSON.stringify({
        currentDate: new Date(),
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth(),
        stats: statistics,
      });

    return JSON.stringify(statistics);
  }),
};
