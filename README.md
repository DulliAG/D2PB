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

2. Erstellen einer `last_patch.json`

   > Gibt an ab welcher Patch zuletzt geprüft wurde

   ```json
   { "patch": "7.30e" }
   ```

3. Erstellen einer `config.json`

   > cron_pattern gibt an in welchen Abstand die Links überprüft werden.
   > Siehe [hier](https://crontab.guru/)

   ```json
   {
     "token": "ENTER_BOT_TOKEN",
     "bot": {
       "activity": "Checking for Dota2 patches!",
       "cron_pattern": "5 * * * *"
     },
     "message": {
       "channel_changelog_name": "dota-changelogs",
       "channel_update_name": "dota-updates",
       "role_name": "dota"
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
