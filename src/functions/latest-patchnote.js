const Discord = require('discord.js');
const Dota2 = require('../Dota2');
const dota = new Dota2();
const { LogVariant } = require('@dulliag/logger.js');
const { createLog } = require('../Logs');
const PRODUCTION = process.env.PRODUCTION;

/**
 *
 * @param {Discord.Guild} guild
 */
const sendLatestPatchNotification = (guild) => {
  const { message } = require(`../config.${PRODUCTION ? 'prod' : 'dev'}.json`);

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

    // Prepare patch notification message
    const role = guild.roles.cache.find(
      (r) => r.name.toLowerCase() === message.role_name.toLocaleLowerCase()
    );

    // Prepare embed
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
      (guildChannel) =>
        guildChannel.isText &&
        guildChannel.name.toLowerCase() ===
          message.channels.find((channel) => channel.id === 'DOTA_UPDATES').name.toLowerCase()
    );
    if (updateChannels) {
      updateChannels.forEach((ch) => {
        ch.send({
          content: role
            ? `${role}\n **Gameplay Patch ${pnote.patch_name}**`
            : `**Gameplay Patch ${pnote.patch_name}**`,
          embeds: [embed],
        })
          .then(() => {
            createLog(
              LogVariant.INFORMATION,
              'Message sent',
              `Send patch notification on Guild ${guild.name}!`
            );
          })
          .catch((err) => createLog(LogVariant.ERROR, 'Message sent failed', err));
      });
    }
  });
};

/**
 *
 * @param {Discord.Guild} guild
 */
const sendLatestPatchChangelog = (guild) => {
  const { message } = require(`../config.${PRODUCTION ? 'prod' : 'dev'}.json`);

  dota.getLatestPatchNote().then(async (pnote) => {
    const items = await dota.getItemList();
    const heroes = await dota.getHeroList();

    const role = guild.roles.cache.find(
      (r) => r.name.toLowerCase() === message.role_name.toLocaleLowerCase()
    );
    let changelogMessage = role ? `${role}` : '';
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
        changelogMessage += `\n**${categoryName}**\n`;
        switch (category) {
          case 'generic':
            changes.forEach((change) => (changelogMessage += `- ${change.note}\n`));
            break;

          case 'items':
            changes.forEach((change) => {
              const id = change.ability_id;
              const item_name = items.find((i) => i.id == id).name_english_loc;
              const notes = change.ability_notes;
              changelogMessage += `**${item_name}**\n`;
              notes.forEach((note) => (changelogMessage += `- ${note.note}\n`));
            });
            break;

          case 'heroes':
            changes.forEach((change) => {
              const hero_id = change.hero_id;
              const hero_name = heroes.find((h) => h.id == hero_id).name_english_loc;
              const hero_notes = change.hero_notes;
              const talent_notes = change.talent_notes;
              const abilities = change.abilities;
              changelogMessage += `**${hero_name}**\n`;

              if (hero_notes) {
                hero_notes.forEach((i) => (changelogMessage += `- ${i.note}\n`));
              }

              if (talent_notes) {
                talent_notes.forEach((i) => (changelogMessage += `- ${i.note}\n`));
              }

              if (abilities) {
                abilities.forEach((i) =>
                  i.ability_notes.forEach((note) => (changelogMessage += `- ${note.note}\n`))
                );
              }
            });
            break;

          case 'neutral_items':
            changes.forEach((change) => {
              const id = change.ability_id;
              const item_name = items.find((i) => i.id == id).name_english_loc;
              const notes = change.ability_notes;
              changelogMessage += `**${item_name}**\n`;
              notes.forEach((note) => (changelogMessage += `- ${note.note}\n`));
            });
            break;
        }
      });

    // Send changelogs
    Discord.Util.splitMessage(changelogMessage, { maxLength: 2000 }).forEach((splittedMessage) => {
      const changelogChannels = guild.channels.cache.filter(
        (guildChannel) =>
          guildChannel.isText &&
          guildChannel.name.toLowerCase() ===
            message.channels.find((channel) => channel.id === 'DOTA_CHANGELOGS').name.toLowerCase()
      );
      if (changelogChannels) {
        changelogChannels.forEach((ch) =>
          ch
            .send(splittedMessage)
            .then(() => {
              createLog(
                LogVariant.INFORMATION,
                'Message sent',
                `Send patch changelogs on Guild ${guild.name}`
              );
            })
            .catch((err) => createLog(LogVariant.ERROR, 'Message sent failed', err))
        );
      }
    });
  });
};

module.exports = { sendLatestPatchNotification, sendLatestPatchChangelog };
