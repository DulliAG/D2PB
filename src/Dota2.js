const fetch = require('node-fetch');

class Dota2 {
  language = 'english';

  getLatestPatchNoteVersion() {
    return new Promise((res, rej) => {
      fetch('https://www.dota2.com/datafeed/patchnoteslist?language=' + this.getLatestPatchNote)
        .then((response) => response.json())
        .then((json) => res(json.patches.pop().patch_name))
        .catch((err) => rej(err));
    });
  }

  getPatchNoteList() {
    return new Promise((res, rej) => {
      fetch('https://www.dota2.com/datafeed/patchnoteslist?language=' + this.language)
        .then((response) => response.json())
        .then((json) => res(json.patches))
        .catch((err) => rej(err));
    });
  }

  getLatestPatchNote() {
    return new Promise((res, rej) => {
      this.getPatchNoteList()
        .then((list) => {
          const latest = list.pop();
          fetch(
            `https://www.dota2.com/datafeed/patchnotes?version=${latest.patch_name}&language=${this.language}`
          )
            .then((response) => response.json())
            .then((json) => res(json))
            .catch((err) => rej(err));
        })
        .catch((err) => rej(err));
    });
  }

  getLatestPatchNoteUrl() {
    return new Promise((res, rej) => {
      fetch('https://www.dota2.com/datafeed/patchnoteslist?language=' + this.getLatestPatchNote)
        .then((response) => response.json())
        .then((json) => res('https://www.dota2.com/patches/' + json.patches.pop().patch_name))
        .catch((err) => rej(err));
    });
  }

  getItemList() {
    return new Promise((res, rej) => {
      fetch('https://www.dota2.com/datafeed/itemlist?language=' + this.language)
        .then((response) => response.json())
        .then((json) => res(json.result.data.itemabilities))
        .catch((err) => rej(err));
    });
  }

  getHeroList() {
    return new Promise((res, rej) => {
      fetch('https://www.dota2.com/datafeed/herolist?language=' + this.language)
        .then((response) => response.json())
        .then((json) => res(json.result.data.heroes))
        .catch((err) => rej(err));
    });
  }

  getAbilityList() {
    return new Promise((res, rej) => {
      fetch('https://www.dota2.com/datafeed/abilitylist?language=' + this.language)
        .then((response) => response.json())
        .then((json) => res(json.result.data.itemabilities))
        .catch((err) => rej(err));
    });
  }
}

module.exports = Dota2;
