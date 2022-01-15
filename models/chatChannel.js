const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const chatChannelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      unique: true,
      required: [true, 'Channel must have a name.'],
      minlength: [5, 'Minimum channel name length is 5 characters.'],
      maxlength: [100, 'Maximum channel name length is 100 characters.'],
      validate: {
        validator(val) {
          if (val)
            // prettier-ignore
            return validator.isAlphaLocales.some((locale) => validator.isAlpha(val, locale, { ignore: ' ' }));
          return true;
        },
        message: 'Channel name can contain only alphabetical characters and spaces.',
      },
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'Channel must have a description.'],
      minlength: [10, 'Minimum channel description length is 10 characters.'],
      maxlength: [300, 'Maximum channel description length is 300 characters.'],
    },
    members: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [
        function () {
          return this.isPrivate;
        },
        'You must provide password for private channel.',
      ],
      minlength: [8, 'Password must have at least 8 charactres.'],
    },
  },
  { timestamps: true },
);

chatChannelSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

chatChannelSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 13);

  return next();
});

module.exports = mongoose.model('ChatChannel', chatChannelSchema);
