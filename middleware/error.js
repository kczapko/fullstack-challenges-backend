module.exports = (error, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎃🎃🎃`);
    console.log(error);
    console.log(`🎃🎃🎃`);
    return res.send(500).json({ error });
  }

  res.send(500).json({ message: 'Internal server error' });
};
