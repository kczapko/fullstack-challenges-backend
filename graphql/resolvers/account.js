const validator = require('validator');
const axios = require('axios');

const User = require('../../models/user');

const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');
const { createUserPhoto, deleteFile, deleteDir } = require('../../utils/files');
const { publicPath } = require('../../utils/path');
const { catchGraphqlAuth, catchGraphqlConfimed } = require('../../utils/catchAsync');

module.exports = {
  confirmEmail: catchGraphqlAuth(async ({ token }, req) => {
    const result = await req.user.verifyEmail(token);
    return result;
  }),
  resendConfirmEmail: catchGraphqlAuth(async (args, req) => {
    await req.user.sendVerificationEmail();
    return true;
  }),
  me: catchGraphqlConfimed(async (args, req) => {
    return req.user;
  }),
  changeMyData: catchGraphqlConfimed(async (args, req) => {
    const { name, bio, phone } = args.userDataInput;

    req.user.set({
      name,
      bio,
      phone,
    });
    await req.user.save();

    return req.user;
  }),
  changeMyPassword: catchGraphqlConfimed(async (args, req) => {
    const { currentPassword, password, passwordConfirm } = args.changeMyPasswordInput;

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
  }),
  deleteMyAccount: catchGraphqlConfimed(async ({ password }, req) => {
    if (!(await req.user.comparePassword(password)))
      throw new AppError('Wrong password', errorTypes.VALIDATION, 400);

    const dir = await req.user.getImagesDirectory();
    await deleteDir(dir);

    await req.user.remove();

    return true;
  }),
  changeMyEmail: catchGraphqlConfimed(async ({ email }, req) => {
    if (await User.findOne({ email }))
      throw new AppError('User with this e-mail already exists', errorTypes.VALIDATION, 400);

    req.user.newEmail = email;
    await req.user.save();
    await req.user.sendVerificationEmail(req.user.email, true);
    await req.user.sendVerificationEmail(req.user.newEmail, true, true);

    return true;
  }),
  cancelMyNewEmail: catchGraphqlConfimed(async ({ email }, req) => {
    req.user.newEmail = undefined;
    req.user.emailConfirmationToken = undefined;
    req.user.newEmailConfirmationToken = undefined;
    await req.user.save();

    return true;
  }),
  confirmMyNewEmail: catchGraphqlConfimed(async ({ currentEmailToken, newEmailtoken }, req) => {
    await req.user.changeEmail(currentEmailToken, newEmailtoken);
    return req.user;
  }),
  deleteMyPhoto: catchGraphqlConfimed(async (args, req) => {
    if (req.user.photo) {
      await deleteFile(req.user.photo);
      await deleteFile(req.user.photo.replace('.webp', '.png'));

      req.user.photo = undefined;
      await req.user.save();
    }

    return true;
  }),
  changeMyPhoto: catchGraphqlConfimed(async ({ imageUrl }, req) => {
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
  }),
};
