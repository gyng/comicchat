(function () {
  'use strict';

  var serverAddress = 'ws://home.sugoi.pw:8084';

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

  function makeConnection (ws) {
    ws.onopen = function () {
      console.log('Connection to ' + serverAddress + ' established');
      ui.connected();

      if (retryHandlerID !== null) {
        clearInterval(retryHandlerID);
        retryHandlerID = null;
      }

      // Join default room
      if (window.location.hash === '') {
        window.location.hash = '#!';
      }

      ws.send(JSON.stringify({
        type: 'join',
        room: window.location.hash
      }));

      ws.send(JSON.stringify({
        type: 'history',
        room: window.location.hash
      }));
    };

    ws.onerror = function (e) {
      console.log('Connection error', e);
      ui.disconnected();
    };

    ws.onclose = function (e) {
      console.log('Connection closed', e);
      ui.disconnected();

      // Reconnect
      if (retryHandlerID === null) {
        retryHandlerID = setInterval(function () {
          console.log('Attempting reconnect...');
          ui.reconnecting();
          var connection = makeConnection(new WebSocket(serverAddress));
          ui.setConnection(connection);
        }, 10000);
      }
    };

    ws.onmessage = function (message) {
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

    return ws;
  }

  var retryHandlerID = null;
  ui.loadCharacterManifest(function () {
    // HACK: ideally it shouldn't matter if characters aren't loaded yet
    //       The UI should rerender when it loads characters.
    var connection = makeConnection(new WebSocket(serverAddress));
    ui.setConnection(connection);
  });
})();
