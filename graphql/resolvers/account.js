const validator = require('validator');
const axios = require('axios');

const { fromBuffer } = require('file-type');

const User = require('../../models/user');
const Image = require('../../models/image');
const Product = require('../../models/product');
const ProductCategory = require('../../models/productCategory');
const ShoppingList = require('../../models/shoppingList');
const ChatChannel = require('../../models/chatChannel');
const ChatMessage = require('../../models/chatMessage');

const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');
const { createUserPhoto, deleteFile, deleteDir } = require('../../utils/files');
const { publicPath } = require('../../utils/path');
const { catchGraphqlAuth, catchGraphqlConfimed } = require('../../utils/catchAsync');

const { pubsub, CHAT_ACTION, ACTION_STATUS_CHANGED } = require('../../utils/pubsub');

module.exports = {
  confirmEmail: catchGraphqlAuth(async ({ token }, req) => {
    const result = await req.user.verifyEmail(token);
    return result;
  }),
  resendConfirmEmail: catchGraphqlAuth(async (args, req) => {
    await req.user.sendVerificationEmail();
    return true;
  }),
  me: catchGraphqlConfimed(async (args, req) => req.user),
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
      // prettier-ignore
      !validator.isLength(password, { max: process.env.MAX_PASSWORD_LENGTH })
      || !validator.isLength(passwordConfirm, { max: process.env.MAX_PASSWORD_LENGTH })
    )
      throw new AppError(
        `Maximum password length is ${process.env.MAX_PASSWORD_LENGTH} characters.`,
        errorTypes.VALIDATION,
        400,
      );

    /* demo user */
    if (req.user.email === 'demo@demo.demo')
      throw new AppError("You can't change password for demo user", errorTypes.VALIDATION, 400);

    req.user.password = password;
    req.user.passwordConfirm = passwordConfirm;
    await req.user.save();

    return true;
  }),
  deleteMyAccount: catchGraphqlConfimed(async ({ password }, req) => {
    if (!(await req.user.comparePassword(password)))
      throw new AppError('Wrong password', errorTypes.VALIDATION, 400);

    /* demo user */
    if (req.user.email === 'demo@demo.demo')
      throw new AppError("You can't delete demo user", errorTypes.VALIDATION, 400);

    const dir = await req.user.getImagesDirectory();
    await deleteDir(dir);

    await Image.deleteMany({ user: req.user });
    await Product.deleteMany({ user: req.user });
    await ProductCategory.deleteMany({ user: req.user });
    await ShoppingList.deleteMany({ user: req.user });
    await ChatMessage.deleteMany({ user: req.user });
    const channels = await ChatChannel.find({
      members: req.user,
    });
    if (channels.length) {
      const updatePromises = channels
        .map((channel) => {
          // eslint-disable-next-line no-underscore-dangle
          const user = channel.members.find((m) => m.toString() === req.user._id.toString());
          if (user) {
            channel.members.pull(user);
            return channel.save({ timestamps: false });
          }
          return null;
        })
        .filter((c) => c !== null);

      await Promise.all(updatePromises);
    }

    await req.user.remove();

    return true;
  }),
  changeMyEmail: catchGraphqlConfimed(async ({ email }, req) => {
    if (await User.findOne({ email }))
      throw new AppError('User with this e-mail already exists', errorTypes.VALIDATION, 400);

    /* demo user */
    if (req.user.email === 'demo@demo.demo')
      throw new AppError("You can't change email for demo user", errorTypes.VALIDATION, 400);

    req.user.newEmail = email;
    await req.user.save();
    await req.user.sendVerificationEmail(req.user.email, true);
    await req.user.sendVerificationEmail(req.user.newEmail, true, true);

    return true;
  }),
  cancelMyNewEmail: catchGraphqlConfimed(async (args, req) => {
    req.user.newEmail = undefined;
    req.user.emailConfirmationToken = undefined;
    req.user.newEmailConfirmationToken = undefined;
    await req.user.save();

    return true;
  }),
  confirmMyNewEmail: catchGraphqlConfimed(async ({ currentEmailToken, newEmailtoken }, req) => {
    /* demo user */
    if (req.user.email === 'demo@demo.demo')
      throw new AppError("You can't change email for demo user", errorTypes.VALIDATION, 400);

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
    if (!validator.isURL(imageUrl, { protocols: ['http', 'https'], require_protocol: true }))
      throw new AppError(
        'Not valid photo url. Only http:// and https:// are allowed.',
        errorTypes.VALIDATION,
        400,
      );

    const res = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });

    const file = await fromBuffer(res.data);
    if (!file || !['image/jpg', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mime))
      throw new AppError('Not valid image.', errorTypes.VALIDATION, 400);

    const dir = await req.user.getImagesDirectory();
    const filename = await createUserPhoto(res.data, dir);

    if (req.user.photo) {
      await deleteFile(req.user.photo);
      await deleteFile(req.user.photo.replace('.webp', '.png'));
    }

    req.user.photo = `/${publicPath(filename).replace(/\\/g, '/')}`;
    await req.user.save();

    return req.user;
  }),
  changeMyOnlineStatus: catchGraphqlConfimed(async ({ status }, req) => {
    req.user.online = status;
    await req.user.save();

    pubsub.publish(CHAT_ACTION, {
      joinChannel: { type: ACTION_STATUS_CHANGED, member: req.user },
    });

    return true;
  }),
};
