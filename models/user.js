const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');

const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const { VerificationEmail, PasswordResetEmail } = require('../utils/emails');
const AppError = require('../utils/AppError');
const errorTypes = require('../utils/errorTypes');
const { baseDir } = require('../utils/path');

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
      trim: true,
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
      trim: true,
      maxlength: [100, 'Name maximum length is 100 characters.'],
      validate: {
        validator(val) {
          if (val) {
            return validator.isAlphaLocales.some((locale) =>
              validator.isAlpha(val, locale, { ignore: ' ' }),
            );
          }
          return true;
        },
        message: 'Name can contain only alphabetical characters and spaces.',
      },
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio maximum length is 1000 characters.'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [50, 'Maximum phone number length is 50 characters.'],
      validate: {
        validator(val) {
          if (val) {
            return validator.isMobilePhone(val);
          }
          return true;
        },
        message: 'Invalid phone number.',
      },
    },
    photo: {
      type: String,
      maxlength: [200, 'Maximum photo url length is 200 characters.'],
      get(v) {
        if (!v) return;
        if (v.startsWith('http') || v.startsWith('https')) return v;
        return `${process.env.SERVER_URL}${v}`;
      },
    },
    newEmail: {
      type: String,
      trim: true,
      maxlength: [100, 'Maximum length for email is 100 characters.'],
      validate: {
        validator(val) {
          return validator.isEmail(val);
        },
        message: '{VALUE} is not valid email.',
      },
    },
    newEmailConfirmationToken: String,
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.sendVerificationEmail = async function (
  emailAddress,
  changed = false,
  newEmail = false,
) {
  const token = generateToken();
  const email = new VerificationEmail(emailAddress ? emailAddress : this.email, {
    name: this.name || this.email,
    token,
    changed,
    newEmail,
  });

  try {
    if (newEmail) {
      this.newEmailConfirmationToken = hashToken(token);
    } else {
      this.emailConfirmationToken = hashToken(token);
    }
    await this.save();

    await email.send();
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

userSchema.methods.changeEmail = async function (currentEmailToken, newEmailtoken) {
  if (this.emailConfirmationToken !== hashToken(currentEmailToken))
    throw new AppError('Wrong current e-mail token', errorTypes.VALIDATION, 400);

  if (this.newEmailConfirmationToken !== hashToken(newEmailtoken))
    throw new AppError('Wrong new e-mail token', errorTypes.VALIDATION, 400);

  try {
    this.email = this.newEmail;
    this.newEmail = undefined;
    this.emailConfirmationToken = undefined;
    this.newEmailConfirmationToken = undefined;
    await this.save();
  } catch (e) {
    throw e;
  }
};

userSchema.methods.sendPasswordResetToken = async function () {
  const token = generateToken();
  const email = new PasswordResetEmail(this.email, {
    name: this.name || this.email,
    token,
    url: `${process.env.APP_URL}/change-password`,
  });

  try {
    this.passwordResetToken = hashToken(token);
    this.passwordResetTokenExpires = Date.now() + 60 * 60 * 1000; //1 hour
    await this.save();
    await email.send();
  } catch (e) {
    throw e;
  }
};

userSchema.statics.getTokenHash = function (token) {
  return hashToken(token);
};

userSchema.methods.getImagesDirectory = async function () {
  const dir = path.join(baseDir, 'public', 'images', 'user', this._id.toString());
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    throw e;
  }
  return dir;
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
      this.passwordResetToken = undefined;
      this.passwordResetTokenExpires = undefined;
    }
  } catch (e) {
    throw e;
  }

  next();
});

userSchema.post('save', async function () {
  if (!this.wasNew) return;
  this.wasNew = false;

  await this.sendVerificationEmail();
});

module.exports = mongoose.model('User', userSchema);
