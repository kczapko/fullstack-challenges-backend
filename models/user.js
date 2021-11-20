const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: [true, 'User must have an email.'],
      maxlength: [100, 'Maximum length for email is 100 characters.'],
      validate: {
        validator(val) {
          return validator.isEmail(val);
        },
        message: '{VALUE} is not valid email',
      },
    },
    password: {
      type: String,
      required: [true, 'User must have a password.'],
      minlength: [8, 'Password must have at least 8 charactres.'],
    },
    passwordConfirm: {
      type: String,
      validate: {
        validator(val) {
          return val === this.password;
        },
        message: 'Password and password confirmation must match.',
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    name: {
      type: String,
      maxlength: [100, 'Name maximum length is 100 characters.'],
      validator: {
        validate(val) {
          return validator.isAlpha(val, 'en-US', { ignore: ' ' });
        },
        message: 'Name can contain only alphabetical characters and spaces.',
      },
    },
    bio: {
      type: String,
      maxlength: [1000, 'Bio maximum length is 1000 characters.'],
    },
    phone: {
      type: String,
      maxlength: [50, 'Maximum phone number length is 50 characters.'],
      validator: {
        validate(val) {
          return validator.isMobilePhone(val);
        },
        message: 'Invalid phone number.',
      },
    },
    photo: {
      type: String,
      maxlength: [100, 'Maximum photo url length is 100 characters.'],
    },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.pre('save', async function (next) {
  if (!this.isNew) return next();

  try {
    this.password = await bcrypt.hash(this.password, 13);
  } catch (e) {
    throw e;
  }

  this.passwordConfirm = undefined;
  next();
});

module.exports = mongoose.model('User', userSchema);
