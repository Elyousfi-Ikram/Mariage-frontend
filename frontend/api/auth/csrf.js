module.exports = (req, res) => {
  res.status(200).json({ csrfToken: 'mock-csrf-token' });
};