const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: [true, 'Image must have a path.'],
      maxlength: [100, 'Maximum image path length is 100 characters.'],
      get(v) {
        if (!v) return null;
        return `${process.env.SERVER_URL}${v}`;
      },
    },
    source: {
      type: String,
      required: [true, 'Image must have a source url.'],
      maxlength: [200, 'Maximum image source url is 200 characters.'],
    },
    width: {
      type: Number,
      required: [true, 'Image must have a width.'],
    },
    height: {
      type: Number,
      required: [true, 'Image must have a height.'],
    },
    label: {
      type: String,
      required: [true, 'Image must have a label.'],
      maxlength: [200, 'Maximum image label is 200 characters.'],
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: [true, 'Image must have a user to whom it belongs.'],
    },
  },
  { timestamps: true },
);

imageSchema.index({ label: 'text' });

module.exports = mongoose.model('Image', imageSchema);