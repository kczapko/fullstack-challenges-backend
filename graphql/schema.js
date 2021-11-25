const { buildSchema } = require('graphql');

const schema = buildSchema(`
  type User {
    _id: ID!
    email: String!
    role: String!
    name: String
    bio: String
    phone: String
    photo: String
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

  type RootQuery {
    login(loginInput: LoginInputData!): AuthData!
    autologin: UserData!
    authWithTwitter: String!
    authWithGithub: GithubAuthData!
  }

  type RootMutation {
    signup(signupInput: SignupInputData!): AuthData!
    signinWithGoogle(idToken: String!): AuthData!
    signinWithFacebook(accessToken: String!, userId: String!): AuthData!
    signinWithTwitter(oauthToken: String!, oauthVerifier: String!): AuthData!
    signinWithGithub(code: String!): AuthData!
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);

module.exports = schema;
