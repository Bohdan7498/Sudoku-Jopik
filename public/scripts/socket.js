const socket = io(
  "https://b865064e-eca8-42cf-8d0a-bbf95871d59a-00-19fhe0f1s9kk8.spock.replit.dev",
);

socket.on("connect", () => {
  console.log("Подключено к серверу");
  nicknameInput.value = nickname;
  generateSudoku();
});

socket.on("connect_error", (err) => {
  console.error("Ошибка подключения:", err.message);
  messageDiv.textContent = "Не удалось подключиться к серверу";
});

socket.on("roomJoined", (room) => {
  roomId = room;
  roomDiv.textContent = `Комната: ${roomId}`;
  console.log(`Успешно присоединился к комнате ${room}`);
});

socket.on("syncState", (data) => {
  console.log("Получено syncState:", data);
  board = data.board;
  solution = data.solution;
  difficultySelect.value = data.difficulty;
  moveHistory = data.moveHistory || [];
  displayBoard();
  updateNumberPanel();
  messageDiv.textContent = "";
  updatePlayersList(data.players || []);
});

socket.on("remoteClick", (data) => {
  if (data.room === roomId && data.index !== selectedCell) {
    const cells = document.querySelectorAll(".cell");
    cells[data.index].classList.add("remote-click");
    setTimeout(() => cells[data.index].classList.remove("remote-click"), 1000);
  }
});
