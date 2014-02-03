(function () {
  'use strict';

  var name    = false;
  var content = document.getElementById('content');
  var input   = document.getElementById('input');
  var status  = document.getElementById('status');
  var serverAddress = 'ws://127.0.0.1:8084';

  if (typeof (window.WebSocket || window.MozWebSocket) === 'undefined') {
    content.innerHTML = 'Websocket support required.';
    return;
  }

  // Clear on init
  input.value = '';

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

  input.addEventListener('keypress', function (e) {
    if (e.keyCode === 13) {
      connection.send(input.value);
      input.placeholder = '';
      input.value = '';
      e.preventDefault();
    }
  });

  function addLine (message) {
    var characters = [
      { name: 'hugh', images: 1 },
      { name: 'lance', images: 1 }
    ];
    var template = document.getElementById('box-template').innerHTML;

    var character = characters[message.author.length % characters.length];

    var avatar = document.createElement('img');
    avatar.src = './avatars/' + character.name + '/' + character.name + '' + Math.floor(Math.random(character.images)) + '.gif';

    var box = document.createElement('div');
    box.innerHTML = template;
    box.querySelector('.text').innerHTML = message.text;
    box.querySelector('.avatar0').innerHTML = message.author + '<br>';
    box.querySelector('.avatar0').appendChild(avatar);

    //content.innerHTML = content.innerHTML + '<br>' + message.author + ': ' + message.text;

    content.appendChild(box.getElementsByTagName('div')[0]);
    content.scrollTop = content.scrollHeight;
  };
})();