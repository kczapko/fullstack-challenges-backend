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
