const validator = require('validator');

const User = require('../../models/user');

module.exports = {
  login: async ({ loginInput }) => {
    const { email, password } = loginInput;
    let user;

    try {
      user = await User.findOne({ email });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.loginAttempts >= process.env.MAX_LOGIN_ATTEMPTS) {
        throw new Error('Maximum login attempts reached! Please reset your password.');
      }

      if (!(await user.comparePassword(password))) {
        await user.update({ $inc: { loginAttempts: 1 } });
        throw new Error('Wrong password');
      }

      return {
        token: '123',
        user,
      };
    } catch (e) {
      throw e;
    }
  },
  signup: async ({ signupInput }) => {
    const { email, password, passwordConfirm } = signupInput;
    let user;

    if (
      !validator.isLength(password, { max: process.env.MAX_PASSWORD_LENGTH }) ||
      !validator.isLength(passwordConfirm, { max: process.env.MAX_PASSWORD_LENGTH })
    ) {
      throw new Error(`Maximum password length is ${process.env.MAX_PASSWORD_LENGTH} characters.`);
    }

    try {
      user = await User.create({ email, password, passwordConfirm });
    } catch (e) {
      throw e;
    }

    return {
      token: '123',
      user,
    };
  },
};
