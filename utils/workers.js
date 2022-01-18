const Worker = require('./Worker');

const workers = {
  messageParser: {
    name: 'Message Parser',
    path: './workers/messageParser.js',
  },
};

exports.getWorker = (name) => {
  if (workers[name]) {
    if (!workers[name].worker)
      workers[name].worker = new Worker(workers[name].name, workers[name].path);
    return workers[name].worker.worker;
  }
  return null;
};
