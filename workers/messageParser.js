const validator = require('validator');
const axios = require('axios');
const htmlParser = require('node-html-parser');
const mongoose = require('mongoose');
const { fromBuffer } = require('file-type');

// prettier-ignore
const databaseUrl = process.env.NODE_ENV === 'production' ? process.env.DATABASE_PROD : process.env.DATABASE_DEV;
mongoose.connect(databaseUrl);

const ChatMessage = require('../models/chatMessage');

const parseMessage = async ({ message, id }) => {
  const links = [...message.matchAll(/\S+/g)]
    .map(
      // prettier-ignore
      (match) => validator.isURL(match[0], { protocols: ['http', 'https'], require_protocol: true }) && match[0],
    )
    .filter((match) => match);

  const [link] = links;
  if (!link) return;

  let res;
  const messageMeta = {};

  // check if its an file
  try {
    res = await axios.get(link, {
      responseType: 'arraybuffer',
    });
  } catch (err) {
    console.error('messageParser Error: ', err.message);
    return;
  }

  const file = await fromBuffer(res.data);
  if (file) {
    if (['jpg', 'png', 'apng', 'webp', 'gif', 'avif'].includes(file.ext)) {
      messageMeta.type = 'image';
      messageMeta.url = link;
    }
  } else {
    // check if it'a a html page
    try {
      res = await axios.get(link);
    } catch (err) {
      console.error('messageParser Error: ', err.message);
      return;
    }

    const { data } = res;
    const options = {
      lowerCaseTagName: false,
      comment: false,
      blockTextElements: {
        script: false,
        noscript: false,
        style: false,
        pre: false,
      },
    };

    // Reports html4 sitas as invalid
    // const valid = htmlParser.valid(data);
    // if (!valid) return;

    const html = htmlParser.parse(data, options);

    const titleEl = html.querySelector('title');
    const descriptionEl = html.querySelector('meta[name="description"]');
    const ogMetaEl = html.querySelectorAll('meta[property^="og:"]');
    const imgEl = html.querySelector('img');

    const ogMeta = {};

    // parse og
    ogMetaEl.forEach((og) => {
      ogMeta[og.getAttribute('property')] = og.getAttribute('content');
    });

    const title = ogMeta['og:title'] || (titleEl && titleEl.textContent);
    // prettier-ignore
    const description = ogMeta['og:description'] || (descriptionEl && descriptionEl.getAttribute('content'));
    const image = ogMeta['og:image'] || (imgEl && imgEl.getAttribute('src'));

    if (title && title.trim()) {
      messageMeta.type = 'page';
      messageMeta.url = link;
      messageMeta.title = title;
      if (description && description.trim()) messageMeta.description = description.trim();
      if (
        // prettier-ignore
        image
        && image.trim()
        && validator.isURL(image.trim(), { protocols: ['http', 'https'], require_protocol: true })
      )
        messageMeta.image = image.trim();
    }
  }

  if (messageMeta.type && messageMeta.url) {
    try {
      const chatMessage = await ChatMessage.findById(id);

      chatMessage.meta = messageMeta;
      await chatMessage.save();
    } catch (err) {
      console.error('messageParser Error: ', err.message);
      console.error(err);
      return;
    }

    process.send({ id });
  }
};

process.on('message', (msg) => {
  parseMessage(msg);
});
