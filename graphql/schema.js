const { buildSchema } = require('graphql');

const schema = buildSchema(`
  type User {
    email: String!
    role: String!
    name: String
    bio: String
    phone: String
    photo: String
    emailConfirmed: Boolean!
    newEmail: String
  }

  type UserPublic {
    email: String!
    role: String!
    name: String
    photo: String
    emailConfirmed: Boolean!
  }

  type AuthData {
    token: String!
    user: UserPublic!
  }

  type UserData {
    user: UserPublic!
  }

  type GithubAuthData {
    url: String!
    state: String!
  }

  input SignupInputData {
    email: String!
    password: String!
    passwordConfirm: String!
  }

  input LoginInputData {
    email: String!
    password: String!
  }

  input ChangePasswordInputData {
    token: String!
    password: String!
    passwordConfirm: String!
  }

  input UserInputData {
    name: String
    bio: String
    phone: String
  }

  input ChangeMyPasswordInputData {
    currentPassword: String!
    password: String!
    passwordConfirm: String!
  }

  type RootQuery {
    login(loginInput: LoginInputData!): AuthData!
    autologin: UserData!
    authWithTwitter: String!
    authWithGithub: GithubAuthData!
    me: User!
  }

  type RootMutation {
    signup(signupInput: SignupInputData!): AuthData!
    signinWithGoogle(idToken: String!): AuthData!
    signinWithFacebook(accessToken: String!, userId: String!): AuthData!
    signinWithTwitter(oauthToken: String!, oauthVerifier: String!): AuthData!
    signinWithGithub(code: String!): AuthData!
    confirmEmail(token: String!): Boolean!
    resendConfirmEmail: Boolean!
    requestPasswordReset(email: String!): Boolean!
    changePassword(changePasswordInput: ChangePasswordInputData!): Boolean!
    changeMyData(userDataInput: UserInputData!): User!
    changeMyPassword(changeMyPasswordInput: ChangeMyPasswordInputData!): Boolean!
    changeMyEmail(email: String!): Boolean!
    cancelMyNewEmail: Boolean!
    confirmMyNewEmail(currentEmailToken: String!, newEmailtoken: String!): User!
    deleteMyAccount(password: String!): Boolean!
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);

module.exports = schema;
