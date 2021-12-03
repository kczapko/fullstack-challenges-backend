const validator = require('validator');
const axios = require('axios');

const User = require('../../models/user');

const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');
const { createUserPhoto, deleteFile } = require('../../utils/files');
const { publicPath } = require('../../utils/path');

module.exports = {
  confirmEmail: async ({ token }, req) => {
    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        const result = await req.user.verifyEmail(token);
        return result;
      } catch (e) {
        throw e;
      }
    }
    return false;
  },
  resendConfirmEmail: async (args, req) => {
    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        await req.user.sendVerificationEmail();
        return true;
      } catch (e) {
        throw e;
      }
    }
    return false;
  },
  me: async (args, req) => {
    if (req.authError) throw req.authError;
    if (req.user) return req.user;
  },
  changeMyData: async (args, req) => {
    const { name, bio, phone } = args.userDataInput;

    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        req.user.set({
          name,
          bio,
          phone,
        });
        const user = await req.user.save();
        return user;
      } catch (e) {
        throw e;
      }
    }
  },
  changeMyPassword: async (args, req) => {
    const { currentPassword, password, passwordConfirm } = args.changeMyPasswordInput;

    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        if (!(await req.user.comparePassword(currentPassword)))
          throw new AppError('Wrong current password', errorTypes.VALIDATION, 400);

        if (
          !validator.isLength(password, { max: process.env.MAX_PASSWORD_LENGTH }) ||
          !validator.isLength(passwordConfirm, { max: process.env.MAX_PASSWORD_LENGTH })
        ) {
          throw new AppError(
            `Maximum password length is ${process.env.MAX_PASSWORD_LENGTH} characters.`,
            errorTypes.VALIDATION,
            400,
          );
        }

        req.user.password = password;
        req.user.passwordConfirm = passwordConfirm;
        await req.user.save();

        return true;
      } catch (e) {
        throw e;
      }
    }
    return false;
  },
  deleteMyAccount: async ({ password }, req) => {
    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        if (!(await req.user.comparePassword(password)))
          throw new AppError('Wrong password', errorTypes.VALIDATION, 400);

        await req.user.remove();
        return true;
      } catch (e) {
        throw e;
      }
    }
    return false;
  },
  changeMyEmail: async ({ email }, req) => {
    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        if (await User.findOne({ email }))
          throw new AppError('User with this e-mail already exists', errorTypes.VALIDATION, 400);

        req.user.newEmail = email;
        await req.user.save();
        await req.user.sendVerificationEmail(req.user.email, true);
        await req.user.sendVerificationEmail(req.user.newEmail, true, true);
        return true;
      } catch (e) {
        throw e;
      }
    }
    return false;
  },
  cancelMyNewEmail: async ({ email }, req) => {
    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        req.user.newEmail = undefined;
        req.user.emailConfirmationToken = undefined;
        req.user.newEmailConfirmationToken = undefined;
        await req.user.save();
        return true;
      } catch (e) {
        throw e;
      }
    }
    return false;
  },
  confirmMyNewEmail: async ({ currentEmailToken, newEmailtoken }, req) => {
    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        await req.user.changeEmail(currentEmailToken, newEmailtoken);
        return req.user;
      } catch (e) {
        throw e;
      }
    }
  },
  deleteMyPhoto: async (args, req) => {
    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        if (req.user.photo) {
          await deleteFile(req.user.photo);
          await deleteFile(req.user.photo.replace('.webp', '.png'));

          req.user.photo = undefined;
          await req.user.save();
        }
        return true;
      } catch (e) {
        throw e;
      }
    }
    return false;
  },
  changeMyPhoto: async ({ imageUrl }, req) => {
    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        if (
          !validator.isURL(imageUrl, { protocols: ['http', 'https'], require_protocol: true }) ||
          (!imageUrl.endsWith('.jpg') && !imageUrl.endsWith('.png') && !imageUrl.endsWith('.webp'))
        )
          throw new AppError(
            'Not valid photo url. Only http:// and https:// protocols and .jpg, .png and .webp files are allowed.',
            errorTypes.VALIDATION,
            400,
          );

        const res = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
        });

        const dir = await req.user.getImagesDirectory();
        const filename = await createUserPhoto(res.data, dir);

        if (req.user.photo) {
          await deleteFile(req.user.photo);
          await deleteFile(req.user.photo.replace('.webp', '.png'));
        }

        req.user.photo = `/${publicPath(filename).replaceAll('\\', '/')}`;
        await req.user.save();

        return req.user;
      } catch (e) {
        throw e;
      }
    }
  },
};
