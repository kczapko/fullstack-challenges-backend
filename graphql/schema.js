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
    username: String!
    photo: String
    online: String!
  }

  type Image {
    _id: ID!
    path: String!
    source: String!
    width: Int!
    height: Int!
    label: String!
  }

  type ProductCategory {
    _id: ID!
    name: String!
  }

  type Product {
    _id: ID!
    name: String!
    note: String
    image: String
    category: ProductCategory!
  }

  type ShoppingListProduct {
    product: Product!
    quantity: Int!
    completed: Boolean!
  }
  
  type ShoppingList {
    _id: ID!
    name: String!
    state: String!
    products: [ShoppingListProduct]!
    updatedAt: String!
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

  type ImagesData {
    total: Int!
    images: [Image!]!
  }

  type Channel {
    _id: ID!
    name: String!
    description: String!
    members: [UserPublic!]!
    isPrivate: Boolean!
  }

  type MessageMeta {
    type: String!
    url: String!
    title: String
    description: String
    image: String
  }

  type Message {
    _id: ID!
    message: String!
    createdAt: String!
    user: UserPublic!
    channel: Channel!
    meta: MessageMeta
  }

  type ChatSubscription {
    type: String!
    member: UserPublic
    channel: Channel
    message: Message
    error: String
  }

  type MessagesData {
    total: Int!
    messages: [Message!]!
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

  input ProductInputData {
    name: String!
    note: String
    imageUrl: String
    category: String!
  }

  input ShoppingListProductInputData {
    _id: ID!
  }

  input ShoppingListProductsInputData {
    product: ShoppingListProductInputData!
    quantity: Int!
    completed: Boolean!
  }
  
  input ShoppingListInputData {
    name: String!
    products: [ShoppingListProductsInputData!]!
  }

  type RootQuery {
    login(loginInput: LoginInputData!): AuthData!
    autologin: UserData!
    authWithTwitter: String!
    authWithGithub: GithubAuthData!
    me: User!
    myUnsplashImages(search: String, skip: Int, perPage: Int): ImagesData!
    myShoppingifyProductCategories: [ProductCategory!]!
    myShoppingifyProducts: [Product!]!
    myShoppingifyProduct(id: ID!): Product!
    myShoppingList: ShoppingList
    myShoppingHistory: [ShoppingList!]!
    mySingleShoppingHistory(id: ID!): ShoppingList!
    myShoppingStatistics: String!
    getChannels: [Channel!]!
    getMessages(channelId: ID!, skip: Int, perPage: Int, password: String): MessagesData!
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
    changeMyOnlineStatus(status: String!): Boolean!
    addMyUnsplashImage(label: String!, imageUrl: String!): Image!
    editMyUnsplashImage(id: ID!, label: String!): Image!
    deleteMyUnsplashImage(id: ID!, password: String!): Image!
    addMyShoppingifyProduct(productInput: ProductInputData!): Product!
    deleteMyShoppingifyProduct(id: ID!): Product!
    saveMyShoppingList(shoppingListInput: ShoppingListInputData!): ShoppingList!
    updateMyShoppingList(shoppingListInput: ShoppingListInputData!): ShoppingList!
    toggleShoppingifyProductCompletion(id: ID!, completed: Boolean!): Boolean!
    completeMyShoppingList: Boolean!
    cancelMyShoppingList: Boolean!
    addChannel(name: String!, description: String, isPrivate: Boolean, password: String): Channel!
    addMessage(msg: String!, channelId: ID!): Message!
  }

  type RootSubscription {
    joinChannel(name: String!, password: String): ChatSubscription
  }

  schema {
    query: RootQuery
    mutation: RootMutation
    subscription: RootSubscription
  }
`);

module.exports = schema;
