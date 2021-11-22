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
    authWithTwitter: String!
  }

  type RootMutation {
    signup(signupInput: SignupInputData!): AuthData!
    signinWithGoogle(idToken: String!): AuthData!
    signinWithFacebook(accessToken: String!, userId: String!): AuthData!
    signinWithTwitter(oauthToken: String!, oauthVerifier: String!): AuthData!
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);

module.exports = schema;
