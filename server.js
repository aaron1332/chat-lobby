const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const SECRET = 'rahasia_jwt_123';

app.use(express.json());
app.use(express.static('public'));

// Endpoint login → dapat token JWT
app.post('/login', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username wajib diisi' });

    const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Middleware autentikasi Socket.io
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token tidak ada'));

    try {
        const decoded = jwt.verify(token, SECRET);
        socket.username = decoded.username;
        next();
    } catch (err) {
        next(new Error('Token tidak valid'));
    }
});

// Event Socket.io
io.on('connection', (socket) => {
    console.log(`${socket.username} terhubung`);

    // Beritahu semua user ada yang join
    io.emit('lobby-message', {
        user: 'System',
        text: `${socket.username} masuk ke lobby`
    });

    // Terima pesan dari client
    socket.on('send-message', (text) => {
        io.emit('lobby-message', {
            user: socket.username,
            text: text
        });
    });

    // User disconnect
    socket.on('disconnect', () => {
        io.emit('lobby-message', {
            user: 'System',
            text: `${socket.username} keluar dari lobby`
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));