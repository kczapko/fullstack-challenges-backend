const validator = require('validator');

const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');

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
};
