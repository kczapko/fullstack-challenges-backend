const multer = require('multer');

const AppError = require('../utils/AppError');
const errorTypes = require('../utils/errorTypes');

class Upload {
  #storage;
  #fileSize;
  #mimetypes;

  constructor({
    storage = 'memory',
    fileSize = 1024 * 1024,
    mimetypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp'],
  }) {
    this.#storage = storage;
    this.#fileSize = fileSize;
    this.#mimetypes = mimetypes;

    this.#createUpload();
  }

  #createUpload() {
    this.upload = multer({
      storage: this.#createStorage(),
      fileFilter: this.#fileFilter(),
      limits: {
        fileSize: this.#fileSize,
      },
    });
  }

  #createStorage() {
    if (this.#storage === 'memeory') {
      return multer.memoryStorage();
    }
  }

  #fileFilter() {
    return (req, file, cb) => {
      if (!this.#mimetypes.length) return cb(null, true);
      if (!this.#mimetypes.some((mimetype) => file.mimetype === mimetype))
        return cb(new AppError('Wrong file type', errorTypes.VALIDATION, 400), false);
      cb(null, true);
    };
  }
}

module.exports = Upload;
