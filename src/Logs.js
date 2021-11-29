const { DatabaseCredentials, Logger } = require('@dulliag/logger.js');
require('dotenv').config();

const credentials = new DatabaseCredentials(
  process.env.DB_HOST,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  process.env.DB_DATABASE
);

const LOGGER = new Logger(credentials, 'Dota2PatchBot');

module.exports = {
  credentials,
  logger: LOGGER,
};
