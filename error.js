// Uncaught Exception (Synchronous code)
process.on('uncaughtException', (err) => {
  console.error('💣 Undandled Exception:', err.name);
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
});

// Unhandled rejections (Promises)
process.on('unhandledRejection', (err) => {
  console.error('💣 Undandled Rejection:', err.name);
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.error('💣 SIGTERM RECEIVED.');
  console.error('💣 Process terminated');
});
