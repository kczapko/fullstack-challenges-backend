const Upload = require('../utils/Upload');
const { createUserPhoto, createChatImage, deleteFile } = require('../utils/files');
const { publicPath } = require('../utils/path');
const { catchExpressConfimed } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const errorTypes = require('../utils/errorTypes');

const ChatChannel = require('../models/chatChannel');
const ChatMessage = require('../models/chatMessage');
const { pubsub, CHAT_ACTION, ACTION_NEW_MESSAGE } = require('../utils/pubsub');

const imageUpload = new Upload({});

exports.fileUpload = imageUpload.upload.single('files');

exports.saveUserPhoto = catchExpressConfimed(async (req, res, next) => {
  const dir = await req.user.getImagesDirectory();
  const filename = await createUserPhoto(req.file.buffer, dir);

  if (req.user.photo) {
    await deleteFile(req.user.photo);
    await deleteFile(req.user.photo.replace('.webp', '.png'));
  }

  req.user.photo = `/${publicPath(filename).replace(/\\/g, '/')}`;
  await req.user.save();

  return res.status(201).json({ file: req.user.photo });
});

exports.addChatImage = catchExpressConfimed(async (req, res, next) => {
  const dir = await req.user.getImagesDirectory();
  const filename = await createChatImage(req.file.buffer, dir);

  const imagePath = `/${publicPath(filename).replace(/\\/g, '/')}`;

  const channel = await ChatChannel.findById(req.params.channelId);

  if (!channel) throw new AppError('Channel not found!', errorTypes.VALIDATION, 400);

  const message = await ChatMessage.create({
    message: imagePath,
    channel,
    user: req.user,
    type: 'image',
  });

  pubsub.publish(CHAT_ACTION, {
    joinChannel: {
      type: ACTION_NEW_MESSAGE,
      message,
      channel: { ...channel.toJSON(), members: [] },
    },
  });

  return res.status(201).json({ status: 'success' });
});
