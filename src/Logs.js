const { Database, LogVariant, Client } = require('@dulliag/logger.js');
const helper = require('@dulliag/discord-helper');
require('dotenv').config();

try {
  const credentials = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };

  const LOGGER = new Client(Database.PG, credentials, 'Dota2PatchBot');

  /**
   *
   * @param {LogVariant} variant
   * @param {string} code
   * @param {string} message
   */
  const createLog = (variant, code, message) => {
    if (process.env.PRODUCTION == 'true') {
      LOGGER.log(variant, code, message);
    }
  };

  module.exports = {
    log: LogVariant,
    logger: LOGGER,
    createLog: createLog,
  };
} catch (err) {
  console.log(err);
}
