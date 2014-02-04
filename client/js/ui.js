function UI (elements) {
  this.content       = elements.content;
  this.input         = elements.input;
  this.inputForm     = elements.inputForm;
  this.status        = elements.status;
  this.notifyEnabled = elements.notifyEnabled;

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
  },

  requestNotificationsPermission: function () {
    if (typeof this.notification !== 'undefined' && this.notification.permission === 'default') {
      this.notification.requestPermission();
    }
  },

  notify: function (data) {
    if (this.notification.permission === 'granted' && this.notifyEnabled.checked === true) {
      new Notification('comicchat', {
        lang: 'en-US',
        icon: './res/icon.gif',
        body: data.author + ": " + data.text
      });
    }
  },

  setupShortcuts: function () {
    this.inputForm.onsubmit = function (e) {
      e.preventDefault();
      this.connection.send(input.value);
      this.input.placeholder = 'Chat...';
      this.inputForm.reset();
    }.bind(this);
  },

  addHistory: function (history) {
    for (var i = 0; i < history.length; i++) {
      this.addLine(JSON.parse(history[i]).data);
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