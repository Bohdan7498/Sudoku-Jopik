const grid = document.getElementById("sudoku-grid");
const numbersPanel = document.getElementById("numbers");
const difficultySelect = document.getElementById("difficulty");
const playersList = document.getElementById("players");
const nicknameInput = document.getElementById("nickname");
const messageDiv = document.getElementById("message");
const roomDiv = document.getElementById("room");
const joinModal = document.getElementById("join-modal");
const waitingModal = document.getElementById("waiting-modal");
const confirmModal = document.getElementById("confirm-modal");
const deleteRoomModal = document.getElementById("delete-room-modal");
const leaveRoomModal = document.getElementById("leave-room-modal");
const newGameModal = document.getElementById("new-game-modal");
const roomInput = document.getElementById("room-input");
const joinRequestText = document.getElementById("join-request-text");
const deleteRoomBtn = document.getElementById("delete-room-btn");
const leaveRoomBtn = document.getElementById("leave-room-btn");
const newGameBtn = document.getElementById("new-game-btn");

let board = [];
let solution = [];
let roomId = null;
let selectedCell = null;
let nickname =
  localStorage.getItem("nickname") ||
  "Игрок" + Math.floor(Math.random() * 1000);
let moveHistory = [];
let isRoomOwner = false;

document
  .getElementById("new-game-btn")
  .addEventListener("click", showNewGameModal);
document
  .getElementById("create-room-btn")
  .addEventListener("click", createRoom);
document
  .getElementById("join-room-btn")
  .addEventListener("click", showJoinModal);
document.getElementById("undo-btn").addEventListener("click", undoMove);
document
  .getElementById("delete-room-btn")
  .addEventListener("click", showDeleteRoomModal);
document
  .getElementById("leave-room-btn")
  .addEventListener("click", showLeaveRoomModal);
nicknameInput.addEventListener("change", setNickname);
difficultySelect.addEventListener("change", syncDifficulty);
document
  .getElementById("modal-join-btn")
  .addEventListener("click", requestJoinRoom);
document
  .getElementById("modal-cancel-btn")
  .addEventListener("click", closeJoinModal);
document
  .getElementById("confirm-accept-btn")
  .addEventListener("click", acceptJoinRequest);
document
  .getElementById("confirm-reject-btn")
  .addEventListener("click", rejectJoinRequest);
document
  .getElementById("delete-confirm-btn")
  .addEventListener("click", deleteRoom);
document
  .getElementById("delete-cancel-btn")
  .addEventListener("click", closeDeleteRoomModal);
document
  .getElementById("leave-confirm-btn")
  .addEventListener("click", leaveRoom);
document
  .getElementById("leave-cancel-btn")
  .addEventListener("click", closeLeaveRoomModal);
document
  .getElementById("new-game-confirm-btn")
  .addEventListener("click", confirmNewGame);
document
  .getElementById("new-game-cancel-btn")
  .addEventListener("click", closeNewGameModal);

function createGrid() {
  grid.innerHTML = "";
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.addEventListener("click", () => selectCell(i));
    grid.appendChild(cell);
  }
  document.addEventListener("keydown", handleKeyPress);
}

function createNumberPanel() {
  numbersPanel.innerHTML = "";
  for (let i = 0; i <= 9; i++) {
    const btn = document.createElement("div");
    btn.classList.add("number-btn");
    btn.textContent = i === 0 ? "✕" : i;
    btn.addEventListener("click", () => inputNumber(i));
    numbersPanel.appendChild(btn);
  }
  updateNumberPanel();
}

function selectCell(index) {
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) =>
    cell.classList.remove("selected", "highlight", "match"),
  );
  const row = Math.floor(index / 9);
  const col = index % 9;
  const value = board[row][col];

  selectedCell = index;
  cells[index].classList.add("selected");

  if (value !== 0) {
    for (let i = 0; i < 9; i++) {
      cells[row * 9 + i].classList.add("highlight");
      cells[i * 9 + col].classList.add("highlight");
    }
    cells.forEach((cell, idx) => {
      const r = Math.floor(idx / 9);
      const c = idx % 9;
      if (board[r][c] === value) {
        cell.classList.add("match");
      }
    });
  }
  if (roomId) {
    socket.emit("remoteClick", { room: roomId, index });
  }
}

function inputNumber(value) {
  if (selectedCell === null) return;
  const row = Math.floor(selectedCell / 9);
  const col = selectedCell % 9;
  const oldValue = board[row][col];
  const correctValue = solution[row][col];

  if (oldValue === correctValue && value === 0) {
    return;
  }

  if (oldValue !== value) {
    board[row][col] = value;
    moveHistory.push({ row, col, oldValue, newValue: value });
    displayBoard();
    updateNumberPanel();
    checkWin();
    if (roomId) {
      socket.emit("syncState", {
        room: roomId,
        board,
        solution,
        difficulty: difficultySelect.value,
        nickname,
        moveHistory,
        owner: isRoomOwner,
      });
    }
  }
  document.querySelectorAll(".cell")[selectedCell].classList.remove("selected");
  selectedCell = null;
}

function undoMove() {
  if (moveHistory.length === 0) return;
  const lastMove = moveHistory.pop();
  board[lastMove.row][lastMove.col] = lastMove.oldValue;
  displayBoard();
  updateNumberPanel();
  if (roomId) {
    socket.emit("syncState", {
      room: roomId,
      board,
      solution,
      difficulty: difficultySelect.value,
      nickname,
      moveHistory,
      owner: isRoomOwner,
    });
  }
}

function handleKeyPress(event) {
  if (selectedCell === null) return;
  const key = event.key;
  if (event.ctrlKey && key === "z") {
    undoMove();
    return;
  }
  let value = parseInt(key);
  if (key === "Backspace" || key === "Delete" || key === "x" || key === "X")
    value = 0;
  if (!isNaN(value) && value >= 0 && value <= 9) {
    inputNumber(value);
  }
}

function updateNumberPanel() {
  if (!board || !board.length) return;
  const count = Array(10).fill(9);
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] !== 0) count[board[i][j]]--;
    }
  }
  document.querySelectorAll(".number-btn").forEach((btn, index) => {
    btn.style.opacity = count[index] === 0 && index !== 0 ? "0.3" : "1";
  });
}

function checkWin() {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] !== solution[i][j]) return;
    }
  }
  messageDiv.textContent = "Поздравляем! Вы победили!";
  messageDiv.classList.add("active");
}

function showNewGameModal() {
  newGameModal.style.display = "flex";
}

function closeNewGameModal() {
  newGameModal.style.display = "none";
}

function confirmNewGame() {
  generateSudoku();
  newGameBtn.classList.add("confirming");
  const timer = document.createElement("div");
  timer.classList.add("timer");
  newGameBtn.appendChild(timer);
  setTimeout(() => {
    newGameBtn.classList.remove("confirming");
    timer.remove();
  }, 3000);
  closeNewGameModal();
}

function syncDifficulty() {
  if (roomId) {
    console.log("Отправка syncState с новой сложностью");
    socket.emit("syncState", {
      room: roomId,
      board,
      solution,
      difficulty: difficultySelect.value,
      nickname,
      moveHistory,
      owner: isRoomOwner,
    });
  }
}

function createRoom() {
  roomId = Math.random().toString(36).substr(2, 5);
  isRoomOwner = true;
  socket.emit("createRoom", { room: roomId, nickname });
  roomDiv.textContent = `Комната: ${roomId}`;
  roomDiv.classList.add("active");
  deleteRoomBtn.style.display = "inline-block";
  leaveRoomBtn.style.display = "none";
  document.getElementById("create-room-btn").style.display = "none";
  console.log(`Создана комната ${roomId}`);
}

function showJoinModal() {
  joinModal.style.display = "flex";
  roomInput.value = "";
}

function requestJoinRoom() {
  const room = roomInput.value.trim();
  if (room) {
    roomId = room;
    socket.emit("requestJoin", { room: roomId, nickname });
    closeJoinModal();
    waitingModal.style.display = "flex";
    console.log(`Запрос на присоединение к комнате ${roomId}`);
  }
}

function closeJoinModal() {
  joinModal.style.display = "none";
}

function showDeleteRoomModal() {
  deleteRoomModal.style.display = "flex";
}

function closeDeleteRoomModal() {
  deleteRoomModal.style.display = "none";
}

function deleteRoom() {
  if (isRoomOwner && roomId) {
    socket.emit("deleteRoom", { room: roomId });
    resetRoomState();
    closeDeleteRoomModal();
    console.log(`Комната ${roomId} удалена`);
  }
}

function showLeaveRoomModal() {
  leaveRoomModal.style.display = "flex";
}

function closeLeaveRoomModal() {
  leaveRoomModal.style.display = "none";
}

function leaveRoom() {
  if (!isRoomOwner && roomId) {
    socket.emit("leaveRoom", { room: roomId, nickname });
    resetRoomState();
    closeLeaveRoomModal();
    console.log(`Покинута комната ${roomId}`);
  }
}

function resetRoomState() {
  roomId = null;
  isRoomOwner = false;
  deleteRoomBtn.style.display = "none";
  leaveRoomBtn.style.display = "none";
  document.getElementById("create-room-btn").style.display = "inline-block";
  roomDiv.textContent = "";
  roomDiv.classList.remove("active");
  playersList.textContent = "";
  playersList.classList.remove("active");
}

function acceptJoinRequest() {
  const requesterNickname = joinRequestText.dataset.requester;
  socket.emit("acceptJoin", { room: roomId, nickname: requesterNickname });
  confirmModal.style.display = "none";
}

function rejectJoinRequest() {
  const requesterNickname = joinRequestText.dataset.requester;
  socket.emit("rejectJoin", { room: roomId, nickname: requesterNickname });
  confirmModal.style.display = "none";
}

function setNickname() {
  nickname = nicknameInput.value || "Игрок" + Math.floor(Math.random() * 1000);
  localStorage.setItem("nickname", nickname);
  if (roomId) {
    socket.emit("syncState", {
      room: roomId,
      board,
      solution,
      difficulty: difficultySelect.value,
      nickname,
      moveHistory,
      owner: isRoomOwner,
    });
  }
}

socket.on("roomCreated", (room) => {
  roomId = room;
  isRoomOwner = true;
  roomDiv.textContent = `Комната: ${roomId}`;
  roomDiv.classList.add("active");
  deleteRoomBtn.style.display = "inline-block";
  leaveRoomBtn.style.display = "none";
  document.getElementById("create-room-btn").style.display = "none";
  console.log(`Успешно создана комната ${roomId}`);
});

socket.on("joinRequest", (data) => {
  if (isRoomOwner) {
    joinRequestText.textContent = `Пользователь "${data.nickname}" хочет присоединиться к вашей комнате.`;
    joinRequestText.dataset.requester = data.nickname;
    confirmModal.style.display = "flex";
  }
});

socket.on("joinAccepted", (data) => {
  waitingModal.style.display = "none";
  roomId = data.room;
  board = data.board;
  solution = data.solution;
  moveHistory = data.moveHistory || [];
  difficultySelect.value = data.difficulty;
  roomDiv.textContent = `Комната: ${roomId}`;
  roomDiv.classList.add("active");
  deleteRoomBtn.style.display = "none";
  leaveRoomBtn.style.display = "inline-block";
  document.getElementById("create-room-btn").style.display = "none";
  displayBoard();
  updateNumberPanel();
  updatePlayersList(data.players);
  console.log(`Присоединился к комнате ${roomId}`);
});

socket.on("joinRejected", () => {
  waitingModal.style.display = "none";
  messageDiv.textContent = "Владелец комнаты отклонил ваш запрос.";
  messageDiv.classList.add("active");
  resetRoomState();
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
  messageDiv.classList.remove("active");
  if (data.players && data.players.length > 0) {
    updatePlayersList(data.players);
    playersList.classList.add("active");
  } else {
    playersList.textContent = "";
    playersList.classList.remove("active");
  }
});

socket.on("remoteClick", (data) => {
  if (data.room === roomId && data.index !== selectedCell) {
    const cells = document.querySelectorAll(".cell");
    cells[data.index].classList.add("remote-click");
    setTimeout(() => cells[data.index].classList.remove("remote-click"), 1000);
  }
});

socket.on("roomClosed", () => {
  messageDiv.textContent = "Комната была закрыта владельцем.";
  messageDiv.classList.add("active");
  resetRoomState();
});

function updatePlayersList(players) {
  if (!Array.isArray(players)) {
    playersList.textContent = "Игроки: нет данных";
    playersList.classList.add("active");
    return;
  }
  playersList.textContent = `Игроки: ${players.join(", ") || "нет игроков"}`;
}

createGrid();
createNumberPanel();
