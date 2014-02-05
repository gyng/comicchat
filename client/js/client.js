(function () {
  'use strict';

  var serverAddress = 'ws://hidoi.moebros.org:8084';

  var ui = new UI({
    content:          document.getElementById('content'),
    input:            document.getElementById('input'),
    inputForm:        document.getElementById('input-form'),
    status:           document.getElementById('status'),
    notifyEnabled:    document.getElementById('notify'),
    ttsEnabled:       document.getElementById('tts'),
    roomSwitcher:     document.getElementById('room-switcher'),
    roomSwitcherForm: document.getElementById('room-switcher-form')
  });

  if (typeof (window.WebSocket || window.MozWebSocket) === 'undefined') {
    document.getElementByTag('body').innerHTML = 'Websocket support required.';
    return;
  }

  var connection = new WebSocket(serverAddress);
  ui.setConnection(connection);

  document.getElementById('room-switcher').placeholder = window.location.hash;
  document.getElementById('room-switcher').value = window.location.hash;

  connection.onopen = function () {
    console.log('Connection to ' + serverAddress + ' established');
    ui.setStatus('Connected.');

    // Join default room
    if (window.location.hash === '') {
      window.location.hash = '#!';
    }

    connection.send(JSON.stringify({
      type: 'join',
      room: window.location.hash
    }));

    connection.send(JSON.stringify({
      type: 'history',
      room: window.location.hash
    }));

    setInterval(function () {
      if (connection.readyState !== 1) {
        ui.disconnected();
      }
    }, 3000);
  };

  connection.onerror = function (e) {
    console.log('Connection error', e);
    ui.disconnected();
  };

  connection.onmessage = function (message) {
    var obj;

    try {
      obj = JSON.parse(message.data);
    } catch (e) {
      console.log('Invalid message', e);
      return;
    }

    switch (obj.type) {
    case 'history':
      ui.addHistory(obj.history);
      break;
    case 'message':
      ui.addLine(obj);
      ui.tts(obj);
      ui.notify(obj);
      break;
    default:
      console.log('Unknown message', obj);
      break;
    }
  };
})();