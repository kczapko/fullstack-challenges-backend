const mongoose = require('mongoose');

const chatMessageMetaSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Message meta must have type.'],
    enum: ['page', 'image'],
  },
  url: {
    type: String,
    required: [true, 'Message meta must have url.'],
    max: [500, 'Maximim message meta url length is 500 characters.'],
  },
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  image: {
    type: String,
  },
});

const chatMessageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      trim: true,
      required: [true, 'Message can not be empty.'],
      maxlength: [1000, 'Maximum message length is 1000 characters.'],
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
    meta: {
      type: chatMessageMetaSchema,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
