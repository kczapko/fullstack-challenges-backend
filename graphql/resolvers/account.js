module.exports = {
  confirmEmail: async ({ token }, req) => {
    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        const result = await req.user.verifyEmail(token);
        return result;
      } catch (e) {
        throw e;
      }
    }
    return false;
  },
  resendConfirmEmail: async (args, req) => {
    if (req.authError) throw req.authError;
    if (req.user) {
      try {
        await req.user.sendVerificationEmail(req.user.email);
        return true;
      } catch (e) {
        throw e;
      }
    }
    return false;
  },
  me: async (args, req) => {
    if (req.authError) throw req.authError;
    if (req.user) return req.user;
  },
};
