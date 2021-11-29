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
        await req.user.sendVerificationEmail(req.user.email);
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
};
