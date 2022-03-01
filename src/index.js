require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
const cron = require('cron').CronJob;
const fs = require('fs');
const helper = require('@dulliag/discord-helper');
const fetch = require('node-fetch');

// Classes & functions
const { logger } = require('./Logs');
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

client.on('ready', () => {
  // Logging
  helper.log(`Logged in as ${client.user.tag}!`);
  if (PRODUCTION) {
    helper.log(`${client.user.tag} v${version} is running in production mode!`);
    logger.application = client.user.username;
    logger.log('Bot started', `${client.user.tag} started!`);
  }

  // Run bot setup
  if (PRODUCTION) setupRolesAndChannelsForAnyGuild(client);

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
  if (!fs.existsSync('./src/latest_patch.json'))
    fs.writeFileSync('./src/latest_patch.json', JSON.stringify({ patch: '' }));

  // Check if latest_article.json exists
  if (!fs.existsSync('./src/latest_article.json'))
    fs.writeFileSync('./src/latest_article.json', JSON.stringify({ article: '' }));

  const TASK_FETCH_PATCHES = new cron(
    bot.background_tasks.FETCHING_PATCHES.execution_pattern,
    async () => {
      try {
        fs.readFile('./src/latest_patch.json', 'utf-8', (err, data) => {
          if (err) throw err;
          const latestPatchFile = JSON.parse(data),
            patch = latestPatchFile.patch;

          dota
            .getLatestPatchNoteVersion()
            .then((version) => {
              if (patch === version) {
                helper.log('No new Dota patch avaiable!');
                return;
              }

              dota.getLatestPatchNote().then(async (patchNote) => {
                helper.log(`New Dota patch ${patchNote.patch_name} is avaiable!`);
                if (PRODUCTION) logger.log(`New Dota patch ${patchNote.patch_name} is avaiable!`);

                // Send notification and changelog
                client.guilds.cache.forEach((guild) => {
                  sendLatestPatchChangelog(guild);
                  sendLatestPatchNotification(guild);
                });

                // Update local file
                fs.writeFile(
                  './src/latest_patch.json',
                  JSON.stringify({ patch: patchNote.patch_name }),
                  (err) => {
                    if (err) throw err;
                  }
                );
              });
            })
            .catch((err) => console.log('ERROR: ' + err));
        });
      } catch (error) {
        helper.error(error);
        if (PRODUCTION) logger.error('Fetching4Patches', error);
      }
    }
  );

  const TASK_FETCH_NEWS = new cron(bot.background_tasks.FETCHING_NEWS.execution_pattern, () => {
    try {
      fs.readFile('./src/latest_article.json', 'utf-8', (err, data) => {
        if (err) throw err;
        const latestArticleFile = JSON.parse(data),
          latestSentArticle = latestArticleFile.article;

        fetch(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${DOTA_APP_ID}`)
          .then((response) => response.json())
          .then((json) => {
            const articles = json.appnews.newsitems;
            const latestArticle = articles[0];
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

            /**
             *
             * @param {string} gid
             * @param {string} date
             * @returns string
             */
            const generateKey = (gid, date) => {
              return `${gid}+-+${date}`;
            };

            /**
             *
             * @param {string} gid
             * @param {string} date
             * @returns object
             */
            const generateArticleJson = (gid, date) => {
              return { article: generateKey(gid, date) };
            };

            if (
              latestSentArticle &&
              JSON.stringify(latestSentArticle) == JSON.stringify(generateKey(gid, date))
            ) {
              let msg = `There is no new article for Dota 2. (Latest article: ${gid})`;
              helper.log(msg);
              if (PRODUCTION) logger.log(msg);
              return;
            }

            // Send news notification
            const parsedDate = new Date(date * 1000); // transform UNIX-timestamp
            client.guilds.cache.forEach((guild) => {
              const newsChannel = guild.channels.cache.find(
                (guildChannel) =>
                  guildChannel.isText &&
                  guildChannel.name.toLowerCase() ===
                    message.channels
                      .find((channel) => channel.id === 'DOTA_NEWS')
                      .name.toLowerCase()
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
                  url: url,
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
                    let msg = `Send news notification on Guild ${guild.name}!`;
                    helper.log(msg);
                    if (PRODUCTION) logger.log('Message sent', msg);
                  })
                  .catch((err) => {
                    helper.error('Failed to send news-notifcation cause of:\n' + err);
                    if (PRODUCTION) logger.error('Message sent failed', err);
                  });
              }
            });

            // Update local file
            fs.writeFile(
              './src/latest_article.json',
              JSON.stringify(generateArticleJson(gid, date)),
              (err) => {
                if (err) throw err;
              }
            );
          })
          .catch((err) => {
            throw err;
          });
      });
    } catch (err) {
      if (PRODUCTION) logger.error('Fetching news', err);
      helper.error(err);
    }
  });

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
          '`setup` - Create required roles and channels for this bot\n'
      );
      break;
  }
});

client.login(process.env.BOT_TOKEN);
