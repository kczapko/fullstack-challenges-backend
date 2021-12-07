const crypto = require('crypto');

const validator = require('validator');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const OAuth = require('oauth-1.0a');

const User = require('../../models/user');
const { generateToken } = require('../../utils/token');
const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');
const { catchGraphql, catchGraphqlAuth } = require('../../utils/catchAsync');

const generatePassword = () => crypto.randomBytes(32).toString('hex');

module.exports = {
  login: catchGraphql(async ({ loginInput }) => {
    const { email, password } = loginInput;

    const user = await User.findOne({ email });

    if (!user) throw new AppError('Wrong email or password.', errorTypes.AUTHENTICATION, 404);

    if (user.blocked)
      throw new AppError('Your account has been blocked.', errorTypes.AUTHENTICATION, 403);

    if (user.loginAttempts >= process.env.MAX_LOGIN_ATTEMPTS)
      throw new AppError(
        'Maximum login attempts reached! Please reset your password.',
        errorTypes.AUTHENTICATION,
        401,
      );

    if (!(await user.comparePassword(password))) {
      /* demo user */
      if (user.email !== 'demo@demo.demo') {
        await user.set({ loginAttempts: user.loginAttempts + 1 });
        await user.save();
      }

      throw new AppError('Wrong email or password.', errorTypes.AUTHENTICATION, 401);
    }

    await user.set({ loginAttempts: 0 });
    await user.save();

    // eslint-disable-next-line no-underscore-dangle
    const token = await generateToken({ id: user._id });

    return {
      token,
      user,
    };
  }),
  autologin: catchGraphqlAuth(async (args, req) => ({ user: req.user })),
  signup: catchGraphql(async ({ signupInput }) => {
    const { email, password, passwordConfirm } = signupInput;

    if (
      // eslint-disable-next-line operator-linebreak
      !validator.isLength(password, { max: process.env.MAX_PASSWORD_LENGTH }) ||
      !validator.isLength(passwordConfirm, {
        max: process.env.MAX_PASSWORD_LENGTH,
      })
    )
      throw new AppError(
        `Maximum password length is ${process.env.MAX_PASSWORD_LENGTH} characters.`,
        errorTypes.VALIDATION,
        400,
      );

    let user = await User.findOne({ email });
    if (user)
      throw new AppError('User with that email already exists.', errorTypes.VALIDATION, 400);

    user = await User.create({ email, password, passwordConfirm });
    // eslint-disable-next-line no-underscore-dangle
    const token = await generateToken({ id: user._id });

    return {
      token,
      user,
    };
  }),
  signinWithGoogle: catchGraphql(async ({ idToken }) => {
    const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT);

    // 1. Verify token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_OAUTH_CLIENT,
    });
    const payload = ticket.getPayload();

    if (!payload.email_verified)
      throw new AppError('Please verify your google email first.', errorTypes.VALIDATION, 403);

    // 2. Check if user exists
    let user = await User.findOne({ email: payload.email });

    if (user && user.blocked)
      throw new AppError('Your account has been blocked.', errorTypes.AUTHENTICATION, 403);

    // 2a Create new account
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

    // 3 Send auth data
    // eslint-disable-next-line no-underscore-dangle
    const token = await generateToken({ id: user._id });

    return {
      token,
      user,
    };
  }),
  signinWithFacebook: catchGraphql(async ({ accessToken, userId }) => {
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

    const { data } = res;

    // 4. Check if user exists
    let user = await User.findOne({ email: data.email });

    if (user && user.blocked)
      throw new AppError('Your account has been blocked.', errorTypes.AUTHENTICATION, 403);

    // 4a Create new account
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

    // 5 Send auth data
    // eslint-disable-next-line no-underscore-dangle
    const token = await generateToken({ id: user._id });

    return {
      token,
      user,
    };
  }),
  authWithTwitter: catchGraphql(async () => {
    const oauth = OAuth({
      consumer: {
        key: process.env.TWITTER_API_KEY,
        secret: process.env.TWITTER_API_KEY_SECRET,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString, key) {
        return crypto.createHmac('sha1', key).update(baseString).digest('base64');
      },
    });

    const requestData = {
      url: `https://api.twitter.com/oauth/request_token?oauth_callback=${encodeURIComponent(
        process.env.TWITTER_CALLBACK_URL,
      )}`,
      method: 'POST',
    };

    const headers = oauth.toHeader(oauth.authorize(requestData));

    const res = await axios({
      url: requestData.url,
      method: requestData.method,
      headers,
    });

    const auth = Object.fromEntries(res.data.split('&').map((data) => data.split('=')));

    return `https://api.twitter.com/oauth/authenticate?oauth_token=${auth.oauth_token}`;
  }),
  signinWithTwitter: catchGraphql(async ({ oauthToken, oauthVerifier }) => {
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
      hash_function(baseString, key) {
        return crypto.createHmac('sha1', key).update(baseString).digest('base64');
      },
    });

    const requestData = {
      url: 'https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true',
      method: 'GET',
    };

    const headers = oauth.toHeader(
      oauth.authorize(requestData, {
        key: access.oauth_token,
        secret: access.oauth_token_secret,
      }),
    );

    res = await axios({
      url: requestData.url,
      method: requestData.method,
      headers,
    });

    const { data } = res;

    if (data.suspended)
      throw new AppError('Your twitter account is suspended.', errorTypes.VALIDATION, 403);

    // Check if user exists
    let user = await User.findOne({ email: data.email });

    if (user && user.blocked)
      throw new AppError('Your account has been blocked.', errorTypes.AUTHENTICATION, 403);

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

    // Send auth data
    // eslint-disable-next-line no-underscore-dangle
    const token = await generateToken({ id: user._id });

    return {
      token,
      user,
    };
  }),
  authWithGithub: () => {
    const state = generatePassword();

    return {
      url: `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&state=${state}&scope=read:user%20user:email`,
      state,
    };
  },
  signinWithGithub: catchGraphql(async ({ code }) => {
    let res = await axios({
      method: 'post',
      url: 'https://github.com/login/oauth/access_token',
      params: {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
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

    const { data } = res;

    if (!data.email)
      throw new AppError(
        "You don't have public email set on yout github profile.",
        errorTypes.VALIDATION,
        403,
      );

    // Check if user exists
    let user = await User.findOne({ email: data.email });

    if (user && user.blocked)
      throw new AppError('Your account has been blocked.', errorTypes.AUTHENTICATION, 403);

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

    // Send auth data
    // eslint-disable-next-line no-underscore-dangle
    const token = await generateToken({ id: user._id });

    return {
      token,
      user,
    };
  }),
  requestPasswordReset: catchGraphql(async ({ email }) => {
    const user = await User.findOne({ email });
    if (!user) throw new AppError('User not found!', errorTypes.VALIDATION, 400);

    await user.sendPasswordResetToken();
    return true;
  }),
  changePassword: catchGraphql(async (args) => {
    const { token, password, passwordConfirm } = args.changePasswordInput;

    if (
      // eslint-disable-next-line operator-linebreak
      !validator.isLength(password, { max: process.env.MAX_PASSWORD_LENGTH }) ||
      !validator.isLength(passwordConfirm, {
        max: process.env.MAX_PASSWORD_LENGTH,
      })
    )
      throw new AppError(
        `Maximum password length is ${process.env.MAX_PASSWORD_LENGTH} characters.`,
        errorTypes.VALIDATION,
        400,
      );

    const user = await User.findOne({
      passwordResetToken: User.getTokenHash(token),
      passwordResetTokenExpires: { $gte: new Date() },
    });

    if (!user) throw new AppError('Wrong token or token expired', errorTypes.VALIDATION, 400);

    user.password = password;
    user.passwordConfirm = passwordConfirm;
    await user.save();

    return true;
  }),
};
