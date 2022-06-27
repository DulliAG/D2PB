const { Database, LogVariant, Client } = require('@dulliag/logger.js');
require('dotenv').config();

try {
  const credentials = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };

  const LOGGER = new Client(Database.PG, credentials, process.env.APPLICATION);

  /**
   *
   * @param {LogVariant} variant
   * @param {string} code
   * @param {string} message
   */
  const createLog = (variant, code, message) => {
    return LOGGER.log(variant, code, message);
  };

  module.exports = {
    createLog: createLog,
  };
} catch (err) {
  console.log(err);
}
