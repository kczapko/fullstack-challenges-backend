const { PubSub } = require('graphql-subscriptions');

exports.pubsub = new PubSub();

exports.CHAT_ACTION = 'CHAT_ACTION';

exports.ACTION_NEW_MEMBER = 'NEW_MEMBER';
exports.ACTION_NEW_MESSAGE = 'NEW_MESSAGE';
exports.ACTION_NEW_CHANNEL = 'NEW_CHANNEL';
exports.ACTION_JOINED_CHANNEL = 'JOIN_CHANNEL';
exports.ACTION_CHAT_ERROR = 'CHAT_ERROR';
exports.ACTION_STATUS_CHANGED = 'STATUS_CHANGE';
exports.ACTION_MESSAGE_UPDATED = 'UPDATE_MESSAGE';
