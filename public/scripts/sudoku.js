function generateSudoku() {
  const difficulty = difficultySelect.value;
  board = generateBoard();
  solution = JSON.parse(JSON.stringify(board));
  solve(solution);
  removeCells(difficulty);
  moveHistory = [];
  displayBoard();
  updateNumberPanel();
  messageDiv.textContent = "";
  if (roomId) {
    console.log("Отправка syncState с новой игрой");
    socket.emit("syncState", {
      room: roomId,
      board,
      solution,
      difficulty,
      nickname,
      moveHistory,
    });
  }
}

function generateBoard() {
  let board = Array(9)
    .fill()
    .map(() => Array(9).fill(0));
  fillBoard(board);
  return board;
}

function fillBoard(board) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === 0) {
        let numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (let num of numbers) {
          if (isSafe(board, i, j, num)) {
            board[i][j] = num;
            if (fillBoard(board)) return true;
            board[i][j] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function solve(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            if (solve(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function isSafe(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num || board[x][col] === num) return false;
  }
  let startRow = row - (row % 3),
    startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }
  return true;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function removeCells(difficulty) {
  let cellsToRemove = {
    "very-easy": 30,
    easy: 40,
    medium: 50,
    hard: 60,
    expert: 70,
  }[difficulty];
  while (cellsToRemove > 0) {
    let row = Math.floor(Math.random() * 9);
    let col = Math.floor(Math.random() * 9);
    if (board[row][col] !== 0) {
      board[row][col] = 0;
      cellsToRemove--;
    }
  }
}

function displayBoard() {
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    cell.textContent = board[row][col] === 0 ? "" : board[row][col];
    cell.classList.toggle(
      "initial",
      board[row][col] !== 0 && solution[row][col] === board[row][col],
    );
    cell.classList.remove("highlight", "match", "remote-click");
    if (index === selectedCell) {
      cell.classList.add("selected");
    }
  });
}
