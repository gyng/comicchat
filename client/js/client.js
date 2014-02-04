(function () {
  'use strict';

  var name      = false;
  var content   = document.getElementById('content');
  var input     = document.getElementById('input');
  var inputForm = document.getElementById('input-form');
  var status    = document.getElementById('status');
  var notify    = document.getElementById('notify');
  var serverAddress = 'ws://hidoi.moebros.org:8084';
  input.value = ''; // Clear on init
  var currentBoxActors = 0;
  var currentBoxes = 0;
  var previousAuthor = null;

  if (typeof (window.WebSocket || window.MozWebSocket) === 'undefined') {
    content.innerHTML = 'Websocket support required.';
    return;
  }

  var notification = (window.Notification || window.webkitNotifications);
  if (typeof notification !== 'undefined' && notification.permission !== 'denied') {
    notification.requestPermission();
  }

  var connection = new WebSocket(serverAddress);

  connection.onopen = function () {
    console.log('Connection established with ' + serverAddress);
    status.innerHTML = 'Connected.';
  };

  connection.onerror = function (e) {
    console.log('Error: ' + e);
    status.innerHTML = 'Disconnected.';
  };

  connection.onmessage = function (message) {
    // TODO JSON validation with try/catch
    var json = JSON.parse(message.data);

    if (json.type === 'history') {
      for (var i = 0; i < json.data.length; i++) {
        addLine(JSON.parse(json.data[i]).data);
      }
    } else if (json.type === 'message') {
      addLine(json.data);

      if (notification.permission === 'granted' && notify.checked === true) {
        var notice = new Notification('comicchat', { body: json.data.author + ": " + json.data.text });
      }
    } else {
      console.log(json);
    }
  };

  // User Interface

  inputForm.onsubmit = function (e) {
    connection.send(input.value);
    input.placeholder = 'Chat...';
    inputForm.reset();
    e.preventDefault();
  };

  function addLine (message) {
    var maxActorsPerBox = 2;

    // Make a new box if
    // * We hit maximum number of actors in a box
    // * No boxes
    // * It's a monologue
    var newBox =
      currentBoxActors >= maxActorsPerBox ||
      currentBoxes === 0 ||
      previousAuthor === message.author;

    if (newBox === true) {
      content.appendChild(makeBox());
      window.scrollTo(0, document.body.scrollHeight);
      currentBoxActors = 0;
      currentBoxes++;
    }

    var boxes = content.querySelectorAll(".box");
    var box = boxes[boxes.length - 1];
    var flip = currentBoxActors >= maxActorsPerBox / 2
    box.appendChild(makeActor(message, flip));
    currentBoxActors++;
    previousAuthor = message.author;
  };

  function makeBox () {
    var boxTemplate = document.getElementById('box-template').innerHTML;
    var box = document.createElement('div');
    box.innerHTML = boxTemplate;

    return box.getElementsByTagName('div')[0];
  }

  function makeActor (message, flip) {
    var actorTemplate = document.getElementById('actor-template').innerHTML;
    var characters = [
      {
        name: 'hugh',
        images: ['angry', 'bored', 'coy', 'happy', 'laugh', 'neutral', 'sad', 'scared', 'shout']
      }, {
        name: 'lance',
        images: ['0']
      }, {
        name: 'jordan',
        images: ['angry', 'bored', 'coy', 'happy', 'laugh', 'neutral', 'sad', 'scared', 'shout']
      }, {
        name: 'kwensa',
        images: ['angry', 'bored', 'coy', 'happy', 'laugh', 'neutral', 'sad', 'scared', 'shout']
      }
    ];

    var character = characters[getHashCode(message.author) % characters.length];
    var avatar = document.createElement('img');
    var avatarImageIndex = getHashCode(message.text + ' ' + message.author + ' ' + currentBoxes) % character.images.length;
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
  }

  // Utility

  function getHashCode (string) {
    var hash = 0;
    if (string.length == 0) return hash;
    for (var i = 0; i < string.length; i++) {
      var char = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
})();