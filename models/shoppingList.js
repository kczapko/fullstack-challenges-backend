const mongoose = require('mongoose');

const shoppingListSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    unique: true,
    required: [true, 'Shopping list must have a name.'],
    maxlength: [100, 'Maximum shopping list name length is 100 characters.'],
  },
  products: [
    {
      product: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Product',
        required: [true, 'Shopping list product must have a product.'],
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Minimum product quantity is one.'],
        max: [99, 'Maximum product quantity is ninety nine.'],
      },
      completed: {
        type: Boolean,
        default: false,
      },
    },
  ],
  state: {
    type: String,
    enum: ['active', 'cancelled', 'cancelled'],
    default: 'active',
  },
  user: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    required: [true, 'Shopping list must have a user to whom it belongs.'],
  },
});

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
