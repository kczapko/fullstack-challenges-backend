const Product = require('../../models/product');
const ProductCategory = require('../../models/productCategory');

const { catchGraphqlConfimed } = require('../../utils/catchAsync');

module.exports = {
  addMyShoppingifyProduct: catchGraphqlConfimed(async ({ productInput }, req) => {
    console.log(productInput);
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
