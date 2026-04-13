// ================= 设计模式：单例模式（游戏管理器） =================
// 全局游戏管理器，确保仅存在一个实例，统一管理游戏状态、棋盘渲染等
class GameManager {
  static instance = null; // 单例实例

  // 获取单例（懒加载）
  static getInstance() {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  constructor() {
    // 初始化DOM元素
    this.dom = {
      gobangBtn: document.getElementById('btn-gobang'),
      goBtn: document.getElementById('btn-go'),
      restartBtn: document.getElementById('btn-restart'),
      undoBtn: document.getElementById('btn-undo'),
      passBtn: document.getElementById('btn-pass'),
      resignBtn: document.getElementById('btn-resign'),
      saveBtn: document.getElementById('btn-save'),
      loadBtn: document.getElementById('btn-load'),
      board: document.getElementById('chessboard')
    };
    this.currentGame = null; // 当前游戏实例
    this.gameType = null;    // 游戏类型：gobang/go
    this.boardSize = 15;     // 默认棋盘大小
    this.cellPool = new Map(); // 设计模式：享元模式 - 单元格DOM池，复用减少创建开销

    // 绑定事件（封装到管理器内部）
    this.bindEvents();
    // 初始化空棋盘
    this.renderBoard();
  }

  // ================= 设计模式：抽象工厂模式（游戏实例创建） =================
  // 根据类型创建对应游戏实例，封装对象创建逻辑
  createGame(type, size) {
    switch (type) {
      case 'gobang':
        return new GobangGame(size);
      case 'go':
        return new GoGame(size);
      default:
        throw new Error('不支持的游戏类型');
    }
  }

  // 初始化游戏（对外暴露的初始化入口）
  initGame(type) {
    this.gameType = type;
    this.currentGame = this.createGame(type, this.boardSize);
    this.dom.passBtn.disabled = type === 'gobang'; // 五子棋禁用虚着
    this.renderBoard();
  }

  // ================= 设计模式：享元模式（复用棋盘单元格） =================
  // 获取/复用单元格DOM元素
  getCellElement(r, c) {
    const key = `${r}-${c}`;
    // 池中有则复用，无则创建新元素
    if (this.cellPool.has(key)) {
      const cell = this.cellPool.get(key);
      cell.innerHTML = ''; // 清空棋子
      return cell;
    }

    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.r = r;
    cell.dataset.c = c;
    // 绑定落子事件（封装到管理器）
    cell.onclick = () => this.handleCellClick(r, c);
    this.cellPool.set(key, cell); // 存入池备用
    return cell;
  }

  // 落子事件处理（统一逻辑）
  handleCellClick(r, c) {
    if (!this.currentGame || this.currentGame.isOver) return;
    const success = this.currentGame.place(r, c);
    if (success) this.renderBoard();
  }

  // 渲染棋盘（核心渲染逻辑封装）
  renderBoard() {
    this.dom.board.innerHTML = '';
    if (!this.currentGame) return;

    const size = this.currentGame.size;
    this.dom.board.style.gridTemplateColumns = `repeat(${size}, 30px)`;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = this.getCellElement(r, c); // 享元模式：复用/创建单元格
        // 渲染棋子
        if (this.currentGame.board[r][c]) {
          const piece = document.createElement('div');
          piece.className = `piece ${this.currentGame.board[r][c]}`;
          cell.appendChild(piece);
        }
        this.dom.board.appendChild(cell);
      }
    }
  }

  // 绑定全局控制事件
  bindEvents() {
    // 选择游戏类型
    this.dom.gobangBtn.onclick = () => this.initGame('gobang');
    this.dom.goBtn.onclick = () => this.initGame('go');

    // 重新开始
    this.dom.restartBtn.onclick = () => {
      if (this.gameType) this.initGame(this.gameType);
    };

    // 悔棋（备忘录模式）
    this.dom.undoBtn.onclick = () => {
      if (!this.currentGame) return;
      const success = this.currentGame.undo();
      if (success) this.renderBoard();
    };

    // 虚着
    this.dom.passBtn.onclick = () => {
      if (!this.currentGame) return;
      this.currentGame.pass();
      this.renderBoard();
    };

    // 投子认负
    this.dom.resignBtn.onclick = () => {
      if (!this.currentGame) return;
      this.currentGame.isOver = true;
      alert(`${this.currentGame.currentPlayer === 'black' ? '黑方' : '白方'} 投子认负`);
    };

    // 保存局面（备忘录模式：持久化状态）
    this.dom.saveBtn.onclick = () => {
      if (!this.currentGame) return;
      localStorage.setItem('chess_save', JSON.stringify({
        type: this.gameType,
        size: this.currentGame.size,
        board: this.currentGame.board,
        currentPlayer: this.currentGame.currentPlayer,
        isOver: this.currentGame.isOver
      }));
      alert('保存成功');
    };

    // 读取局面（备忘录模式：恢复状态）
    this.dom.loadBtn.onclick = () => {
      const data = localStorage.getItem('chess_save');
      if (!data) { alert('无保存记录'); return; }
      const obj = JSON.parse(data);
      this.gameType = obj.type;
      this.boardSize = obj.size;
      this.currentGame = this.createGame(obj.type, obj.size);
      // 恢复状态
      Object.assign(this.currentGame, {
        board: obj.board,
        currentPlayer: obj.currentPlayer,
        isOver: obj.isOver
      });
      this.dom.passBtn.disabled = obj.type === 'gobang';
      this.renderBoard();
      alert('读取成功');
    };
  }
}

// ================= 设计模式：备忘录模式（游戏状态保存/恢复） =================
// 备忘录类：封装游戏状态，仅暴露必要的状态数据，保护原游戏对象的封装性
class GameMemento {
  constructor(board, currentPlayer, isOver, size) {
    // 深拷贝确保状态隔离，避免引用污染
    this.board = JSON.parse(JSON.stringify(board));
    this.currentPlayer = currentPlayer;
    this.isOver = isOver;
    this.size = size;
  }

  // 获取状态（只读，避免外部修改）
  getState() {
    return {
      board: JSON.parse(JSON.stringify(this.board)),
      currentPlayer: this.currentPlayer,
      isOver: this.isOver,
      size: this.size
    };
  }
}

// ================= 设计模式：模板方法模式（游戏基类） =================
// 抽象游戏基类：定义游戏的核心流程（模板方法），子类实现具体逻辑
class BaseGame {
  constructor(size) {
    this.size = size;
    this.currentPlayer = 'black'; // 黑方先行
    this.board = Array(size).fill().map(() => Array(size).fill(null)); // 棋盘二维数组
    this.isOver = false; // 游戏是否结束
    this.history = []; // 备忘录列表（悔棋/存档用）
  }

  // 模板方法：保存状态（固定流程，子类无需重写）
  saveState() {
    const memento = new GameMemento(this.board, this.currentPlayer, this.isOver, this.size);
    this.history.push(memento);
  }

  // 模板方法：恢复状态（固定流程，子类无需重写）
  undo() {
    if (this.history.length === 0) return false;
    const memento = this.history.pop();
    const state = memento.getState();
    this.board = state.board;
    this.currentPlayer = state.currentPlayer;
    this.isOver = state.isOver;
    this.size = state.size;
    return true;
  }

  // 模板方法：切换玩家（固定流程）
  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
  }

  // 模板方法：校验坐标合法性（固定逻辑）
  isValid(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  // 抽象方法：落子（子类必须实现）
  place(r, c) { throw new Error('子类必须实现place方法'); }

  // 抽象方法：虚着（子类按需实现）
  pass() { throw new Error('子类必须实现pass方法'); }

  // 抽象方法：胜负判断（子类按需实现）
  checkWin(r, c) { throw new Error('子类必须实现checkWin方法'); }
}

// ================= 五子棋子类（实现模板方法） =================
class GobangGame extends BaseGame {
  // 实现落子逻辑
  place(r, c) {
    // 校验：游戏结束/坐标非法/已有棋子 → 落子失败
    if (this.isOver || !this.isValid(r, c) || this.board[r][c]) return false;
    
    // 保存当前状态（模板方法）
    this.saveState();
    // 落子
    this.board[r][c] = this.currentPlayer;

    // 胜负判断
    if (this.checkWin(r, c)) {
      alert(`${this.currentPlayer === 'black' ? '黑方' : '白方'} 获胜！`);
      this.isOver = true;
      return true;
    }

    // 平局判断：棋盘已满
    if (this.board.flat().every(cell => cell !== null)) {
      alert('平局！');
      this.isOver = true;
      return true;
    }

    // 切换玩家（模板方法）
    this.switchPlayer();
    return true;
  }

  // 实现胜负判断逻辑
  checkWin(r, c) {
    // 四个方向：横、竖、正斜、反斜
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    const color = this.board[r][c];

    // 遍历每个方向，统计连续同色棋子数
    for (const [dx, dy] of dirs) {
      let count = 1; // 当前落子算1个

      // 正向遍历（如右、下、右下、右上）
      for (let i = 1; i < 5; i++) {
        const nr = r + dx * i, nc = c + dy * i;
        if (!this.isValid(nr, nc) || this.board[nr][nc] !== color) break;
        count++;
      }

      // 反向遍历（如左、上、左上、左下）
      for (let i = 1; i < 5; i++) {
        const nr = r - dx * i, nc = c - dy * i;
        if (!this.isValid(nr, nc) || this.board[nr][nc] !== color) break;
        count++;
      }

      // 五子连珠 → 胜利
      if (count >= 5) return true;
    }
    return false;
  }

  // 实现虚着逻辑（五子棋不支持）
  pass() {
    alert('五子棋不支持虚着');
  }
}

// ================= 围棋子类（实现模板方法） =================
class GoGame extends BaseGame {
  constructor(size) {
    super(size);
    this.passCount = 0; // 虚着计数（连续两次虚着则结束）
  }

  // 辅助方法：获取棋子所属的棋组（连通的同色棋子）
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

      // 上下左右遍历邻接棋子
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (this.isValid(nx, ny) && !visited.has(`${nx},${ny}`) && this.board[nx][ny] === color) {
          stack.push([nx, ny]);
        }
      });
    }
    return group;
  }

  // 辅助方法：计算棋组的气数
  getLiberty(r, c) {
    const group = this.getGroup(r, c);
    const libertySet = new Set(); // 存储气的坐标（去重）

    // 遍历棋组每个棋子，检查邻接空点
    group.forEach(([x, y]) => {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (this.isValid(nx, ny) && !this.board[nx][ny]) {
          libertySet.add(`${nx},${ny}`);
        }
      });
    });

    return libertySet.size; // 气数 = 空点数量
  }

  // 辅助方法：移除无气的敌方棋子
  removeDead() {
    const enemyColor = this.currentPlayer === 'black' ? 'white' : 'black';
    const visited = new Set();

    // 遍历整个棋盘
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        // 找到未遍历的敌方棋子
        if (this.board[r][c] === enemyColor && !visited.has(`${r},${c}`)) {
          const group = this.getGroup(r, c, visited);
          // 无气则提子
          if (this.getLiberty(r, c) === 0) {
            group.forEach(([x, y]) => this.board[x][y] = null);
          }
        }
      }
    }
  }

  // 实现落子逻辑
  place(r, c) {
    if (this.isOver || !this.isValid(r, c) || this.board[r][c]) return false;
    
    // 保存状态（模板方法）
    this.saveState();
    // 落子
    this.board[r][c] = this.currentPlayer;
    // 移除无气的敌方棋子
    this.removeDead();

    // 校验禁着点：落子后自身无气 → 悔棋+提示
    if (this.getLiberty(r, c) === 0) {
      this.undo(); // 恢复状态（模板方法）
      alert('禁着点，不能落子');
      return false;
    }

    this.passCount = 0; // 重置虚着计数
    this.switchPlayer(); // 切换玩家（模板方法）
    return true;
  }

  // 实现虚着逻辑
  pass() {
    if (this.isOver) return;
    
    this.passCount++;
    // 连续两次虚着 → 计算胜负
    if (this.passCount >= 2) {
      // 统计黑方棋子数
      const blackCount = this.board.flat().filter(cell => cell === 'black').length;
      const totalCells = this.size * this.size;
      const whiteWinThreshold = totalCells / 2 + 3.75; // 白方贴目3.75子

      // 胜负判断
      if (blackCount > whiteWinThreshold) {
        alert(`黑方胜 ${(blackCount - whiteWinThreshold).toFixed(2)}子`);
      } else {
        alert(`白方胜 ${(whiteWinThreshold - blackCount).toFixed(2)}子`);
      }
      this.isOver = true;
    } else {
      this.switchPlayer(); // 切换玩家（模板方法）
    }
  }

  // 围棋无需checkWin（通过气数/虚着判断结束）
  checkWin() { return false; }
}

// 初始化游戏管理器（单例）
window.onload = () => {
  GameManager.getInstance();
};