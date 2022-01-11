const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      trim: true,
      required: [true, 'Message can not be empty.'],
      maxlength: [10000, 'Maximum message length is 10000 characters.'],
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: [true, 'Message must have a user to whom it belongs.'],
    },
    channel: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'ChatChannel',
      required: [true, 'Message must have a channel to whom it belongs.'],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
