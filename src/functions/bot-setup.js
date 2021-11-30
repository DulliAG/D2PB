const Discord = require('discord.js');
const { logger } = require('../Logs');
const PRODUCTION = process.env.PRODUCTION;

/**
 *
 * @param {Discord.Guild} guild
 */
const setupRolesAndChannelsForSpecificGuild = (guild) => {
  const { message } = require('../config.json');

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

  if (
    !guild.channels.cache.find(
      (channel) => channel.name.toLowerCase() === message.channel_changelog_name.toLocaleLowerCase()
    )
  ) {
    guild.channels
      .create(message.channel_changelog_name, {
        type: 'GUILD_TEXT',
        topic: 'Patch changelogs',
      })
      .then(() => {
        if (PRODUCTION)
          logger.log(
            'Create channel',
            `Created channel \`${message.channel_changelog_name}\` for guild \`${guild.name}\``
          );
      })
      .catch((err) => {
        if (PRODUCTION) logger.error('Create channel', err);
      });
  }

  if (
    !guild.channels.cache.find(
      (channel) => channel.name.toLowerCase() === message.channel_update_name.toLocaleLowerCase()
    )
  ) {
    guild.channels
      .create(message.channel_update_name, {
        type: 'GUILD_TEXT',
        topic: 'Patch notifications',
      })
      .then(() => {
        if (PRODUCTION)
          logger.log(
            'Create channel',
            `Created channel \`${message.channel_update_name}\` for guild \`${guild.name}\``
          );
      })
      .catch((err) => {
        if (PRODUCTION) logger.error('Create channel', err);
      });
  }
};

/**
 *
 * @param {Discord.Client} client
 */
const setupRolesAndChannelsForAnyGuild = (client) => {
  client.guilds.cache.forEach((guild) => setupRolesAndChannelsForSpecificGuild(guild));
};

module.exports = { setupRolesAndChannelsForSpecificGuild, setupRolesAndChannelsForAnyGuild };
