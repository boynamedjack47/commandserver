const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

const clients = new Map(); // Store clients and their IDs
const logFilePath = path.join(__dirname, 'server.log');
const adminPassword = 'kickem'; // Admin password for kicking users

// Append messages to server.log
const logMessage = (message) => {
    fs.appendFileSync(logFilePath, message + '\n');
};

server.on('connection', (ws) => {
    const clientId = `Guest${clients.size + 1}`;
    clients.set(ws, { id: clientId, username: clientId });

    // Send welcome message to new client
    ws.send(`Welcome, ${clientId}!`);
    logMessage(`[CONNECTED] ${clientId} connected.`);
    console.log(`[CONNECTED] ${clientId} connected.`);

    // Notify others
    for (let [client, data] of clients) {
        if (client !== ws) client.send(`${clientId} has joined the chat.`);
    }

    // Handle incoming messages
    ws.on('message', (message) => {
        const sender = clients.get(ws).username;
        
        // Ensure the message is a string
        const messageStr = message.toString();
    
        // Handle command messages
        if (messageStr.startsWith('/')) {
            handleCommand(ws, messageStr, sender);
        } else {
            // Broadcast the message to all other clients
            const fullMessage = `${sender}: ${messageStr}`;
            logMessage(fullMessage);
            console.log(fullMessage);
    
            for (let [client, data] of clients) {
                if (client !== ws) client.send(fullMessage);
            }
        }
    });
    

    // Handle disconnections
    ws.on('close', () => {
        const sender = clients.get(ws).username;
        clients.delete(ws);

        logMessage(`[DISCONNECTED] ${sender} disconnected.`);
        console.log(`[DISCONNECTED] ${sender} disconnected.`);

        for (let [client, data] of clients) {
            client.send(`${sender} has left the chat.`);
        }
    });
});

// Command handling functions
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

// /username - Change username
const changeUsername = (ws, args, sender) => {
    if (args.length !== 1) {
        ws.send('Error: /username command requires exactly one argument.');
        return;
    }

    const newUsername = args[0];

    if (newUsername === sender) {
        ws.send('Error: Your username is already the same.');
        return;
    }

    if ([...clients].some(([client, data]) => data.username === newUsername)) {
        ws.send(`Error: The username ${newUsername} is already taken.`);
        return;
    }

    clients.get(ws).username = newUsername;
    logMessage(`[USERNAME CHANGE] ${sender} changed their username to ${newUsername}`);

    // Notify the user and others
    ws.send(`Your username has been changed to ${newUsername}`);
    for (let [client, data] of clients) {
        if (client !== ws) {
            client.send(`${sender} has changed their username to ${newUsername}`);
        }
    }
};

// /kick - Kick a client
const kickClient = (ws, args, sender) => {
    if (args.length !== 2) {
        ws.send('Error: /kick command requires a username and the admin password.');
        return;
    }

    const [username, password] = args;

    if (password !== adminPassword) {
        ws.send('Error: Incorrect admin password.');
        return;
    }

    if (username === sender) {
        ws.send('Error: You cannot kick yourself.');
        return;
    }

    const clientToKick = [...clients].find(([client, data]) => data.username === username);

    if (!clientToKick) {
        ws.send(`Error: User ${username} not found.`);
        return;
    }

    clientToKick[0].send(`You have been kicked from the chat by ${sender}`);
    logMessage(`[KICKED] ${username} was kicked by ${sender}`);

    // Remove the client from the server
    clientToKick[0].close();
    clients.delete(clientToKick[0]);

    // Notify others
    for (let [client, data] of clients) {
        client.send(`${username} has been kicked from the chat.`);
    }
};

// /clientlist - List all connected clients
const listClients = (ws) => {
    const clientNames = [...clients].map(([client, data]) => data.username).join(', ');
    ws.send(`Connected clients: ${clientNames}`);
};

console.log(`Chat server running on ws://localhost:${PORT}`);
