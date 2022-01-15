const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    unique: true,
    required: [true, 'Product must have a name.'],
    maxlength: [100, 'Maximum product name length is 100 characters.'],
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Maximum product note length is 100 characters.'],
  },
  image: {
    type: String,
    maxlength: [100, 'Maximum image path length is 100 characters.'],
    get(v) {
      if (!v) return null;
      return `${process.env.SERVER_URL}${v}`;
    },
  },
  category: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'ProductCategory',
    required: [true, 'Product must have a category to whom it belongs.'],
  },
  user: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    required: [true, 'Product must have a user to whom it belongs.'],
  },
});

module.exports = mongoose.model('Product', productSchema);
