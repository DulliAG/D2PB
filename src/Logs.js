const { DatabaseCredentials, Logger } = require('@dulliag/logger.js');
const { database } = require('./config.json');

const credentials = new DatabaseCredentials(
  database.host,
  database.user,
  database.password,
  database.database
);

const LOGGER = new Logger(credentials, 'Dota2PatchBot');

module.exports = {
  credentials,
  logger: LOGGER,
};
