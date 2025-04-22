const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');

const server = new https.createServer({
  cert: fs.readFileSync('./cert.pem'),
  key: fs.readFileSync('./key.pem')
});
const wss = new WebSocket.Server({ server });
var msg;
console.log(server);
wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('Получено сообщение: %s', message);
  });

  ws.send('Привет от сервера');
});
server.listen(443);

