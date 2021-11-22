const Discord = require('discord.js');
const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
const cron = require('cron').CronJob;
const fs = require('fs');
const helper = require('@dulliag/discord-helper');

const { logger } = require('./Logs');
const Dota2 = require('./Dota2');
const dota = new Dota2();

const { version } = require('../package.json');
const { token, bot, commands, message } = require('./config.json');

const PRODUCTION = true;

client.on('ready', () => {
  logger.application = client.user.tag;
  if (PRODUCTION) helper.log(`${client.user.tag} is running in production mode!`);
  helper.log(`Logged in as ${client.user.tag}!`);
  if (PRODUCTION) logger.log('Bot started', `${client.user.tag} started!`);

  client.user.setActivity('Checking for patches...', { type: 'WATCHING' });
  client.user.setStatus('online');
  client.guilds.cache.forEach((guild) => {
    const guildName = guild.name;
    helper.log(`Bot is running on ${guildName}!`);
  });

  if (!fs.existsSync('./src/latest_patch.json')) {
    const content = [];
    fs.writeFileSync('./src/latest_patch.json', JSON.stringify(content));
  }

  const task = new cron(bot.cron_pattern, async () => {
    try {
      if (PRODUCTION) logger.log('Fetching4Patches', 'Start fetching for new Dota 2 patches!');

      const items = await dota.getItemList();
      const heroes = await dota.getHeroList();
      fs.readFile('./src/latest_patch.json', 'utf-8', (err, data) => {
        if (err) throw err;
        const latestPatchFile = JSON.parse(data),
          patch = latestPatchFile.patch;

        dota.getLatestPatchNote().then(async (pnote) => {
          if (patch == pnote.patch_name) {
            helper.log('No new Dota patch avaiable!');
            return;
          }

          helper.log(`New Dota patch ${pnote.patch_name} is avaiable!`);
          if (PRODUCTION) logger.log(`New Dota patch ${pnote.patch_name} is avaiable!`);

          client.guilds.cache.forEach((guild) => {
            const role = guild.roles.cache.find(
              (r) =>
                r.name.toLowerCase().includes(message.role_name.toLocaleLowerCase()) &&
                !r.name.includes('Dota2 Patches')
            );
            let msg = role ? `${role}` : '';
            let genericsUpdated = 0;
            let itemsUpdated = 0;
            let heroesUpdated = 0;
            Object.keys(pnote)
              .filter((key) => {
                return (
                  key !== 'patch_number' &&
                  key !== 'patch_name' &&
                  key !== 'patch_timestamp' &&
                  key !== 'success'
                );
              })
              .forEach((category) => {
                const changes = pnote[category];
                const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                msg += `\n**${categoryName}**\n`;
                switch (category) {
                  case 'generic':
                    genericsUpdated += category.length;
                    changes.forEach((change) => (msg += `- ${change.note}\n`));
                    break;

                  case 'items':
                    items += category.length;
                    changes.forEach((change) => {
                      const id = change.ability_id;
                      const item_name = items.find((i) => i.id == id).name_english_loc;
                      const notes = change.ability_notes;
                      msg += `**${item_name}**\n`;
                      notes.forEach((note) => (msg += `- ${note.note}\n`));
                    });
                    break;

                  case 'heroes':
                    heroesUpdated += category.length;
                    changes.forEach((change) => {
                      const hero_id = change.hero_id;
                      const hero_name = heroes.find((h) => h.id == hero_id).name_english_loc;
                      const hero_notes = change.hero_notes;
                      const talent_notes = change.talent_notes;
                      const abilities = change.abilities;
                      msg += `**${hero_name}**\n`;

                      if (hero_notes) {
                        hero_notes.forEach((i) => (msg += `- ${i.note}\n`));
                      }

                      if (talent_notes) {
                        talent_notes.forEach((i) => (msg += `- ${i.note}\n`));
                      }

                      if (abilities) {
                        abilities.forEach((i) =>
                          i.ability_notes.forEach((note) => (msg += `- ${note.note}\n`))
                        );
                      }
                    });
                    break;

                  case 'neutral_items':
                    itemsUpdated += category.length;
                    changes.forEach((change) => {
                      const id = change.ability_id;
                      const item_name = items.find((i) => i.id == id).name_english_loc;
                      const notes = change.ability_notes;
                      msg += `**${item_name}**\n`;
                      notes.forEach((note) => (msg += `- ${note.note}\n`));
                    });
                    break;
                }
              });

            const embed = {
              color: 0x0099ff,
              title: `Patch ${pnote.patch_name}`,
              url: `https://www.dota2.com/patches/${pnote.patch_name}`,
              thumbnail: {
                url: 'https://files.dulliag.de/sharex/Actual_Logo.png',
              },
              fields: [
                {
                  name: 'Version',
                  value: pnote.patch_name,
                  inline: true,
                },
                {
                  name: 'Patch notes',
                  value: `[Here](https://www.dota2.com/patches/${pnote.patch_name})`,
                  inline: true,
                },
                {
                  name: 'Date',
                  value: new Date(pnote.patch_timestamp * 1000).toLocaleDateString('en-US'),
                  inline: true,
                },
                {
                  name: 'General updates',
                  value: `${genericsUpdated} general updates!`,
                  inline: true,
                },
                {
                  name: 'Item updates',
                  value: `${itemsUpdated} item updates!`,
                  inline: true,
                },
                {
                  name: 'Hero updates',
                  value: `${heroesUpdated} heroes hero updates!`,
                  inline: true,
                },
              ],
            };

            // Send update notification
            const updateChannels = guild.channels.cache.filter(
              (c) =>
                c.isText &&
                c.name.toLowerCase().includes(message.channel_update_name.toLocaleLowerCase())
            );
            if (updateChannels) {
              updateChannels.forEach((ch) => {
                if (role) {
                  ch.send({
                    content: `${role}\n **Gameplay Patch ${pnote.patch_name}**`,
                    embeds: [embed],
                  })
                    .then(() => {
                      if (PRODUCTION)
                        logger.log(
                          'Message sent',
                          `Send patch notification on Guild ${guild.name}!`
                        );
                    })
                    .catch((err) => {
                      if (PRODUCTION) logger.error('Message sent failed', err);
                    });
                } else {
                  ch.send({ embeds: [embed] })
                    .then(() => {
                      if (PRODUCTION)
                        logger.log(
                          'Message sent',
                          `Send patch notification on Guild ${guild.name}!`
                        );
                    })
                    .catch((err) => {
                      if (PRODUCTION) logger.error('Message sent failed', err);
                    });
                }
              });
            }

            // Send changelogs
            Discord.Util.splitMessage(msg, { maxLength: 2000 }).forEach((splittedMessage) => {
              const changelogChannels = guild.channels.cache.filter(
                (c) =>
                  c.isText &&
                  c.name.toLowerCase().includes(message.channel_changelog_name.toLocaleLowerCase())
              );
              if (changelogChannels) {
                changelogChannels.forEach((ch) =>
                  ch
                    .send(splittedMessage)
                    .then(() => {
                      if (PRODUCTION)
                        logger.log('Message sent', `Send patch changelogs on Guild ${guild.name}`);
                    })
                    .catch((err) => {
                      if (PRODUCTION) logger.error('Message sent failed', err);
                    })
                );
              }
            });
          });

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
  task.fireOnTick();
  task.start();
});

client.on('guildCreate', (guild) => {
  if (PRODUCTION) logger.log('Joined guild', `Joined the guild \`${guild.name}\``);

  // Check if the required role & channels exists
  // If not we're gonna create them
  if (
    !guild.roles.cache.find(
      (role) =>
        role.name.toLowerCase().includes(message.role_name.toLocaleLowerCase()) &&
        !role.name.includes(client.user.username)
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
    !guild.channels.cache.find((channel) =>
      channel.name.toLowerCase().includes(message.channel_changelog_name.toLocaleLowerCase())
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
    !guild.channels.cache.find((channel) =>
      channel.name.toLowerCase().includes(message.channel_update_name.toLocaleLowerCase())
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
});

client.on('guildDelete', (guild) => {
  if (PRODUCTION) logger.log('Left guild', `Left the guild \`${guild.name}\``);
});

client.on('messageCreate', (msg) => {
  if (helper.isBot(msg.author)) return;

  const messageContent = msg.content;
  if (messageContent.substr(0, commands.prefix.length) !== commands.prefix) return;
  if (PRODUCTION) logger.log('Use command', `${msg.author.tag} tried using command ${msg.content}`);

  const action = messageContent.split(/ /g)[1];
  switch (action) {
    case 'latest-patch':
      dota.getLatestPatchNote().then((pnote) => {
        let genericsUpdated = 0;
        let itemsUpdated = 0;
        let heroesUpdated = 0;
        Object.keys(pnote)
          .filter((key) => {
            return (
              key !== 'patch_number' &&
              key !== 'patch_name' &&
              key !== 'patch_timestamp' &&
              key !== 'success'
            );
          })
          .forEach((category) => {
            switch (category) {
              case 'generic':
                genericsUpdated += category.length;
                break;

              case 'items':
                itemsUpdated += category.length;
                break;

              case 'heroes':
                heroesUpdated += category.length;
                break;

              case 'neutral_items':
                itemsUpdated += category.length;
                break;
            }
          });

        const guild = msg.guild;
        const role = guild.roles.cache.find(
          (r) =>
            r.name.toLowerCase().includes(message.role_name.toLocaleLowerCase()) &&
            !r.name.includes('Dota2 Patches')
        );

        const embed = {
          color: 0x0099ff,
          title: `Patch ${pnote.patch_name}`,
          url: `https://www.dota2.com/patches/${pnote.patch_name}`,
          thumbnail: {
            url: 'https://files.dulliag.de/sharex/Actual_Logo.png',
          },
          fields: [
            {
              name: 'Version',
              value: pnote.patch_name,
              inline: true,
            },
            {
              name: 'Patch notes',
              value: `[Here](https://www.dota2.com/patches/${pnote.patch_name})`,
              inline: true,
            },
            {
              name: 'Date',
              value: new Date(pnote.patch_timestamp * 1000).toLocaleDateString('en-US'),
              inline: true,
            },
            {
              name: 'General updates',
              value: `${genericsUpdated} general updates!`,
              inline: true,
            },
            {
              name: 'Item updates',
              value: `${itemsUpdated} item updates!`,
              inline: true,
            },
            {
              name: 'Hero updates',
              value: `${heroesUpdated} hero updates!`,
              inline: true,
            },
          ],
        };

        // Send embed message
        const updateChannels = guild.channels.cache.filter(
          (c) =>
            c.isText &&
            c.name.toLowerCase().includes(message.channel_update_name.toLocaleLowerCase())
        );
        if (updateChannels) {
          updateChannels.forEach((ch) => {
            if (role) {
              ch.send({
                content: `${role}\n **Gameplay Patch ${pnote.patch_name}**`,
                embeds: [embed],
              })
                .then(() => {
                  if (PRODUCTION)
                    logger.log('Message sent', `Send patch notification on Guild ${guild.name}!`);
                })
                .catch((err) => {
                  if (PRODUCTION) logger.error('Message sent failed', err);
                });
            } else {
              ch.send({ embeds: [embed] })
                .then(() => {
                  if (PRODUCTION)
                    logger.log('Message sent', `Send patch notification on Guild ${guild.name}!`);
                })
                .catch((err) => {
                  if (PRODUCTION) logger.error('Message sent failed', err);
                });
            }
          });
        }
      });
      break;

    case 'latest-changelog':
      dota.getLatestPatchNote().then(async (pnote) => {
        const items = await dota.getItemList();
        const heroes = await dota.getHeroList();

        const guild = msg.guild;
        const role = guild.roles.cache.find(
          (r) =>
            r.name.toLowerCase().includes(message.role_name.toLocaleLowerCase()) &&
            !r.name.includes('Dota2 Patches')
        );
        let msg = role ? `${role}` : '';
        Object.keys(pnote)
          .filter((key) => {
            return (
              key !== 'patch_number' &&
              key !== 'patch_name' &&
              key !== 'patch_timestamp' &&
              key !== 'success'
            );
          })
          .forEach((category) => {
            const changes = pnote[category];
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            msg += `\n**${categoryName}**\n`;
            switch (category) {
              case 'generic':
                changes.forEach((change) => (msg += `- ${change.note}\n`));
                break;

              case 'items':
                changes.forEach((change) => {
                  const id = change.ability_id;
                  const item_name = items.find((i) => i.id == id).name_english_loc;
                  const notes = change.ability_notes;
                  msg += `**${item_name}**\n`;
                  notes.forEach((note) => (msg += `- ${note.note}\n`));
                });
                break;

              case 'heroes':
                changes.forEach((change) => {
                  const hero_id = change.hero_id;
                  const hero_name = heroes.find((h) => h.id == hero_id).name_english_loc;
                  const hero_notes = change.hero_notes;
                  const talent_notes = change.talent_notes;
                  const abilities = change.abilities;
                  msg += `**${hero_name}**\n`;

                  if (hero_notes) {
                    hero_notes.forEach((i) => (msg += `- ${i.note}\n`));
                  }

                  if (talent_notes) {
                    talent_notes.forEach((i) => (msg += `- ${i.note}\n`));
                  }

                  if (abilities) {
                    abilities.forEach((i) =>
                      i.ability_notes.forEach((note) => (msg += `- ${note.note}\n`))
                    );
                  }
                });
                break;

              case 'neutral_items':
                changes.forEach((change) => {
                  const id = change.ability_id;
                  const item_name = items.find((i) => i.id == id).name_english_loc;
                  const notes = change.ability_notes;
                  msg += `**${item_name}**\n`;
                  notes.forEach((note) => (msg += `- ${note.note}\n`));
                });
                break;
            }
          });

        // Send changelogs
        Discord.Util.splitMessage(msg, { maxLength: 2000 }).forEach((splittedMessage) => {
          const changelogChannels = guild.channels.cache.filter(
            (c) =>
              c.isText &&
              c.name.toLowerCase().includes(message.channel_changelog_name.toLocaleLowerCase())
          );
          if (changelogChannels) {
            changelogChannels.forEach((ch) =>
              ch
                .send(splittedMessage)
                .then(() => {
                  if (PRODUCTION)
                    logger.log('Message sent', `Send patch changelogs on Guild ${guild.name}`);
                })
                .catch((err) => {
                  if (PRODUCTION) logger.error('Message sent failed', err);
                })
            );
          }
        });
      });
      break;

    case 'version':
      msg.reply(`The bot is running version ${version}!`);
      break;

    case 'help':
    default:
      msg.reply(
        'try using: \n' +
          '`help` - Get help\n' +
          '`latest-patch` - Get the latest patch\n' +
          '`latest-changelog` - Get the latest changelog\n' +
          '`version` - Get the current version\n'
      );
      break;
  }
});

client.login(token);
