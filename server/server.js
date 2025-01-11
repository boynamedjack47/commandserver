const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

const clients = new Map(); // Store clients and their IDs
const logFilePath = path.join(__dirname, 'chat.log');

// Append messages to chaat.log
const logMessage = (message) => {
    fs.appendFileSync(logFilePath, message + '\n');
};

server.on('connection', (ws) => {
    const clientId = `Client${clients.size + 1}`;
    clients.set(ws, clientId);

    // Send welcome message to new client
    ws.send(`Welcome, ${clientId}!`);
    logMessage(`[CONNECTED] ${clientId} connected.`);
    console.log(`[CONNECTED] ${clientId} connected.`);

    // Notify others
    for (let [client, id] of clients) {
        if (client !== ws) client.send(`${clientId} has joined the chat.`);
    }

    // Handle incoming messages
    ws.on('message', (message) => {
        const senderId = clients.get(ws);
        const fullMessage = `${senderId}: ${message}`;
        logMessage(fullMessage);
        console.log(fullMessage);

        // Broadcast to other clients
        for (let [client, id] of clients) {
            if (client !== ws) client.send(fullMessage);
        }
    });

    // Handle disconnections
    ws.on('close', () => {
        const senderId = clients.get(ws);
        clients.delete(ws);

        logMessage(`[DISCONNECTED] ${senderId} disconnected.`);
        console.log(`[DISCONNECTED] ${senderId} disconnected.`);

        for (let [client, id] of clients) {
            client.send(`${senderId} has left the chat.`);
        }
    });
});

console.log(`Chat server running on ws://localhost:${PORT}`);
