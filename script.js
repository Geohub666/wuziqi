// ================= 全局常量 =================
const elGobang = document.getElementById('btn-gobang');
const elGo = document.getElementById('btn-go');
const elRestart = document.getElementById('btn-restart');
const elUndo = document.getElementById('btn-undo');
const elPass = document.getElementById('btn-pass');
const elResign = document.getElementById('btn-resign');
const elSave = document.getElementById('btn-save');
const elLoad = document.getElementById('btn-load');
const elBoard = document.getElementById('chessboard');

let currentGame = null;
let gameType = null; // 'gobang'/'go'
let boardSize = 15;  // 默认 15x15

// ================= 备忘录模式（悔棋/存档） =================
class Memento {
  constructor(board, currentPlayer, isOver, size) {
    this.board = JSON.parse(JSON.stringify(board));
    this.currentPlayer = currentPlayer;
    this.isOver = isOver;
    this.size = size;
  }
}

// ================= 抽象基类 =================
class BaseGame {
  constructor(size) {
    this.size = size;
    this.currentPlayer = 'black';
    this.board = Array(size).fill().map(() => Array(size).fill(null));
    this.isOver = false;
    this.history = [];
  }

  saveState() {
    this.history.push(new Memento(this.board, this.currentPlayer, this.isOver, this.size));
  }

  undo() {
    if (this.history.length === 0) return false;
    const m = this.history.pop();
    this.board = m.board;
    this.currentPlayer = m.currentPlayer;
    this.isOver = m.isOver;
    this.size = m.size;
    return true;
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
  }

  isValid(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  // 抽象方法
  place(r, c) { return false; }
  pass() {}
  checkWin(r, c) { return false; }
}

// ================= 五子棋 =================
class GobangGame extends BaseGame {
  place(r, c) {
    if (this.isOver || !this.isValid(r, c) || this.board[r][c]) return false;
    this.saveState();
    this.board[r][c] = this.currentPlayer;

    if (this.checkWin(r, c)) {
      alert(`${this.currentPlayer === 'black' ? '黑方' : '白方'} 获胜！`);
      this.isOver = true;
      return true;
    }
    if (this.board.flat().every(x => x !== null)) {
      alert('平局！');
      this.isOver = true;
      return true;
    }
    this.switchPlayer();
    return true;
  }

  checkWin(r, c) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    const color = this.board[r][c];
    for (const [dx, dy] of dirs) {
      let count = 1;
      for (let i = 1; i < 5; i++) {
        const nr = r + dx*i, nc = c + dy*i;
        if (!this.isValid(nr, nc) || this.board[nr][nc] !== color) break;
        count++;
      }
      for (let i = 1; i < 5; i++) {
        const nr = r - dx*i, nc = c - dy*i;
        if (!this.isValid(nr, nc) || this.board[nr][nc] !== color) break;
        count++;
      }
      if (count >= 5) return true;
    }
    return false;
  }

  pass() {
    alert('五子棋不支持虚着');
  }
}

// ================= 围棋 =================
class GoGame extends BaseGame {
  constructor(size) {
    super(size);
    this.passCount = 0;
  }

  getGroup(r, c, visited = new Set()) {
    const color = this.board[r][c];
    const group = [];
    const stack = [[r, c]];
    while (stack.length) {
      const [x, y] = stack.pop();
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      group.push([x, y]);
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dx, dy]) => {
        const nx = x+dx, ny = y+dy;
        if (this.isValid(nx, ny) && !visited.has(`${nx},${ny}`) && this.board[nx][ny] === color) {
          stack.push([nx, ny]);
        }
      });
    }
    return group;
  }

  getLiberty(r, c) {
    const group = this.getGroup(r, c);
    const lib = new Set();
    group.forEach(([x, y]) => {
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dx, dy]) => {
        const nx = x+dx, ny = y+dy;
        if (this.isValid(nx, ny) && !this.board[nx][ny]) lib.add(`${nx},${ny}`);
      });
    });
    return lib.size;
  }

  removeDead() {
    const enemy = this.currentPlayer === 'black' ? 'white' : 'black';
    const visited = new Set();
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === enemy && !visited.has(`${r},${c}`)) {
          const group = this.getGroup(r, c, visited);
          if (this.getLiberty(r, c) === 0) {
            group.forEach(([x, y]) => this.board[x][y] = null);
          }
        }
      }
    }
  }

  place(r, c) {
    if (this.isOver || !this.isValid(r, c) || this.board[r][c]) return false;
    this.saveState();
    this.board[r][c] = this.currentPlayer;
    this.removeDead();

    if (this.getLiberty(r, c) === 0) {
      this.undo();
      alert('禁着点，不能落子');
      return false;
    }
    this.passCount = 0;
    this.switchPlayer();
    return true;
  }

  pass() {
    if (this.isOver) return;
    this.passCount++;
    if (this.passCount >= 2) {
      let black = 0;
      this.board.flat().forEach(x => x === 'black' && black++);
      const total = this.size * this.size;
      const need = total / 2 + 3.75;
      alert(black > need ? `黑方胜 ${(black-need).toFixed(2)}子` : `白方胜 ${(need-black).toFixed(2)}子`);
      this.isOver = true;
    } else {
      this.switchPlayer();
    }
  }
}

// ================= 渲染棋盘 =================
function renderBoard() {
  elBoard.innerHTML = '';
  if (!currentGame) return;

  const size = currentGame.size;
  elBoard.style.gridTemplateColumns = `repeat(${size}, 30px)`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      // 点击落子
      cell.onclick = () => {
        if (!currentGame || currentGame.isOver) return;
        const ok = currentGame.place(r, c);
        if (ok) renderBoard();
      };

      // 渲染棋子
      if (currentGame.board[r][c]) {
        const piece = document.createElement('div');
        piece.className = `piece ${currentGame.board[r][c]}`;
        cell.appendChild(piece);
      }
      elBoard.appendChild(cell);
    }
  }
}

// ================= 初始化游戏 =================
function initGame(type) {
  gameType = type;
  currentGame = type === 'gobang' ? new GobangGame(boardSize) : new GoGame(boardSize);
  elPass.disabled = type === 'gobang';
  renderBoard();
}

// ================= 绑定点击事件 =================
elGobang.onclick = () => initGame('gobang');
elGo.onclick = () => initGame('go');

elRestart.onclick = () => {
  if (gameType) initGame(gameType);
};

elUndo.onclick = () => {
  if (!currentGame) return;
  const ok = currentGame.undo();
  if (ok) renderBoard();
};

elPass.onclick = () => {
  if (!currentGame) return;
  currentGame.pass();
  renderBoard();
};

elResign.onclick = () => {
  if (!currentGame) return;
  currentGame.isOver = true;
  alert(`${currentGame.currentPlayer === 'black' ? '黑方' : '白方'} 投子认负`);
};

elSave.onclick = () => {
  if (!currentGame) return;
  localStorage.setItem('chess_save', JSON.stringify({
    type: gameType,
    size: currentGame.size,
    board: currentGame.board,
    currentPlayer: currentGame.currentPlayer,
    isOver: currentGame.isOver
  }));
  alert('保存成功');
};

elLoad.onclick = () => {
  const data = localStorage.getItem('chess_save');
  if (!data) { alert('无保存记录'); return; }
  const obj = JSON.parse(data);
  const Cls = obj.type === 'gobang' ? GobangGame : GoGame;
  currentGame = Object.assign(new Cls(obj.size), obj);
  gameType = obj.type;
  boardSize = obj.size;
  elPass.disabled = obj.type === 'gobang';
  renderBoard();
  alert('读取成功');
};

// 首次渲染（空棋盘）
renderBoard();