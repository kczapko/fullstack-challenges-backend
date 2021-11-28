const crypto = require('crypto');

const validator = require('validator');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const OAuth = require('oauth-1.0a');

const User = require('../../models/user');
const { generateToken } = require('../../utils/token');
const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');

const generatePassword = () => {
  return crypto.randomBytes(32).toString('hex');
};

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
  autologin: async (args, req) => {
    if (req.authError) throw req.authError;
    if (req.user) return { user: req.user };
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
        const password = generatePassword();

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
        const password = generatePassword();

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
  authWithTwitter: async () => {
    const oauth = OAuth({
      consumer: {
        key: process.env.TWITTER_API_KEY,
        secret: process.env.TWITTER_API_KEY_SECRET,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    const request_data = {
      url: `https://api.twitter.com/oauth/request_token?oauth_callback=${encodeURIComponent(
        process.env.TWITTER_CALLBACK_URL,
      )}`,
      method: 'POST',
    };

    const headers = oauth.toHeader(oauth.authorize(request_data));

    try {
      const res = await axios({
        url: request_data.url,
        method: request_data.method,
        headers,
      });

      const auth = Object.fromEntries(res.data.split('&').map((data) => data.split('=')));

      return `https://api.twitter.com/oauth/authenticate?oauth_token=${auth.oauth_token}`;
    } catch (e) {
      throw e;
    }
  },
  signinWithTwitter: async ({ oauthToken, oauthVerifier }) => {
    try {
      let res = await axios.post(
        `https://api.twitter.com/oauth/access_token?oauth_verifier=${oauthVerifier}&oauth_token=${oauthToken}`,
      );

      const access = Object.fromEntries(res.data.split('&').map((data) => data.split('=')));

      const oauth = OAuth({
        consumer: {
          key: process.env.TWITTER_API_KEY,
          secret: process.env.TWITTER_API_KEY_SECRET,
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
          return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        },
      });

      const request_data = {
        url: `https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true`,
        method: 'GET',
      };

      const headers = oauth.toHeader(
        oauth.authorize(request_data, {
          key: access.oauth_token,
          secret: access.oauth_token_secret,
        }),
      );

      res = await axios({
        url: request_data.url,
        method: request_data.method,
        headers,
      });

      const data = res.data;

      if (data.suspended) {
        throw new AppError('Your twitter account is suspended.', errorTypes.VALIDATION, 403);
      }

      // Check if user exists
      let user = await User.findOne({ email: data.email });

      if (user && user.blocked) {
        throw new AppError('Your account has been blocked.', errorTypes.AUTHENTICATION, 403);
      }

      // Create new account
      if (!user) {
        const password = generatePassword();

        user = await User.create({
          email: data.email,
          password,
          passwordConfirm: password,
          name: data.name,
          photo: data.profile_image_url_https,
          bio: data.description,
        });
      }

      //Send auth data
      const token = await generateToken({ id: user._id });

      return {
        token,
        user,
      };
    } catch (e) {
      throw e;
    }
  },
  authWithGithub: () => {
    const state = generatePassword();

    return {
      url: `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&state=${state}&scope=read:user%20user:email`,
      state: state,
    };
  },
  signinWithGithub: async ({ code }) => {
    try {
      let res = await axios({
        method: 'post',
        url: 'https://github.com/login/oauth/access_token',
        params: {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code,
        },
        headers: { Accept: 'application/json' },
      });

      const accessToken = res.data.access_token;
      const tokenType = res.data.token_type;

      res = await axios({
        url: 'https://api.github.com/user',
        headers: {
          Authorization: `${tokenType} ${accessToken}`,
        },
      });

      const data = res.data;

      if (!data.email) {
        throw new AppError(
          "You don't have public email set on yout github profile.",
          errorTypes.VALIDATION,
          403,
        );
      }

      // Check if user exists
      let user = await User.findOne({ email: data.email });

      if (user && user.blocked) {
        throw new AppError('Your account has been blocked.', errorTypes.AUTHENTICATION, 403);
      }

      // Create new account
      if (!user) {
        const password = generatePassword();

        user = await User.create({
          email: data.email,
          password,
          passwordConfirm: password,
          name: data.name,
          photo: data.avatar_url,
          bio: data.bio,
        });
      }

      //Send auth data
      const token = await generateToken({ id: user._id });

      return {
        token,
        user,
      };
    } catch (e) {
      throw e;
    }
  },
  requestPasswordReset: async ({ email }) => {
    try {
      const user = await User.findOne({ email });
      if (!user) throw new AppError('User not found!', errorTypes.VALIDATION, 400);

      await user.sendPasswordResetToken();
      return true;
    } catch (e) {
      throw e;
    }
    return false;
  },
  changePassword: async (args) => {
    const { token, password, passwordConfirm } = args.changePasswordInput;

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
      const user = await User.findOne({
        passwordResetToken: User.getTokenHash(token),
        passwordResetTokenExpires: { $gte: new Date() },
      });

      if (!user) throw new AppError(`Wrong token or token expired`, errorTypes.VALIDATION, 400);

      user.password = password;
      user.passwordConfirm = passwordConfirm;
      await user.save();

      return true;
    } catch (e) {
      throw e;
    }
    return false;
  },
};
