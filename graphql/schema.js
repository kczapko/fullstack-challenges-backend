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
  }

  type RootMutation {
    signup(signupInput: SignupInputData!): AuthData!
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);

module.exports = schema;
