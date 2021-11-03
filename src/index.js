const Discord = require('discord.js');
const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
const cron = require('cron').CronJob;
const fs = require('fs');
const helper = require('@dulliag/discord-helper');

const Dota2 = require('./Dota2');
const dota = new Dota2();

const { token, bot, message } = require('./config.json');

client.on('ready', () => {
  helper.log(`Logged in as ${client.user.tag}!`);
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
      // dota
      //   .getPatchNoteList()
      //   .then((list) => {
      //     let categories = [];
      //     list.forEach((patch) => {
      //       const version = patch.patch_name;
      //       fetch(`https://www.dota2.com/datafeed/patchnotes?version=${version}&language=english`)
      //         .then((response) => response.json())
      //         .then((json) => {
      //           Object.keys(json)
      //             .filter((key) => {
      //               return (
      //                 key !== 'patch_number' &&
      //                 key !== 'patch_name' &&
      //                 key !== 'patch_timestamp' &&
      //                 key !== 'success'
      //               );
      //             })
      //             .forEach((category) => categories.push(category));

      //           console.log([...new Set(categories)]);
      //         })
      //         .catch((err) => console.log(err));
      //     });
      //   })
      //   .catch((err) => console.log(err));

      const items = await dota.getItemList();
      const heroes = await dota.getHeroList();

      dota.getLatestPatchNote().then((pnote) => {
        const { patch } = require('./latest_patch.json');
        if (patch == pnote.patch_name) {
          helper.log('No new Dota patch avaiable!');
          return;
        }

        helper.log(`New Dota patch ${pnote.patch_name} is avaiable!`);

        client.guilds.cache.forEach((guild) => {
          const role = guild.roles.cache.find(
            (r) =>
              r.name.toLowerCase().includes(message.role_name.toLocaleLowerCase()) &&
              !r.name.includes('Dota2 Patches')
          );
          let msg = `${role}` ?? '';
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

          Discord.Util.splitMessage(msg, { maxLength: 2000 }).forEach((splittedMessage) => {
            const channel = guild.channels.cache.filter(
              (c) =>
                c.isText && c.name.toLowerCase().includes(message.channel_name.toLocaleLowerCase())
            );
            if (channel) {
              channel.forEach((ch) =>
                ch
                  .send(splittedMessage)
                  .then(() => {})
                  .catch((err) => helper.error(err))
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
    } catch (error) {
      helper.error(error);
    }
  });
  // task.fireOnTick(false); // Only for dev-purposes
  task.start();
});

client.login(token);
