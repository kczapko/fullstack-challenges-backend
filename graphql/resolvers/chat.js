/* eslint-disable no-underscore-dangle */
const { withFilter } = require('graphql-subscriptions');
const validator = require('validator');

const ChatChannel = require('../../models/chatChannel');
const ChatMessage = require('../../models/chatMessage');

const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');
const { catchGraphqlConfimed } = require('../../utils/catchAsync');
const { getWorker } = require('../../utils/workers');

const {
  pubsub,
  CHAT_ACTION,
  ACTION_CHAT_ERROR,
  ACTION_NEW_CHANNEL,
  ACTION_JOINED_CHANNEL,
  ACTION_NEW_MEMBER,
  ACTION_NEW_MESSAGE,
  ACTION_STATUS_CHANGED,
  ACTION_MESSAGE_UPDATED,
} = require('../../utils/pubsub');

const messageParser = getWorker('messageParser');
messageParser.on('message', async ({ id }) => {
  try {
    const message = await ChatMessage.findById(id).populate('user').populate('channel');

    pubsub.publish(CHAT_ACTION, {
      joinChannel: {
        type: ACTION_MESSAGE_UPDATED,
        message,
        channel: {
          _id: message.channel._id,
          name: message.channel.name,
          description: message.channel.description,
          isPrivate: message.channel.isPrivate,
          members: [],
        },
      },
    });
  } catch (err) {
    console.error('Update chat message failed.', err.message);
    console.error(err);
  }
});

module.exports = {
  addChannel: catchGraphqlConfimed(
    // eslint-disable-next-line object-curly-newline
    async ({ name, description, isPrivate = false, password = '' }, req) => {
      // PROD handle duplicate keys
      let channel = await ChatChannel.findOne({ name });
      if (channel)
        throw new AppError('Channel with that name already exists', errorTypes.VALIDATION, 400);

      let channelPassword = password;

      if (!isPrivate) channelPassword = undefined;
      if (isPrivate)
        if (!validator.isLength(channelPassword, { max: process.env.MAX_PASSWORD_LENGTH }))
          throw new AppError(
            `Maximum password length is ${process.env.MAX_PASSWORD_LENGTH} characters.`,
            errorTypes.VALIDATION,
            400,
          );

      channel = await ChatChannel.create({
        name,
        description,
        members: [req.user],
        isPrivate,
        password: channelPassword,
      });

      pubsub.publish(CHAT_ACTION, {
        joinChannel: { type: ACTION_NEW_CHANNEL, channel },
      });

      return true;
    },
  ),
  getChannels: catchGraphqlConfimed(async () => {
    const channels = await ChatChannel.find({}).sort({ createdAt: 1 });

    return channels;
  }),
  addMessage: catchGraphqlConfimed(async ({ msg, channelId }, req) => {
    const channel = await ChatChannel.findById(channelId);

    if (!channel) throw new AppError('Channel not found!', errorTypes.VALIDATION, 400);

    const message = await ChatMessage.create({
      message: msg,
      channel,
      user: req.user,
    });

    pubsub.publish(CHAT_ACTION, {
      joinChannel: {
        type: ACTION_NEW_MESSAGE,
        message,
        channel: { ...channel.toJSON(), members: [] },
      },
    });

    messageParser.send({ message: message.message, id: message._id });

    return true;
  }),
  getMessages: catchGraphqlConfimed(
    // eslint-disable-next-line object-curly-newline
    async ({ channelId, skip = 0, perPage = 50, password = '' }) => {
      const channel = await ChatChannel.findById(channelId);

      if (!channel) throw new AppError('Channel not found!', errorTypes.VALIDATION, 400);
      if (channel.isPrivate && !(await channel.comparePassword(password)))
        throw new AppError('Wrong password.', errorTypes.AUTHENTICATION, 401);

      // eslint-disable-next-line arrow-body-style
      const getMessagesQuery = () => {
        return ChatMessage.find({ channel: channelId });
      };

      const total = await getMessagesQuery().countDocuments();
      if (total === 0)
        return {
          total: 0,
          messages: [],
        };

      const messages = await getMessagesQuery()
        .sort('-createdAt')
        .skip(skip)
        .limit(perPage)
        .populate({
          path: 'user',
          select: 'name email photo username',
        });

      return {
        total,
        messages,
      };
    },
  ),
  joinChannel: async (args, ctx) => {
    const { name, password = '' } = args;
    let subscriptionError;

    let channel = await ChatChannel.findOne({ name });

    if (!channel) {
      subscriptionError = true;
      setImmediate(() => {
        pubsub.publish(CHAT_ACTION, {
          joinChannel: { type: ACTION_CHAT_ERROR, member: ctx.user, error: 'Channel not found!' },
        });
      });
    }
    // throw new AppError('Channel not found!', errorTypes.VALIDATION, 400);

    if (!subscriptionError && channel.isPrivate && !(await channel.comparePassword(password))) {
      subscriptionError = true;
      setImmediate(() => {
        pubsub.publish(CHAT_ACTION, {
          joinChannel: { type: ACTION_CHAT_ERROR, member: ctx.user, error: 'Wrong password.' },
        });
      });
    }
    // throw new AppError('Wrong password.', errorTypes.AUTHENTICATION, 401);

    if (!subscriptionError) {
      const memeberExists = channel.members.find(
        (memeber) => memeber._id.toString() === ctx.user._id.toString(),
      );

      if (!memeberExists) channel.members.push(ctx.user);
      await channel.save();

      channel = await ChatChannel.findOne({ name }).populate({
        path: 'members',
        select: 'name email photo username online',
      });

      setImmediate(() => {
        pubsub.publish(CHAT_ACTION, {
          joinChannel: { type: ACTION_JOINED_CHANNEL, channel, member: ctx.user },
        });
        if (!memeberExists)
          pubsub.publish(CHAT_ACTION, {
            joinChannel: {
              type: ACTION_NEW_MEMBER,
              member: ctx.user,
              channel: {
                _id: channel._id,
                name: channel.name,
                description: channel.description,
                isPrivate: channel.isPrivate,
                members: [],
              },
            },
          });
      });
    }

    return withFilter(
      () => pubsub.asyncIterator(CHAT_ACTION),
      (payload, variables) => {
        // prettier-ignore
        const {
          type,
          member,
          channel: channelData,
        } = payload.joinChannel;
        const { user, name: channelName } = variables;

        switch (type) {
          case ACTION_CHAT_ERROR:
            if (subscriptionError && member._id.toString() === user._id.toString()) return true;
            return false;
          case ACTION_JOINED_CHANNEL:
            if (!subscriptionError && member._id.toString() === user._id.toString()) return true;
            return false;
          case ACTION_NEW_MEMBER:
            if (
              // prettier-ignore
              !subscriptionError
              && member._id.toString() !== user._id.toString()
              && channelName === channelData.name
            )
              return true;
            return false;
          case ACTION_NEW_CHANNEL:
            if (!subscriptionError) return true;
            return false;
          case ACTION_NEW_MESSAGE:
            if (
              // prettier-ignore
              !subscriptionError
              && channelName === channelData.name
            )
              return true;
            return false;
          case ACTION_STATUS_CHANGED:
            if (!subscriptionError) return true;
            return false;
          case ACTION_MESSAGE_UPDATED:
            if (!subscriptionError && channelName === channelData.name) return true;
            return false;
          default:
            return false;
        }
      },
    )(null, { ...args, user: ctx.user });
  },
};
