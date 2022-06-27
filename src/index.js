require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
const cron = require('cron').CronJob;
const fetch = require('node-fetch');
const { supabase } = require('./supabase');

/**
 *
 * @param {string} gid
 * @param {string} date
 * @returns string
 */
const generateKey = (gid, date) => {
  return `${gid}+-+${date}`;
};

// Classes & functions
const { LogVariant } = require('@dulliag/logger.js');
const { createLog } = require('./Logs');
const Dota2 = require('./Dota2');
const dota = new Dota2();
const {
  setupRolesAndChannelsForSpecificGuild,
  setupRolesAndChannelsForAnyGuild,
} = require('./functions/bot-setup');
const {
  sendLatestPatchNotification,
  sendLatestPatchChangelog,
} = require('./functions/latest-patchnote');

// Enviroment variables & configs
const DOTA_APP_ID = 570;
const PRODUCTION = process.env.PRODUCTION == 'true';
const { version } = require('../package.json');
const { bot, commands, message } = require(`./config.${PRODUCTION ? 'prod' : 'dev'}.json`);

client.on('ready', async () => {
  // Logging
  await createLog(LogVariant.LOG, 'Starting', `Logged in as ${client.user.tag}!`);
  if (PRODUCTION) {
    await createLog(
      LogVariant.INFORMATION,
      'Starting',
      `${client.user.tag} v${version} is running in production mode!`
    );
  }

  // Run bot setup
  if (PRODUCTION) setupRolesAndChannelsForAnyGuild(client);

  // Update bot information
  client.user.setActivity(`${commands.prefix} for more...`);
  client.user.setStatus('online');
  let totalMemberCount = 0;
  client.guilds.cache.forEach((guild) => {
    totalMemberCount += guild.memberCount;
    createLog(
      LogVariant.INFORMATION,
      'Server information',
      `Bot is running on ${guild.name} with ${guild.memberCount} ${
        guild.memberCount > 1 ? 'members' : 'member'
      }!`
    );
  });
  createLog(
    LogVariant.INFORMATION,
    'Bot information',
    `${totalMemberCount} member have access to the ${client.user.tag}!`
  );

  const TASK_FETCH_PATCHES = new cron(
    bot.background_tasks.FETCHING_PATCHES.execution_pattern,
    async () => {
      try {
        let latestProcessedPatch, latestPatchNoteVersion, latestPatchNote;
        const { data, error } = await supabase
          .from('d2pb_config')
          .select('version')
          .eq('type', 'LATEST_PATCH');
        if (error) throw error;

        latestProcessedPatch = data[0].version;
        latestPatchNoteVersion = await dota.getLatestPatchNoteVersion();
        if (latestProcessedPatch === latestPatchNoteVersion) return; // latest is 7.31d
        latestPatchNote = await dota.getLatestPatchNote();
        createLog(
          LogVariant.INFORMATION,
          'Patch Notification',
          `New Dota patch ${latestPatchNote.patch_name} is avaiable!`
        );

        // Send notification and changelog
        client.guilds.cache.forEach((guild) => {
          sendLatestPatchChangelog(guild);
          sendLatestPatchNotification(guild);
        });

        // Update latest served patch-version on our database
        let { error1 } = await supabase
          .from('d2pb_config')
          .update({ version: latestPatchNote.patch_name })
          .match({ type: 'LATEST_PATCH' });
        if (error1) throw error1;
        createLog(
          LogVariant.INFORMATION,
          'Patch Notification',
          `Patch ${latestPatchNote.patch_name} successfully processed!`
        );
      } catch (error) {
        createLog(LogVariant.ERROR, 'Patch Notification', error);
      }
    }
  );

  const TASK_FETCH_NEWS = new cron(
    bot.background_tasks.FETCHING_NEWS.execution_pattern,
    async () => {
      try {
        let latestProcessedArticle, latestArticleId, latestArticle;
        const { data, error } = await supabase
          .from('d2pb_config')
          .select('version')
          .eq('type', 'LATEST_ARTICLE');
        if (error) throw error;
        latestProcessedArticle = data[0].version;
        latestArticle = await fetch(
          'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=' + DOTA_APP_ID
        )
          .then((response) => response.json())
          .then((json) => json.appnews.newsitems[0])
          .catch((err) => {
            throw err;
          });

        const {
          gid,
          title,
          url,
          is_external_url,
          author,
          contents,
          feedlabel,
          date,
          feedname,
          feed_type,
          appid,
          tags = [],
        } = latestArticle;
        latestArticleId = generateKey(gid, date);
        if (latestProcessedArticle === latestArticleId) return;

        // Send news notification
        const parsedDate = new Date(date * 1000); // transform UNIX-timestamp
        client.guilds.cache.forEach((guild) => {
          const newsChannel = guild.channels.cache.find(
            (guildChannel) =>
              guildChannel.isText &&
              guildChannel.name.toLowerCase() ===
                message.channels.find((channel) => channel.id === 'DOTA_NEWS').name.toLowerCase()
          );
          if (newsChannel) {
            // Prepare patch notification message
            const role = guild.roles.cache.find(
              (role) => role.name.toLowerCase() === message.role_name.toLocaleLowerCase()
            );

            // Prepare embed
            const embed = {
              color: 0x0099ff,
              title: title,
              url: url.replace(/ /g, '%20'),
              author: {
                name: author,
              },
              timestamp: parsedDate,
              fields: [
                {
                  name: 'Provider',
                  value: feedlabel,
                  inline: true,
                },
                {
                  name: 'Tags',
                  value:
                    tags.length > 0
                      ? tags.reduce((prev, cur) => (prev += '`' + cur + '` '), '')
                      : 'None',
                  inline: true,
                },
              ],
            };

            newsChannel
              .send({
                content: role ? `${role}\n **New Dota 2 article**` : `**New Dota 2a article**`,
                embeds: [embed],
              })
              .then(() => {
                createLog(
                  LogVariant.LOG,
                  'Article Notifications',
                  `Send article notification on Guild ${guild.name}!`
                );
              })
              .catch((err) => {
                createLog(
                  LogVariant.ERROR,
                  'Article Notifications',
                  'Failed to send article-notifcation cause of:\n' + err
                );
              });
          }
        });

        // Update latest served article on our database
        let { error1 } = await supabase
          .from('d2pb_config')
          .update({ version: latestArticleId })
          .match({ type: 'LATEST_ARTICLE' });
        if (error1) throw error1;
        createLog(
          LogVariant.INFORMATION,
          'Article Notifications',
          `Article ${gid} successfully processed!`
        );
      } catch (err) {
        createLog(LogVariant.ERROR, 'Article Notifications', err);
      }
    }
  );

  // Only start patch checking if we have them enabled in the config
  if (bot.background_tasks.FETCHING_PATCHES.enabled) {
    TASK_FETCH_PATCHES.fireOnTick();
    TASK_FETCH_PATCHES.start();
  }

  // Only start patch checking if we have them enabled in the config
  if (bot.background_tasks.FETCHING_NEWS.enabled) {
    TASK_FETCH_NEWS.fireOnTick();
    TASK_FETCH_NEWS.start();
  }
});

client.on('guildCreate', (guild) => {
  createLog(
    LogVariant.LOG,
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
  createLog(
    LogVariant.LOG,
    'Left guild',
    `Left the guild \`${guild.name}\`(${guild.memberCount} member)`
  );
});

client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;

  const messageContent = msg.content;
  if (messageContent.substring(0, commands.prefix.length) !== commands.prefix) return;
  createLog(LogVariant.LOG, 'Use command', `${msg.author.tag} tried using command ${msg.content}`);

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

    case 'setup':
      const guild = msg.guild;
      const guildMembers = guild.members.cache;
      const authorAsGuildMember = guildMembers.find((member) => member.user.tag === msg.author.tag);
      if (!authorAsGuildMember) {
        createLog(
          LogVariant.WARNING,
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
        createLog(
          LogVariant.WARNING,
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

    case 'version':
      msg.reply(`The bot is running version ${version}!`);
      break;

    case 'help':
    default:
      msg.reply(
        'try using: \n' +
          'If you wanna report a bug or suggest a feature, you can do so here (https://github.com/DulliAG-Customers/Dota2PatchBot-Discussion/)' +
          '`help` - Get help\n' +
          '`latest-changelog` `changelog` - Get the latest changelog\n' +
          '`latest-patch` `patch` - Get the latest patch\n' +
          '`version` - Get the current version\n' +
          '`setup` - Create required roles and channels for this bot\n' +
          '`stats` - Get bot statistics\n'
      );
      break;
  }
});

client.login(PRODUCTION ? process.env.BOT_TOKEN : process.env.DEV_BOT_TOKEN);
