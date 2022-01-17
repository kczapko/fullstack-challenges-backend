const mongoose = require('mongoose');

const productCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'Product category must have a name.'],
    maxlength: [100, 'Maximum product category name length is 100 characters.'],
  },
  user: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    required: [true, 'Product category must have a user to whom it belongs.'],
  },
});

productCategorySchema.index({ name: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('ProductCategory', productCategorySchema);
