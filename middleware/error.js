module.exports = (error, req, res, next) => {
  console.log(`🎃🎃🎃`);
  console.error(error);
  console.log(`🎃🎃🎃`);

  if (process.env.NODE_ENV === 'development') {
    return res.send(500).json({ error });
  }

  res.send(500).json({ message: 'Internal server error' });
};
