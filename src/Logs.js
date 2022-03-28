const { Database, LogVariant, Credentials, Client } = require('@dulliag/logger.js');
const helper = require('@dulliag/discord-helper');
require('dotenv').config();

try {
  const credentials = new Credentials(
    process.env.DB_HOST,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    process.env.DB_DATABASE
  );

  const LOGGER = new Client(Database.PG, credentials, 'Dota2PatchBot');

  /**
   *
   * @param {LogVariant} variant
   * @param {string} code
   * @param {string} message
   */
  const createLog = (variant, code, message) => {
    if (variant.ERROR || variant.WARNING) {
      helper.error(message);
    } else {
      helper.log(message);
    }

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
