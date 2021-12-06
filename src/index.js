require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
const cron = require('cron').CronJob;
const fs = require('fs');
const helper = require('@dulliag/discord-helper');

// Classes & functions
const { logger } = require('./Logs');
const Dota2 = require('./Dota2');
const dota = new Dota2();
const { setupRolesAndChannelsForSpecificGuild } = require('./functions/bot-setup');
const {
  sendLatestPatchNotification,
  sendLatestPatchChangelog,
} = require('./functions/latest-patchnote');

// Enviroment variables & configs
const PRODUCTION = process.env.PRODUCTION == 'true';
const { version } = require('../package.json');
const { bot, commands } = require(`./config.${PRODUCTION ? 'prod' : 'dev'}.json`);

client.on('ready', () => {
  // Logging
  helper.log(`Logged in as ${client.user.tag}!`);
  if (PRODUCTION) {
    helper.log(`${client.user.tag} is running in production mode!`);
    logger.application = client.user.tag;
    logger.log('Bot started', `${client.user.tag} started!`);
  }

  // Update bot information
  client.user.setActivity(`${commands.prefix} for more...`);
  client.user.setStatus('online');
  let totalMemberCount = 0;
  client.guilds.cache.forEach((guild) => {
    totalMemberCount += guild.memberCount;
    helper.log(
      `Bot is running on ${guild.name} with ${guild.memberCount} ${
        guild.memberCount > 1 ? 'members' : 'member'
      }!`
    );
  });
  helper.log(`${totalMemberCount} member have access to the ${client.user.tag}!`);

  // Check if latest_patch.json exists
  if (!fs.existsSync('./src/latest_patch.json')) {
    const content = [];
    fs.writeFileSync('./src/latest_patch.json', JSON.stringify(content));
  }

  const task = new cron(bot.cron_pattern, async () => {
    try {
      fs.readFile('./src/latest_patch.json', 'utf-8', (err, data) => {
        if (err) throw err;
        const latestPatchFile = JSON.parse(data),
          patch = latestPatchFile.patch;

        dota.getLatestPatchNote().then(async (pnote) => {
          if (patch === pnote.patch_name) {
            helper.log('No new Dota patch avaiable!');
            return;
          }

          helper.log(`New Dota patch ${pnote.patch_name} is avaiable!`);
          if (PRODUCTION) logger.log(`New Dota patch ${pnote.patch_name} is avaiable!`);

          // Send notification and changelog
          client.guilds.cache.forEach((guild) => {
            sendLatestPatchChangelog(guild);
            sendLatestPatchNotification(guild);
          });

          // Update local file
          fs.writeFile(
            './src/latest_patch.json',
            JSON.stringify({ patch: pnote.patch_name }),
            (err) => {
              if (err) throw err;
            }
          );
        });
      });
    } catch (error) {
      helper.error(error);
      if (PRODUCTION) logger.error('Fetching4Patches', error);
    }
  });

  // Only start patch checking if we have them enabled in the config
  if (bot.enabled) {
    task.fireOnTick();
    task.start();
  }
});

client.on('guildCreate', (guild) => {
  if (PRODUCTION)
    logger.log(
      'Joined guild',
      `Joined the guild \`${guild.name}\`(${guild.memberCount} ${
        guild.memberCount > 1 ? 'members' : 'member'
      })`
    );

  // Check if the required role & channels exists
  // If not we're gonna create them
  setupRolesAndChannelsForSpecificGuild(guild);
});

client.on('guildDelete', (guild) => {
  if (PRODUCTION)
    logger.log('Left guild', `Left the guild \`${guild.name}\`(${guild.memberCount} member)`);
});

client.on('messageCreate', (msg) => {
  if (helper.isBot(msg.author)) return;

  const messageContent = msg.content;
  if (messageContent.substr(0, commands.prefix.length) !== commands.prefix) return;
  if (PRODUCTION) logger.log('Use command', `${msg.author.tag} tried using command ${msg.content}`);

  const action = messageContent.split(/ /g)[1];
  switch (action) {
    case 'patch':
    case 'latest-patch':
      sendLatestPatchNotification(msg.guild);
      break;

    case 'changelog':
    case 'latest-changelog':
      sendLatestPatchChangelog(msg.guild);
      break;

    case 'version':
      msg.reply(`The bot is running version ${version}!`);
      break;

    case 'setup':
      const guild = msg.guild;
      const guildMembers = guild.members.cache;
      const authorAsGuildMember = guildMembers.find((member) => member.user.tag === msg.author.tag);
      if (!authorAsGuildMember) {
        if (PRODUCTION)
          logger.error(
            'Bot setup',
            `\`${msg.author.tag}\` isn't a guild member of \`${guild.name}\``
          );
        msg.reply('something went wrong!');
      }

      // Check if the user have the permission to manage roles and channels on his guild
      if (
        !authorAsGuildMember.permissions.has([
          Discord.Permissions.FLAGS.MANAGE_CHANNELS,
          Discord.Permissions.FLAGS.MANAGE_ROLES,
        ])
      ) {
        if (PRODUCTION)
          helper.error(
            'Missing permissions',
            `\`${authorAsGuildMember.tag}\` doesn't have the required permissions for the bot setup!`
          );
        msg.reply("you don't have permissions to manage roles and channels on this guild!");
      }

      // Run setup
      setupRolesAndChannelsForSpecificGuild(msg.guild);
      msg.reply('Bot setup successfull!');
      break;

    case 'stats':
      const botGuilds = client.guilds.cache;
      const stats = {
        guilds: botGuilds.reduce((prev, cur) => prev + 1, 0),
        members: botGuilds.reduce((prev, cur) => prev + cur.memberCount, 0),
      };
      const embed = {
        color: 0x0099ff,
        title: `Statistics`,
        fields: [
          {
            name: 'Guilds',
            value: `${stats.guilds}`,
            inline: true,
          },
          {
            name: 'Members',
            value: `${stats.members} member`,
            inline: true,
          },
          {
            name: 'Version',
            value: `Version ${version}`,
            inline: true,
          },
        ],
      };

      msg.reply({ embeds: [embed] });
      break;

    case 'help':
    default:
      msg.reply(
        'try using: \n' +
          '`help` - Get help\n' +
          '`latest-patch` || `patch` - Get the latest patch\n' +
          '`latest-changelog` || `changelog` - Get the latest changelog\n' +
          '`version` - Get the current version\n' +
          '`stats` - Get some statistics about the bot\n' +
          '`setup` - Create required roles and channels for this bot\n'
      );
      break;
  }
});

client.login(process.env.BOT_TOKEN);
