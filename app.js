require('./error');
require('dotenv').config({ path: './config.env' });

const fs = require('fs');
const http = require('http');
const https = require('https');
const privateKey = fs.readFileSync('key.pem', 'utf8');
const certificate = fs.readFileSync('cert.pem', 'utf8');

const mongoose = require('mongoose');

const app = require('./express');
const { createWebSocketGraphQlServer } = require('./ws');

const port = process.env.PORT || 3000;
const sslPort = process.env.SSL_PORT || 3443;
// prettier-ignore
const databaseUrl = process.env.NODE_ENV === 'production' ? process.env.DATABASE_PROD : process.env.DATABASE_DEV;

const init = async () => {
  await mongoose.connect(databaseUrl);

  const httpServer = http.createServer(app);
  httpServer.listen(port, () => {
    console.log(`🤟 HTTP Server started on port ${port} in ${process.env.NODE_ENV} mode`);
    createWebSocketGraphQlServer(httpServer);
  });

  const httpsServer = https.createServer(
    { key: privateKey, cert: certificate, passphrase: process.env.CERT_PASSPHRASE },
    app,
  );
  httpsServer.listen(sslPort, () => {
    console.log(`🤟 HTTPS Server started on port ${sslPort} in ${process.env.NODE_ENV} mode`);
    createWebSocketGraphQlServer(httpsServer);
  });
};

init();
