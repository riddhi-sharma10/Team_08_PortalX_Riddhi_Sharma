// server/sse.js
import EventEmitter from 'events';

export const eventEmitter = new EventEmitter();
const clients = new Map(); // Map of userId -> Set of Response objects

export const addClient = (userId, res) => {
    if (!clients.has(userId)) {
        clients.set(userId, new Set());
    }
    clients.get(userId).add(res);

    // Remove client on close
    res.on('close', () => {
        clients.get(userId).delete(res);
        if (clients.get(userId).size === 0) {
            clients.delete(userId);
        }
    });
};

export const notifyUser = (userId, type, payload) => {
    const userClients = clients.get(userId) || clients.get(String(userId));
    if (userClients) {
        userClients.forEach(res => {
            res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
        });
    }
};

export const broadcast = (type, payload) => {
    clients.forEach(userClients => {
        userClients.forEach(res => {
            res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
        });
    });
};
