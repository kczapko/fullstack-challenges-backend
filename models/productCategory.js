const mongoose = require('mongoose');

const productCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    unique: true,
    required: [true, 'Product category must have a name.'],
    maxlength: [100, 'Maximum product category name length is 100 characters.'],
  },
  user: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    required: [true, 'Product category must have a user to whom it belongs.'],
  },
});

module.exports = mongoose.model('ProductCategory', productCategorySchema);
