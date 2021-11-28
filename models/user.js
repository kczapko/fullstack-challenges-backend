const crypto = require('crypto');

const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const { VerificationEmail, PasswordResetEmail } = require('../utils/emails');

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest().toString('hex');
};

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
        message: '{VALUE} is not valid email.',
      },
    },
    emailConfirmed: {
      type: Boolean,
      default: false,
    },
    emailConfirmationToken: String,
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
      maxlength: [200, 'Maximum photo url length is 200 characters.'],
    },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.sendVerificationEmail = async function (emailAddress, changed = false) {
  const token = generateToken();
  const email = new VerificationEmail(emailAddress, {
    name: this.name || this.email,
    token,
    changed,
  });

  try {
    await email.send();

    this.emailConfirmationToken = hashToken(token);
    await this.save();
  } catch (e) {
    throw e;
  }
};

userSchema.methods.verifyEmail = async function (token) {
  if (this.emailConfirmationToken !== hashToken(token)) return false;

  this.emailConfirmed = true;
  this.emailConfirmationToken = undefined;

  try {
    await this.save();
  } catch (e) {
    throw e;
  }

  return true;
};

userSchema.methods.sendPasswordResetToken = async function () {
  const token = generateToken();
  const email = new PasswordResetEmail(this.email, {
    name: this.name || this.email,
    link: `${process.env.APP_URL}/change-password?token=${token}`,
  });

  try {
    await email.send();

    this.passwordResetToken = hashToken(token);
    this.passwordResetTokenExpires = new Date() + 60 * 60 * 1000; //1 hour
    await this.save();
  } catch (e) {
    throw e;
  }
};

userSchema.pre('save', function (next) {
  if (!this.isNew) return next();

  this.wasNew = true;
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, 13);
    this.passwordConfirm = undefined;
    if (!this.isNew) {
      this.passwordChangedAt = new Date();
    }
  } catch (e) {
    throw e;
  }

  next();
});

userSchema.post('save', async function (doc) {
  if (!this.wasNew) return;
  this.wasNew = false;

  await this.sendVerificationEmail(doc.email);
});

module.exports = mongoose.model('User', userSchema);
