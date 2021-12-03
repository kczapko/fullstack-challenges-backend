const path = require('path');

const baseDir = require.main.path;
const publicPath = (to) => {
  return path.relative(path.join(baseDir, 'public'), to);
};
const absolutePath = (to) => {
  to = to.replace(process.env.SERVER_URL, '');
  return path.join(baseDir, 'public', to);
};

module.exports = {
  baseDir,
  publicPath,
  absolutePath,
};
