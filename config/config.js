const env = process.env.NODE_ENV || "development"; // 'development' or 'test'
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const development = {
  app: {
    name: process.env.APP || "dev",
    port: process.env.PORT || 8000,
    baseUrl: "http://localhost:8000",
    appUrl: "http://localhost:8000",
  },
  db: {
    dialect: process.env.DB_DIALECT || "mysql",
    host: process.env.DB_HOST || "desarrollo.caseylcxjotm.us-east-2.rds.amazonaws.com",
    port: process.env.DB_PORT || "3306",
    name: process.env.DB_NAME || "migente",
    username: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD || "893ddd4463fd3882553940919745ee7b"
  },
  jwt: {
    encryption: process.env.JWT_ENCRYPTION || "jwt_encription",
    expiration: process.env.JWT_EXPIRATION || "1d",
  },
  // jwt: {
  //   encryption: process.env.JWT_ENCRYPTION || "zabor_encription",
  //   expiration: process.env.JWT_EXPIRATION || "1d",
  // },
  bcrypt: {
    saltRounds: 10,
  },
  sender_host: "smtp.gmail.com",
  sender_name: "ordenes@migenteonline.app",
  sender_pass: "@MiGente6078",
  distance: 10,
  stripeAccountKey: "sk_test_51HgwgeLHk50oQ9L23rB7qzB3JOQud2FFi5vuazk6FyvTdnFuTk5r5AIhyaZrp2EYO4PJWCjiJbE4bX6wuNNdWltm009RSvJxOV",
  AnetLoginId: "6qau2H4DY7",
  AnetTransactionId: "6g8W33B3qP4ng4CM"
};

const production = {
  app: {
    name: process.env.APP || "pro",
    port: process.env.PORT || 8000,
    baseUrl: "http://localhost:8000",
    appUrl: "http://localhost:8000",
  },
  db: {
    dialect: process.env.DB_DIALECT || "mysql",
    host: process.env.DB_HOST || "desarrollo.caseylcxjotm.us-east-2.rds.amazonaws.com",
    port: process.env.DB_PORT || "3306",
    name: process.env.DB_NAME || "migente",
    username: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD || "893ddd4463fd3882553940919745ee7b",
  },
  jwt: {
    encryption: process.env.JWT_ENCRYPTION || "zabor_encription",
    expiration: process.env.JWT_EXPIRATION || "1d",
  },
  bcrypt: {
    saltRounds: 10,
  },
  sender_host: "smtp.gmail.com",
  sender_name: "ordenes@migenteonline.app",
  sender_pass: "@MiGente6078",
  distance: 10,
  stripeAccountKey: "sk_test_51HgwgeLHk50oQ9L23rB7qzB3JOQud2FFi5vuazk6FyvTdnFuTk5r5AIhyaZrp2EYO4PJWCjiJbE4bX6wuNNdWltm009RSvJxOV",
  AnetLoginId: "6qau2H4DY7",
  AnetTransactionId: "6g8W33B3qP4ng4CM"
};

const test = {
  app: {
    name: "test",
    port: 8000,
  },
  db: {
    dialect: process.env.DB_DIALECT || "mysql",
    host: process.env.DB_HOST || "desarrollo.caseylcxjotm.us-east-2.rds.amazonaws.com",
    port: process.env.DB_PORT || "3306",
    name: process.env.DB_NAME || "migente",
    username: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD || "893ddd4463fd3882553940919745ee7b"
  },
  jwt: {
    encryption: process.env.JWT_ENCRYPTION || "zabor_encription",
    expiration: process.env.JWT_EXPIRATION || "1d",
  },
  bcrypt: {
    saltRounds: 10,
  },
};

const config = {
  development,
  test,
  production,
};

CONFIG = config[env];

module.exports = config[env];
