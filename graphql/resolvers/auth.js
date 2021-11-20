const validator = require('validator');

const User = require('../../models/user');
const { generateToken } = require('../../utils/token');
const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');

module.exports = {
  login: async ({ loginInput }) => {
    const { email, password } = loginInput;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AppError('Wrong email or password.', errorTypes.AUTHENTICATION, 404);
      }

      if (user.blocked) {
        throw new AppError('Your account has been blocked.', errorTypes.AUTHENTICATION, 403);
      }

      if (user.loginAttempts >= process.env.MAX_LOGIN_ATTEMPTS) {
        throw new AppError(
          'Maximum login attempts reached! Please reset your password.',
          errorTypes.AUTHENTICATION,
          401,
        );
      }

      if (!(await user.comparePassword(password))) {
        await user.set({ loginAttempts: user.loginAttempts + 1 });
        await user.save();

        throw new AppError('Wrong email or password.', errorTypes.AUTHENTICATION, 401);
      }

      await user.set({ loginAttempts: 0 });
      await user.save();
      const token = await generateToken({ id: user._id });

      return {
        token,
        user,
      };
    } catch (e) {
      throw e;
    }
  },
  signup: async ({ signupInput }) => {
    const { email, password, passwordConfirm } = signupInput;

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

    try {
      let user = await User.findOne({ email });
      if (user) {
        throw new AppError(`User with that email aleredy exists.`, errorTypes.VALIDATION, 400);
      }

      user = await User.create({ email, password, passwordConfirm });
      const token = await generateToken({ id: user._id });

      return {
        token,
        user,
      };
    } catch (e) {
      throw e;
    }
  },
};
