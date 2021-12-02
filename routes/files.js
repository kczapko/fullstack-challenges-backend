const express = require('express');

const filesController = require('../controllers/files');

const router = express.Router();

router.post('/user-photo', filesController.uploadUserPhoto, filesController.saveUserPhoto);

module.exports = router;
