const Discord = require('discord.js');
const { logger } = require('../Logs');
const PRODUCTION = process.env.PRODUCTION == 'true';

/**
 *
 * @param {Discord.Guild} guild
 */
const setupRolesAndChannelsForSpecificGuild = (guild) => {
  const { message } = require(`../config.${PRODUCTION ? 'prod' : 'dev'}.json`);

  // Create required roles for the bot
  if (
    !guild.roles.cache.find(
      (role) => role.name.toLowerCase() === message.role_name.toLocaleLowerCase()
    )
  ) {
    guild.roles
      .create({
        name: message.role_name,
        mentionable: true,
        color: 'DARK_RED',
      })
      .then(() => {
        if (PRODUCTION)
          logger.log(
            'Create role',
            `Created role \`${message.role_name}\` for guild \`${guild.name}\``
          );
      })
      .catch((err) => {
        if (PRODUCTION) logger.error('Create role', err);
      });
  }

  // Create all requried channels for each category
  message.channels.forEach((channel) => {
    if (
      !guild.channels.cache.find(
        (guildChannel) => guildChannel.name.toLowerCase() === channel.name.toLowerCase()
      )
    ) {
      guild.channels
        .create(channel.name, {
          type: 'GUILD_TEXT',
          topic: channel.description,
        })
        .then(() => {
          if (PRODUCTION)
            logger.log(
              'Create channel',
              `Created channel \`${channel.name}\` for guild \`${guild.name}\``
            );
        })
        .catch((err) => {
          if (PRODUCTION) logger.error('Create channel', err);
        });
    }
  });
};

/**
 *
 * @param {Discord.Client} client
 */
const setupRolesAndChannelsForAnyGuild = (client) => {
  client.guilds.cache.forEach((guild) => setupRolesAndChannelsForSpecificGuild(guild));
};

module.exports = { setupRolesAndChannelsForSpecificGuild, setupRolesAndChannelsForAnyGuild };
