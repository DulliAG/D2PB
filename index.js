const Discord = require('discord.js');
const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
const fetch = require('node-fetch');
const cron = require('cron').CronJob;
const fs = require('fs');
const helper = require('@dulliag/discord-helper');
const { token, bot, message, commands } = require('./config.json');

client.on('ready', () => {
  helper.log(`Logged in as ${client.user.tag}!`);
  if (!fs.existsSync('./list.json')) {
    const content = { links: [] };
    fs.writeFileSync('./list.json', JSON.stringify(content));
  }

  const task = new cron(bot.cron_pattern, () => {
    try {
      fs.readFile('./list.json', 'utf-8', (err, data) => {
        if (err) throw err;
        const json = JSON.parse(data.toString());
        json.forEach((link) => {
          fetch(link)
            .then((response) => {
              if (response.status != 200) {
                helper.error(link, ' is not reachable!');
                return;
              }
              if (response.redirected) {
                console.log(link + ' is an invalid link');
              } else {
                console.log(link + ' is a good link');
              }

              if (!response.redirected) {
                const channel = client.channels.cache.find(
                  (channel) => channel.id == message.channel_id
                );
                const embed = {
                  title: `Link: ${link}`,
                  description: `Der Link ${link} ist aktiv!`,
                  // fields: [
                  //   {
                  //     name: 'Feld',
                  //     value: 'Inhalt',
                  //   },
                  // ],
                };

                channel
                  .send({ embeds: [embed] })
                  .then(() => helper.log('Message sent!'))
                  .catch((err) => helper.error(err));
              }
            })
            .catch((err) => {
              throw err;
            });
        });
      });
    } catch (error) {
      helper.error(error);
    }
  });
  task.fireOnTick(false); // Only for dev-purposes
  task.start();
});

client.on('messageCreate', (msg) => {
  if (helper.isBot(msg.member)) return;
  if (msg.content.substr(0, commands.prefix.length) !== commands.prefix) return;
  if (msg.guild.ownerId !== msg.author.id) {
    msg.reply('Nur der Serverowner darf diese Befehle ausführen!');
    return;
  }

  const input = msg.content,
    args = input.split(/ /g),
    cmd = args[1],
    action = cmd;
  let argValues = {};
  let itemIndex = -1;
  switch (action) {
    case 'list':
      try {
        fs.readFile('./list.json', 'utf-8', (err, data) => {
          if (err) throw err;
          const json = JSON.parse(data.toString());
          const embed = {
            title: 'Links',
            fields: json.map((link) => {
              return { name: 'URL', value: link };
            }),
          };

          msg.channel.send({ embeds: [embed] });
        });
      } catch (error) {
        helper.error(error);
      }
      break;

    case 'run':
      try {
        fs.readFile('./list.json', 'utf-8', (err, data) => {
          if (err) throw err;
          const json = JSON.parse(data.toString());
          json.forEach((link) => {
            fetch(link)
              .then((response) => {
                if (response.status != 200) {
                  helper.error(link, ' is not reachable!');
                  return;
                }

                if (!response.redirected) {
                  const channel = client.channels.cache.find(
                    (channel) => channel.id == message.channel_id
                  );
                  const embed = {
                    title: `Link: ${link}`,
                    description: `Der Link ${link} ist aktiv!`,
                    // fields: [
                    //   {
                    //     name: 'Feld',
                    //     value: 'Inhalt',
                    //   },
                    // ],
                  };

                  channel
                    .send({ embeds: [embed] })
                    .then(() => helper.log('Message sent!'))
                    .catch((err) => helper.error(err));
                }
              })
              .catch((err) => {
                throw err;
              });
          });
        });
      } catch (error) {
        helper.error(error);
      }
      break;

    // <prefix> add <url>
    case 'add':
      if (args.length !== 3) {
        msg.reply('Versuche es mit `' + commands.prefix + '` add <url>');
        return;
      }

      argValues = {
        url: args[2],
      };

      fs.readFile('./list.json', 'utf-8', (err, data) => {
        if (err) throw err;
        const json = JSON.parse(data.toString());
        // Check we're already following this stock
        itemIndex = json.findIndex((link) => link == argValues.url);
        if (itemIndex !== -1) {
          msg.reply(`der Link ist bereits auf der Liste!`);
          return;
        }

        json.push(argValues.url);
        fs.writeFile('./list.json', JSON.stringify(json), (err) => {
          if (err) throw err;
        });
        msg.reply(`Der Link wurde hinzugefügt!`);
      });
      break;

    case 'remove':
      if (args.length !== 3) {
        msg.reply('Versuche es mit `' + commands.prefix + '` remove <url>!');
        return;
      }

      argValues = {
        url: args[2],
      };

      fs.readFile('./list.json', 'utf-8', (err, data) => {
        if (err) throw err;
        const json = JSON.parse(data.toString());
        itemIndex = json.findIndex((url) => url == argValues.url);
        if (itemIndex == -1) {
          msg.reply(`Der Link steht nicht auf der Liste!`);
          return;
        }

        const updatedList = JSON.stringify(json.filter((link, index) => index !== itemIndex));
        fs.writeFile('./list.json', updatedList, (err) => {
          if (err) throw err;
        });
        msg.reply(`Der Link wurde entfernt!`);
      });
      break;

    default:
      msg.reply('Der Befehl wurde nicht gefunden!');
      break;
  }
});

client.login(token);
