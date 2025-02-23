const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const rooms = {};

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

io.on("connection", (socket) => {
    console.log("Игрок подключился:", socket.id);

    socket.on("createRoom", (data) => {
        const room = data.room;
        rooms[room] = {
            board: null,
            solution: null,
            difficulty: "easy",
            players: [data.nickname],
            moveHistory: [],
            owner: socket.id,
        };
        socket.join(room);
        socket.emit("roomCreated", room);
        console.log(`Создана комната ${room} владельцем ${data.nickname}`);
    });

    socket.on("requestJoin", (data) => {
        const room = data.room;
        if (rooms[room]) {
            const ownerSocket = io.sockets.sockets.get(rooms[room].owner);
            if (ownerSocket) {
                ownerSocket.emit("joinRequest", { nickname: data.nickname });
                socket.joinRequestRoom = room;
            } else {
                socket.emit("joinRejected");
            }
        } else {
            socket.emit("joinRejected");
        }
    });

    socket.on("acceptJoin", (data) => {
        const room = data.room;
        if (rooms[room] && rooms[room].owner === socket.id) {
            rooms[room].players.push(data.nickname);
            const requesterSocket = Array.from(
                io.sockets.sockets.values(),
            ).find((s) => s.joinRequestRoom === room);
            if (requesterSocket) {
                requesterSocket.join(room);
                requesterSocket.joinRequestRoom = null;
                requesterSocket.emit("joinAccepted", {
                    room: room,
                    board: rooms[room].board,
                    solution: rooms[room].solution,
                    difficulty: rooms[room].difficulty,
                    moveHistory: rooms[room].moveHistory,
                    players: rooms[room].players,
                });
                io.to(room).emit("syncState", rooms[room]);
                console.log(`${data.nickname} присоединён к комнате ${room}`);
            }
        }
    });

    socket.on("rejectJoin", (data) => {
        const room = data.room;
        if (rooms[room] && rooms[room].owner === socket.id) {
            const requesterSocket = Array.from(
                io.sockets.sockets.values(),
            ).find((s) => s.joinRequestRoom === room);
            if (requesterSocket) {
                requesterSocket.emit("joinRejected");
                requesterSocket.joinRequestRoom = null;
                console.log(
                    `Запрос ${data.nickname} на присоединение к комнате ${room} отклонён`,
                );
            }
        }
    });

    socket.on("deleteRoom", (data) => {
        const room = data.room;
        if (rooms[room] && rooms[room].owner === socket.id) {
            io.to(room).emit("roomClosed");
            delete rooms[room];
            console.log(`Комната ${room} удалена владельцем`);
        }
    });

    socket.on("leaveRoom", (data) => {
        const room = data.room;
        if (rooms[room] && rooms[room].players.includes(data.nickname)) {
            const index = rooms[room].players.indexOf(data.nickname);
            rooms[room].players.splice(index, 1);
            socket.leave(room);
            io.to(room).emit("syncState", rooms[room]);
            console.log(`${data.nickname} покинул комнату ${room}`);
        }
    });

    socket.on("syncState", (data) => {
        console.log(
            `Получено syncState от ${socket.id} для комнаты ${data.room}:`,
            data,
        );
        if (!rooms[data.room]) {
            rooms[data.room] = {
                board: null,
                solution: null,
                difficulty: "easy",
                players: [],
                moveHistory: [],
                owner: data.owner ? socket.id : null,
            };
        }
        socket.nickname = data.nickname;
        if (!rooms[data.room].players.includes(data.nickname)) {
            rooms[data.room].players.push(data.nickname);
        }
        rooms[data.room] = {
            board: data.board,
            solution: data.solution,
            difficulty: data.difficulty,
            players: rooms[data.room].players,
            moveHistory: data.moveHistory || [],
            owner: rooms[data.room].owner || (data.owner ? socket.id : null),
        };
        io.to(data.room).emit("syncState", rooms[data.room]);
        console.log(`Отправлено syncState всем в комнате ${data.room}`);
    });

    socket.on("remoteClick", (data) => {
        io.to(data.room).emit("remoteClick", data);
    });

    socket.on("disconnect", () => {
        console.log("Игрок отключился:", socket.id);
        for (let room in rooms) {
            const index = rooms[room].players.indexOf(socket.nickname);
            if (index !== -1) {
                rooms[room].players.splice(index, 1);
                if (rooms[room].owner === socket.id) {
                    io.to(room).emit("roomClosed");
                    delete rooms[room];
                    console.log(
                        `Комната ${room} закрыта, так как владелец отключился`,
                    );
                } else {
                    io.to(room).emit("syncState", rooms[room]);
                    console.log(
                        `Игрок ${socket.nickname} отключился от комнаты ${room}`,
                    );
                }
                break;
            }
        }
    });
});

server.listen(3000, () => {
    console.log("Сервер запущен на порту 3000");
});
