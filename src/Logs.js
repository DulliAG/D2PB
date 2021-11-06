const { DatabaseCredentials, Logger } = require('@dulliag/logger.js');
const { database } = require('./config.json');

const credentials = new DatabaseCredentials(
  database.host,
  database.user,
  database.password,
  database.database
);

module.exports = {
  credentials,
  logger: new Logger(credentials, 'Bot Development Test#7399'),
};
