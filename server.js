const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = {};

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    socket.on('joinRoom', (room) => {
        console.log(`Игрок ${socket.id} пытается присоединиться к комнате ${room}`);
        socket.join(room);
        if (!rooms[room]) {
            rooms[room] = { board: null, solution: null, difficulty: 'easy', players: [] };
            console.log(`Создана новая комната ${room}`);
        } else {
            console.log(`Комната ${room} уже существует`);
        }
        socket.emit('roomJoined', room);
        if (rooms[room].board) {
            socket.emit('syncState', rooms[room]);
            console.log(`Отправлено текущее состояние комнаты ${room} игроку ${socket.id}`);
        }
    });

    socket.on('syncState', (data) => {
        console.log(`Получено syncState от ${socket.id} для комнаты ${data.room}:`, data);
        if (!rooms[data.room]) {
            rooms[data.room] = { board: null, solution: null, difficulty: 'easy', players: [] };
        }
        rooms[data.room] = {
            board: data.board,
            solution: data.solution,
            difficulty: data.difficulty,
            players: rooms[data.room].players.includes(data.nickname) ? rooms[data.room].players : [...rooms[data.room].players, data.nickname]
        };
        io.to(data.room).emit('syncState', rooms[data.room]);
        console.log(`Отправлено syncState всем в комнате ${data.room}`);
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился:', socket.id);
        for (let room in rooms) {
            const index = rooms[room].players.indexOf(socket.nickname);
            if (index !== -1) {
                rooms[room].players.splice(index, 1);
                io.to(room).emit('syncState', rooms[room]);
                if (rooms[room].players.length === 0) {
                    delete rooms[room];
                    console.log(`Комната ${room} удалена`);
                }
                break;
            }
        }
    });

    socket.on('setNickname', (nick) => {
        socket.nickname = nick;
    });
});

server.listen(3000, () => {
    console.log('Сервер запущен на порту 3000');
});