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
  this.currentBox = null;
  this.previousAuthor = null;

  this.input.value = ''; // Clear on init

  this.synth = window.speechSynthesis;
  if (typeof this.synth === 'undefined') {
    this.ttsEnabled.disabled = true;
  } else {
    this.synth.speak(new SpeechSynthesisUtterance('')); // Initialize voices
  }

  this.setupShortcuts();
  this.setupNotifications();
  // this.loadCharacterManifest(); // Character manifest loaded by client first
}

UI.prototype = {
  setConnection: function (connection) {
    this.connection = connection;
  },

  setStatus: function (status) {
    this.status.innerHTML = status;
  },

  connected: function () {
    this.roomSwitcher.placeholder = window.location.hash;
    this.roomSwitcher.value = window.location.hash;
    this.input.placeholder = 'Your nickname...';
    this.input.disabled = false;
    this.roomSwitcher.disabled = false;
    this.setStatus('Connected.');
  },

  disconnected: function () {
    this.input.disabled = true;
    this.input.placeholder = 'No connection';
    this.roomSwitcher.disabled = true;
    this.setStatus('Disconnected.');
  },

  reconnecting: function () {
    this.setStatus('Reconnecting...');
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

  getVoicesFor: function (voices, lang) {
    var result = [];
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang === lang) {
        result.push(voices[i]);
      }
    }

    return result;
  },

  tts: function (data) {
    if (this.ttsEnabled.checked === true && typeof this.synth !== 'undefined') {
      var utterable = new SpeechSynthesisUtterance(data.text);
      var voices = this.synth.getVoices();
      var hashCode = this.getHashCode(data.author);

      var languageVoices = {
        'ja-JP': this.getVoicesFor(voices, 'ja-JP'),
        'ko-KR': this.getVoicesFor(voices, 'ko-KR'),
        'zh-CN': this.getVoicesFor(voices, 'zh-CN')
      };

      if (data.text.match(/[\u3040-\u309F\u30A0-\u30FF]/g)) {
        utterable.lang = 'ja-JP';
      } else if (data.text.match(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/g)) {
        utterable.lang = 'ko-KR';
      } else if (data.text.match(/[\u4E00-\u9FFF]/g)) {
        utterable.lang = 'zh-CN';
      }

      if (utterable.lang !== '') {
        var langVoices = languageVoices[utterable.lang];
        utterable.voice = langVoices[Math.floor(hashCode) % langVoices.length] || null;
      }

      // Assign random (hashed) voice if not a special language or no voice available for that language
      if (utterable.voice === '' || utterable.voice === null) {
        utterable.voice = voices[Math.floor(hashCode) % voices.length];
      }

      this.synth.speak(utterable);
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
      this.addLine(JSON.parse(history[i]), false);
    }
    window.scrollTo(0, document.body.scrollHeight);
  },

  addLine: function (message, stickBottom) {
    // Make a new box if
    // * We hit maximum number of actors in a box
    // * No boxes
    // * It's a monologue
    var newBox =
      this.currentBoxActors >= this.maxActorsPerBox ||
      this.currentBoxes === 0 ||
      this.previousAuthor === message.author;

    if (newBox === true) {
      this.currentBox = this.makeBox();
      this.content.appendChild(this.currentBox);
      if (typeof stickBottom === 'undefined' || stickBottom === true) {
        window.scrollTo(0, document.body.scrollHeight);
      }
      this.currentBoxActors = 0;
      this.currentBoxes++;
    }

    var flip = this.currentBoxActors >= this.maxActorsPerBox / 2;

    this.currentBox.appendChild(this.makeActor(message, flip));
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
    var avatarImageIndex = this.getHashCode(message.text + ' ' + message.author + ' ' + message.time) % character.images.length;
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
    actor.querySelector('.name').title = (new Date(message.time)).toLocaleString(undefined, { timeZoneName: 'short' });
    actor.querySelector('.avatar').appendChild(avatar);

    return actor.getElementsByTagName('div')[0];
  },

  loadCharacterManifest: function (callback) {
    var request = new XMLHttpRequest();
    request.open('GET', './res/avatars/manifest.json');
    request.send();

    var that = this;
    request.onload = function() {
      that.characters = JSON.parse(this.response);
      if (typeof callback !== 'undefined') {
        callback();
      }
    };
  },

  getHashCode: function (string) {
    var hash = 31;

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
