/* eslint-disable no-underscore-dangle */
const { PubSub, withFilter } = require('graphql-subscriptions');

const ChatChannel = require('../../models/chatChannel');
const ChatMessage = require('../../models/chatMessage');

const AppError = require('../../utils/AppError');
const errorTypes = require('../../utils/errorTypes');
const { catchGraphqlConfimed } = require('../../utils/catchAsync');

const pubsub = new PubSub();
const CHAT_ACTION = 'chat_action';

const ACTION_NEW_MEMBER = 'NEW_MEMBER';
const ACTION_NEW_MESSAGE = 'NEW_MESSAGE';
const ACTION_NEW_CHANNEL = 'NEW_CHANNEL';
const ACTION_JOINED_CHANNEL = 'JOIN_CHANNEL';

module.exports = {
  addChannel: catchGraphqlConfimed(async ({ name, description }, req) => {
    const channel = await ChatChannel.create({ name, description, members: [req.user] });

    pubsub.publish(CHAT_ACTION, {
      joinChannel: { type: ACTION_NEW_CHANNEL, channel, member: req.user },
    });

    return channel;
  }),
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
      // prettier-ignore
      joinChannel: {
        type: ACTION_NEW_MESSAGE,
        message,
        channel: { ...channel.toJSON(), members: [] },
        member: req.user,
      },
    });

    return message;
  }),
  getMessages: catchGraphqlConfimed(async ({ channelId, skip = 0, perPage = 50 }) => {
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
      }); // .skip(skip).limit(perPage);

    return {
      total,
      messages,
    };
  }),
  joinChannel: async (args, ctx) => {
    const { name } = args;

    const channel = await ChatChannel.findOne({ name }).populate({
      path: 'members',
      select: 'name email photo username',
    });

    if (!channel) throw new AppError('Channel not found!', errorTypes.VALIDATION, 400);

    const memeberExists = channel.members.find(
      (memeber) => memeber._id.toString() === ctx.user._id.toString(),
    );

    if (!memeberExists) channel.members.push(ctx.user);
    await channel.save();

    setTimeout(() => {
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
              members: [],
            },
          },
        });
    }, 0);

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
          case ACTION_JOINED_CHANNEL:
            if (member._id.toString() === user._id.toString()) return true;
            return false;
          case ACTION_NEW_MEMBER:
            if (member._id.toString() !== user._id.toString() && channelName === channelData.name)
              return true;
            return false;
          case ACTION_NEW_CHANNEL:
            if (member._id.toString() !== user._id.toString()) return true;
            return false;
          case ACTION_NEW_MESSAGE:
            if (member._id.toString() !== user._id.toString() && channelName === channelData.name)
              return true;
            return false;
          default:
            return false;
        }
      },
    )(null, { ...args, user: ctx.user });
  },
};
