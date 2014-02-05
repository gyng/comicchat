function UI (elements) {
  this.content          = elements.content;
  this.input            = elements.input;
  this.inputForm        = elements.inputForm;
  this.status           = elements.status;
  this.notifyEnabled    = elements.notifyEnabled;
  this.ttsEnabled       = elements.ttsEnabled;
  this.roomSwitcher     = elements.roomSwitcher;
  this.roomSwitcherForm = elements.roomSwitcherForm;

  this.connection   = null;
  this.notification = null;

  this.maxActorsPerBox = 2;
  this.currentBoxActors = 0;
  this.currentBoxes = 0;
  this.previousAuthor = null;

  this.input.value = ''; // Clear on init

  this.setupShortcuts();
  this.setupNotifications();
  this.loadCharacterManifest();
}

UI.prototype = {
  setConnection: function (connection) {
    this.connection = connection;
  },

  setStatus: function (status) {
    this.status.innerHTML = status;
  },

  setupNotifications: function () {
    this.notifyEnabled.onclick = this.requestNotificationsPermission.bind(this);
    this.notification = this.notification || (window.Notification || window.webkitNotifications);
    if (typeof this.notification === 'undefined') this.notifyEnabled.disabled = true;
  },

  requestNotificationsPermission: function () {
    if (typeof this.notification !== 'undefined' && this.notification.permission === 'default') {
      this.notification.requestPermission();
    }
  },

  notify: function (data) {
    if (typeof this.notification !== 'undefined' &&
        this.notification.permission === 'granted' &&
        this.notifyEnabled.checked === true) {
      new Notification('comicchat ' + data.room, {
        lang: 'en-US',
        icon: './res/icon.gif',
        body: data.author + ": " + data.text
      });
    }
  },

  tts: function (data) {
    if (this.ttsEnabled.checked === true) {
      var languages = [
        'en', 'en-US', 'en-UK', 'en-CA', 'en-AU', 'en-NZ',
        'af', 'sq', 'ar', 'hy', 'ca', 'zh-CN', 'zh-TW', 'hr', 'cs', 'da',
        'nl', 'eo', 'fi', 'fr', 'de', 'el', 'ht', 'hi',
        'hu', 'is', 'id', 'it', 'ja', 'ko', 'la', 'lv',
        'mk', 'no', 'pl', 'pt', 'ro', 'ru', 'sr', 'sk',
        'es', 'sw', 'sv', 'ta', 'th', 'tr', 'vi', 'cy'
      ];

      // Pick 'random' language 'voice'
      var language = languages[Math.floor(this.getHashCode(data.author)) % languages.length];

      // Basic language guessing (CJK now).
      // Override if language detected.
      // Only works for languages with different character sets.
      // Calling Google's detect language API needs JSONP (I think), which
      // is too much trouble now. Exceptions are here.
      if (data.text.match(/[\u3040-\u309F\u30A0-\u30FF]/g)) {
        language = 'ja';
      } else if (data.text.match(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/g)) {
        language = 'ko';
      } else if (data.text.match(/[\u4E00-\u9FFF]/g)) {
        language = 'zh-CN';
      }

      var google_tts = "http://translate.google.com/translate_tts?ie=utf-8&q=" + data.text + '&tl=' + language;
      var sound = new Audio(google_tts);
      sound.play();
    }
  },

  setupShortcuts: function () {
    this.inputForm.onsubmit = function (e) {
      e.preventDefault();
      this.connection.send(JSON.stringify({
        type: 'message',
        room: document.location.hash,
        text: this.input.value
      }));
      this.input.placeholder = 'Chat...';
      this.inputForm.reset();
    }.bind(this);

    this.roomSwitcherForm.onsubmit = function (e) {
      e.preventDefault();
      // Change room -- part and join (no multiroom support in front end)
      this.connection.send(JSON.stringify({
        type: 'part',
        room: window.location.hash
      }));

      window.location.hash = this.roomSwitcher.value;
      this.connection.send(JSON.stringify({
        type: 'join',
        room: window.location.hash
      }));

      this.roomSwitcher.value = window.location.hash;
      this.roomSwitcher.placeholder = window.location.hash;

      // Grab history of new room
      this.clearContent();
      this.connection.send(JSON.stringify({
        type: 'history',
        room: window.location.hash
      }));
    }.bind(this);
  },

  clearContent: function () {
    this.content.innerHTML = '';
    this.currentBoxActors = 0;
    this.currentBoxes = 0;
  },

  addHistory: function (history) {
    for (var i = 0; i < history.length; i++) {
      this.addLine(JSON.parse(history[i]));
    }
  },

  addLine: function (message) {
    // Make a new box if
    // * We hit maximum number of actors in a box
    // * No boxes
    // * It's a monologue
    var newBox =
      this.currentBoxActors >= this.maxActorsPerBox ||
      this.currentBoxes === 0 ||
      this.previousAuthor === message.author;

    if (newBox === true) {
      this.content.appendChild(this.makeBox());
      window.scrollTo(0, document.body.scrollHeight);
      this.currentBoxActors = 0;
      this.currentBoxes++;
    }

    var boxes = this.content.querySelectorAll(".box");
    var box = boxes[boxes.length - 1];
    var flip = this.currentBoxActors >= this.maxActorsPerBox / 2;

    box.appendChild(this.makeActor(message, flip));
    this.currentBoxActors++;
    this.previousAuthor = message.author;
  },

  makeBox: function () {
    var boxTemplate = document.getElementById('box-template').innerHTML;
    var box = document.createElement('div');
    box.innerHTML = boxTemplate;

    return box.getElementsByTagName('div')[0];
  },

  makeActor: function (message, flip) {
    var actorTemplate = document.getElementById('actor-template').innerHTML;
    var characters = this.characters;

    var character = characters[this.getHashCode(message.author) % characters.length];
    var avatar = document.createElement('img');
    var avatarImageIndex = this.getHashCode(message.text + ' ' + message.author + ' ' + this.currentBoxes) % character.images.length;
    avatar.src = './res/avatars/' + character.name + '/' + character.images[avatarImageIndex] + '.png';

    // Make characters face each other
    if (flip === true) {
      if (avatar.classList) {
        avatar.classList.add('flip-horizontal');
      } else {
        avatar.className += ' flip-horizontal';
      }
    }

    var actor = document.createElement('div');
    actor.innerHTML = actorTemplate;
    actor.querySelector('.text').appendChild(document.createTextNode(message.text));
    actor.querySelector('.name').appendChild(document.createTextNode(message.author));
    actor.querySelector('.avatar').appendChild(avatar);

    return actor.getElementsByTagName('div')[0];
  },

  loadCharacterManifest: function () {
    var request = new XMLHttpRequest();
    request.open('GET', './res/avatars/manifest.json', true);
    request.send();

    var that = this;
    request.onload = function() {
      that.characters = JSON.parse(this.response);
    };
  },

  getHashCode: function (string) {
    var hash = 0;

    if (string.length === 0) {
      return hash;
    }

    for (var i = 0; i < string.length; i++) {
      hash = ((hash << 5) - hash) + string.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash);
  }
};