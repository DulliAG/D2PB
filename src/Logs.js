const { Database, LogVariant, Credentials, Client } = require('@dulliag/logger.js');
require('dotenv').config();

try {
  const credentials = new Credentials(
    process.env.DB_HOST,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    process.env.DB_DATABASE
  );

  const LOGGER = new Client(Database.PG, credentials, 'Dota2PatchBot');

  module.exports = {
    log: LogVariant,
    logger: LOGGER,
  };
} catch (err) {
  console.log(err);
}
