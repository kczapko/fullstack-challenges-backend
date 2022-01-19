const path = require('path');
const fs = require('fs/promises');

const sharp = require('sharp');

const { absolutePath } = require('./path');

exports.createUserPhoto = async (buffer, dir) => {
  const image = sharp(buffer).resize({
    width: 200,
    height: 200,
  });

  const name = `user-${Date.now()}`;
  const filename = path.join(dir, `${name}.webp`);

  await image.webp({ quality: 80 }).toFile(filename);
  await image.png({ quality: 80 }).toFile(path.join(dir, `${name}.png`));

  return filename;
};

exports.createUnsplashImage = async (buffer, dir) => {
  let image = sharp(buffer);
  const metadata = await image.metadata();
  const { width } = metadata;

  if (width > 960)
    image = image.resize({
      width: 960,
    });

  const name = `${Date.now()}-${Math.random().toString().slice(2)}`;
  const filename = path.join(dir, 'unsplash', `${name}.webp`);
  const file = await image.webp({ quality: 80 }).toFile(filename);

  return { filename, width: file.width, height: file.height };
};

exports.createShoppingifyImage = async (buffer, dir) => {
  const image = sharp(buffer).resize({
    width: 680,
  });

  const name = `${Date.now()}-${Math.random().toString().slice(2)}`;
  const filename = path.join(dir, 'shoppingify', `${name}.webp`);

  await image.webp({ quality: 80 }).toFile(filename);

  return { filename };
};

exports.createChatImage = async (buffer, dir) => {
  let image = sharp(buffer);
  const metadata = await image.metadata();
  const { width } = metadata;

  if (width > 960)
    image = image.resize({
      width: 960,
    });

  const name = `${Date.now()}-${Math.random().toString().slice(2)}`;
  const filename = path.join(dir, 'chat', `${name}.webp`);
  await image.webp({ quality: 80 }).toFile(filename);

  return filename;
};

exports.deleteFile = async (publicPath) => {
  try {
    await fs.unlink(absolutePath(publicPath));
  } catch (err) {
    console.error(`💩 Problem with unlinking file ${absolutePath(publicPath)}`);
    console.error(err);
  }
};

exports.deleteDir = async (dir) => {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err) {
    console.error(`💩 Problem with deleteing dircetory ${dir}`);
    console.error(err);
  }
};
