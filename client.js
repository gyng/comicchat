(function () {
  'use strict';

  var name      = false;
  var content   = document.getElementById('content');
  var input     = document.getElementById('input');
  var inputForm = document.getElementById('input-form');
  var status    = document.getElementById('status');
  var serverAddress = 'ws://hidoi.moebros.org:8084';

  if (typeof (window.WebSocket || window.MozWebSocket) === 'undefined') {
    content.innerHTML = 'Websocket support required.';
    return;
  }

  // Clear on init
  input.value = '';
  var currentBoxActors = 0;
  var currentBoxes = 0;
  var previousAuthor = null;

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
    } else {
      console.log(json);
    }
  };

  inputForm.onsubmit = function (e) {
    connection.send(input.value);
    input.placeholder = 'Chat...';
    inputForm.reset();
    e.preventDefault();
  };

  function addLine (message) {
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
    var boxTemplate   = document.getElementById('box-template').innerHTML;
    var actorTemplate = document.getElementById('actor-template').innerHTML;
    var actorsPerBox = 2;

    var character = characters[message.author.length % characters.length];
    var avatar = document.createElement('img');
    var avatarImageIndex = getHashCode(message.text + ' ' + message.author + ' ' + currentBoxes) % character.images.length;
    avatar.src = './avatars/' + character.name + '/' + character.images[avatarImageIndex] + '.png';

    var actor = document.createElement('div');
    actor.innerHTML = actorTemplate;
    actor.querySelector('.text').appendChild(document.createTextNode(message.text));
    actor.querySelector('.name').appendChild(document.createTextNode(message.author));
    actor.querySelector('.avatar').appendChild(avatar);
    actor = actor.getElementsByTagName('div')[0];

    if (currentBoxActors >= actorsPerBox || currentBoxes === 0 || previousAuthor === message.author) {
      // Filled box or no boxes
      box = document.createElement('div');
      box.innerHTML = boxTemplate;
      content.appendChild(box.getElementsByTagName('div')[0]);
      window.scrollTo(0, document.body.scrollHeight);
      currentBoxActors = 0;
      currentBoxes++;
    }

    // Make characters face each other
    if (currentBoxActors > 0) {
      if (avatar.classList) {
        avatar.classList.add('flip-horizontal');
      } else {
        avatar.className += ' flip-horizontal';
      }
    }

    var boxes = content.querySelectorAll(".box");
    var box = boxes[boxes.length - 1];
    box.appendChild(actor);
    currentBoxActors++;
    previousAuthor = message.author;
  };

  function getHashCode (string) {
    var hash = 0;
    if (string.length == 0) return hash;
    for (var i = 0; i < string.length; i++) {
      var char = string.charCodeAt(i);
      hash = ((hash<<5)-hash)+char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
})();