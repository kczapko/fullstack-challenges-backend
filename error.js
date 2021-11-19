// Uncaught Exception (Synchronous code)
process.on('uncaughtException', (err) => {
  console.log('💣 Undandled Exception:', err.name);
  console.log(err.message);
  console.log(err.stack);
  process.exit(1);
});

// Unhandled rejections (Promises)
process.on('unhandledRejection', (err) => {
  console.log('💣 Undandled Rejection:', err.name);
  console.log(err.message);
  console.log(err.stack);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('💣 SIGTERM RECEIVED.');
  console.log('💣 Process terminated');
});
