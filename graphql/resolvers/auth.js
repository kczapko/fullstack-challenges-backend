const crypto = require('crypto');

const validator = require('validator');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

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
        throw new AppError('Please verify your google email first.', errorTypes.VALIDATION, 403);
      }

      //2. Check if user exists
      let user = await User.findOne({ email: payload.email });

      if (user && user.blocked) {
        throw new AppError('Your account has been blocked.', errorTypes.AUTHENTICATION, 403);
      }

      //2a Create new account
      if (!user) {
        const password = crypto
          .createHash('sha256')
          .update(Math.random().toString())
          .digest()
          .toString('hex');

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
  signinWithFacebook: async ({ accessToken, userId }) => {
    try {
      // 1. Generate app token
      let res = await axios.get(
        `https://graph.facebook.com/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&grant_type=client_credentials`,
      );

      const appToken = res.data.access_token;

      // 2. Verify token and data
      res = await axios.get(
        `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`,
      );

      const debugToken = res.data.data;

      if (!debugToken.is_valid)
        throw new AppError('Invalid credentials (token)', errorTypes.AUTHENTICATION, 403);

      if (debugToken.app_id !== process.env.FACEBOOK_APP_ID)
        throw new AppError('Invalid credentials (app)', errorTypes.AUTHENTICATION, 403);

      if (debugToken.user_id !== userId)
        throw new AppError('Invalid credentials (user)', errorTypes.AUTHENTICATION, 403);

      // 3. Get user data
      res = await axios.get(
        `https://graph.facebook.com/${debugToken.user_id}?fields=id,name,email,picture&access_token=${accessToken}`,
      );

      const data = res.data;

      //4. Check if user exists
      let user = await User.findOne({ email: data.email });

      if (user && user.blocked) {
        throw new AppError('Your account has been blocked.', errorTypes.AUTHENTICATION, 403);
      }

      //4a Create new account
      if (!user) {
        const password = crypto
          .createHash('sha256')
          .update(Math.random().toString())
          .digest()
          .toString('hex');

        user = await User.create({
          email: data.email,
          password,
          passwordConfirm: password,
          name: data.name,
          photo: data.picture.data.url,
        });
      }

      //5 Send auth data
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
