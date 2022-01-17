const express = require('express');
const multer = require('multer');

const accountController = require('../controllers/account');

const router = express.Router();
const upload = multer();

router.post('/set-status', upload.none(), accountController.changeMyOnlineStatus);

module.exports = router;
