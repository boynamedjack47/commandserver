const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

const clients = new Map(); // Store clients and their IDs
const logFilePath = path.join(__dirname, 'chat.log');

// Append messages to chat.log
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

// Command Functions
const handleCommand = (ws, message, sender) => {
    const [command, ...args] = message.split(' ');

    switch (command) {
        case '/w':
            whisper(ws, args, sender);
            break;
        case '/username':
            changeUsername(ws, args, sender);
            break;
        case '/kick':
            kickClient(ws, args, sender);
            break;
        case '/clientlist':
            listClients(ws);
            break;
        default:
            ws.send(`Unknown command: ${command}`);
    }
};

// /w - Whisper to another client
const whisper = (ws, args, sender) => {
    if (args.length < 2) {
        ws.send('Error: /w command requires a username and a message.');
        return;
    }

    const recipientName = args[0];
    const message = args.slice(1).join(' ');

    const recipient = [...clients].find(([client, data]) => data.username === recipientName);

    if (!recipient) {
        ws.send(`Error: User ${recipientName} not found.`);
        return;
    }

    if (recipient[0] === ws) {
        ws.send('Error: You cannot whisper to yourself.');
        return;
    }

    recipient[0].send(`Whisper from ${sender}: ${message}`);
    logMessage(`[WHISPER] ${sender} whispered to ${recipientName}: ${message}`);
};

console.log(`Chat server running on ws://localhost:${PORT}`);
