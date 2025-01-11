const WebSocket = require('ws');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const serverUrl = 'ws://localhost:8080';
const ws = new WebSocket(serverUrl);

// Handle connection
ws.on('open', () => {
    console.log('Connected to the server.');
});

// Handle incoming messages
ws.on('message', (message) => {
    console.log(message.toString()); // Convert the Buffer to a string
});

// Handle input and send to server
rl.on('line', (line) => {
    ws.send(line);
});

// Handle disconnection
ws.on('close', () => {
    console.log('Disconnected from the server.');
    rl.close();
});
