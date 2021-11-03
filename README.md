## Redir-Bot

## Anforderungen

| System | Version  |
| ------ | -------- |
| NodeJS | ^16.13.0 |

## Installation

1. Herunterladen des Quellcodes vom Discord-Bot

   ```shell
   git clone https://github.com/DulliAG/URL-Discord-Bot.git
   ```

2. Erstellen einer `list.json`

   ```json
   []
   ```

3. Erstellen einer `config.json`

   > cron_pattern gibt an in welchen Abstand die Links überprüft werden.
   > Siehe [hier](https://crontab.guru/)

   ```json
   {
     "token": "ENTER_BOT_TOKEN",
     "bot": {
       "activity": "Use @dulliag/discord-helper!",
       "cron_pattern": "5 * * * *"
     },
     "message": {
       "channel_id": "ENTER_CHANNEL_ID",
       "role_id": "ENTER_ROLE_ID"
     },
     "commands": {
       "prefix": "!abc"
     }
   }
   ```

4. Installieren der benötigten Packete

   ```shell
   npm i
   ```

5. Starten des Discord Bots
   ```shell
   node index.js
   ```
