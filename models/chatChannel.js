const mongoose = require('mongoose');

const chatChannelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      unique: true,
      required: [true, 'Channel must have a name.'],
      minlength: [5, 'Minimum channel name length is 5 characters.'],
      maxlength: [100, 'Maximum channel name length is 100 characters.'],
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'Channel must have a description.'],
      minlength: [10, 'Minimum channel description length is 10 characters.'],
      maxlength: [500, 'Maximum channel description length is 500 characters.'],
    },
    members: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model('ChatChannel', chatChannelSchema);
