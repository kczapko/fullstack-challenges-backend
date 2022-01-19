const express = require('express');
const multer = require('multer');

const accountController = require('../controllers/account');

const router = express.Router();
const upload = multer();

router.post('/set-offline', upload.none(), accountController.setOffline);

module.exports = router;
