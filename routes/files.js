const express = require('express');

const filesController = require('../controllers/files');

const router = express.Router();

router.post('/user-photo', filesController.fileUpload, filesController.saveUserPhoto);
router.post('/chat-image/:channelId', filesController.fileUpload, filesController.addChatImage);

module.exports = router;
