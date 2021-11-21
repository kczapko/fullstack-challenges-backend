const crypto = require('crypto');

const validator = require('validator');
const { OAuth2Client } = require('google-auth-library');

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
        throw new AppError(`User with that email already exists.`, errorTypes.VALIDATION, 400);
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
  signinWithGoogle: async ({ idToken }) => {
    const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT);

    try {
      //1. Verify token
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_OAUTH_CLIENT,
      });
      const payload = ticket.getPayload();

      if (!payload.email_verified) {
        throw new AppError('Please verify your google email first.', errorTypes.VALIDATION, 400);
      }

      //2. Check if user exists
      let user = await User.findOne({ email: payload.email });

      //2a Create new account
      if (!user) {
        const password = crypto.createHash('sha256').update(Math.random().toString()).digest();
        user = await User.create({
          email: payload.email,
          password,
          passwordConfirm: password,
          name: payload.name,
          photo: payload.picture,
        });
      }

      //3 Send auth data
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
