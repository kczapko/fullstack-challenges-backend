const { fork } = require('child_process');

class Worker {
  constructor(name, path, args = [], options = {}) {
    this.name = name;
    this.path = path;
    this.args = args;
    this.options = options;

    this.create();
  }

  create() {
    this.worker = fork(this.path, this.args, { ...this.options });
    this.worker.on('close', (code) => {
      console.error(`Worker ${this.name} closed with code: ${code}`);
    });
    this.worker.on('disconnect', () => {
      console.error(`Worker ${this.name} disconnected.`);
    });
    this.worker.on('error', (err) => {
      console.error(`Worker ${this.name} error: ${err.message}`);
      console.error(err);
    });
    this.worker.on('exit', (code) => {
      console.error(`Worker ${this.name} exitted with code: ${code}`);
    });
  }
}

module.exports = Worker;
