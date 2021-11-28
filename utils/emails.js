const Email = require('./Email');

class VerificationEmail extends Email {
  constructor(to, data) {
    super('emailVerification', 'Confirm your e-mail address.', to, data);
  }
}

class PasswordResetEmail extends Email {
  constructor(to, data) {
    super('passwordReset', 'Password change details.', to, data);
  }
}

module.exports = {
  VerificationEmail,
  PasswordResetEmail,
};
