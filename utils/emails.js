const Email = require('./Email');

class VerificationEmail extends Email {
  constructor(to, data) {
    super('emailVerification', 'Confirm your e-mail address', to, data);
  }
}

module.exports = {
  VerificationEmail,
};
