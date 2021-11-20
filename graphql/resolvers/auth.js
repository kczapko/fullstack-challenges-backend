const validator = require('validator');

const User = require('../../models/user');
const { generateToken } = require('../../utils/token');

module.exports = {
  login: async ({ loginInput }) => {
    const { email, password } = loginInput;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.blocked) {
        throw new Error('Your account has been blocked');
      }

      if (user.loginAttempts >= process.env.MAX_LOGIN_ATTEMPTS) {
        throw new Error('Maximum login attempts reached! Please reset your password.');
      }

      if (!(await user.comparePassword(password))) {
        await user.update({ $inc: { loginAttempts: 1 } });
        throw new Error('Wrong password');
      }

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
      throw new Error(`Maximum password length is ${process.env.MAX_PASSWORD_LENGTH} characters.`);
    }

    try {
      const user = await User.create({ email, password, passwordConfirm });
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
