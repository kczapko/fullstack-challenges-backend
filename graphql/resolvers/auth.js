const User = require('../../models/user');

module.exports = {
  login: (args) => {
    console.log(args);
  },
  signup: async ({ signupInput }) => {
    const { email, password, passwordConfirm } = signupInput;
    let user;

    try {
      user = await User.create({ email, password, passwordConfirm });
    } catch (e) {
      throw e;
    }

    return {
      token: '123',
      user,
    };
  },
};
