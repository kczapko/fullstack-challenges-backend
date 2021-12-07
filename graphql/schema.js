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
    name: String
    photo: String
  }

  type Image {
    _id: ID!
    path: String!
    source: String!
    width: Int!
    height: Int!
    label: String!
  }

  type AuthData {
    token: String!
    user: User!
  }

  type UserData {
    user: User!
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
    myUnsplashImages: [Image!]!
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
    changeMyPhoto(imageUrl: String!): User!
    deleteMyPhoto: Boolean!
    deleteMyAccount(password: String!): Boolean!
    addMyUnsplashImage(label: String!, imageUrl: String!): Image!
    editMyUnsplashImage(id: ID!, label: String!): Image!
    deleteMyUnsplashImage(id: ID!, password: String!): Image!
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);

module.exports = schema;
