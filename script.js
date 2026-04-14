// 游戏全局配置常量
// 封装所有固定参数，统一管理、避免全局污染与无意义的魔法数字
const GameConfig = {
  MAX_UNDO_PER_PLAYER: 3,
  MIN_BOARD_SIZE: 8,
  MAX_BOARD_SIZE: 19,
  POINT_SIZE: 34,
  BOARD_FRAME_MARGIN: 34 / 2,
  MAX_HISTORY_LENGTH: 20,
  // 上下左右四个方向（围棋通用）
  DIRECTIONS: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  // 五子棋胜利判断的四个方向
  GOBANG_WIN_DIRS: [[0, 1], [1, 0], [1, 1], [1, -1]]
};
// 备忘录模式：游戏状态快照类
// 用于保存/恢复游戏完整状态，使用结构化克隆做深拷贝
class GameMemento {
  constructor(baseState, extendState = {}) {
    // 所有游戏通用的基础状态
    this.board = structuredClone(baseState.board);
    this.currentPlayer = baseState.currentPlayer;
    this.isGameOver = baseState.isGameOver;
    this.size = baseState.size;
    this.blackUndoCount = baseState.blackUndoCount;
    this.whiteUndoCount = baseState.whiteUndoCount;
    // 子类扩展状态（围棋专属：连续虚着次数）
    this.extendState = extendState;
  }
}
// 游戏抽象基类
// 封装五子棋/围棋通用逻辑，通过钩子方法实现多态，彻底解耦子类
class BaseGame {
  constructor(size) {
    this.size = size;
    this.currentPlayer = 'black';
    this.board = Array(size).fill().map(() => Array(size).fill(null));
    this.isGameOver = false;
    this.history = [];
    this.blackUndoCount = 0;
    this.whiteUndoCount = 0;
  }
  // 钩子方法：子类重写，获取专属扩展状态
  getExtendMementoState() {
    return {};
  }
  // 钩子方法：子类重写，恢复专属扩展状态
  restoreExtendState(extendState) {}
  // 钩子方法：子类重写，落子后重置状态
  resetPassCount() {}
  // 保存当前游戏状态到历史记录
  saveState() {
    const baseState = {
      board: this.board,
      currentPlayer: this.currentPlayer,
      isGameOver: this.isGameOver,
      size: this.size,
      blackUndoCount: this.blackUndoCount,
      whiteUndoCount: this.whiteUndoCount
    };
    const memento = new GameMemento(baseState, this.getExtendMementoState());
    this.history.push(memento);
    // 限制历史记录最大长度
    if (this.history.length > GameConfig.MAX_HISTORY_LENGTH) {
      this.history.shift();
    }
  }
  // 悔棋功能：恢复上一步状态
  undoChess() {
    if (this.history.length === 0) {
      alert("无历史可悔棋！");
      return false;
    }
    // 校验悔棋次数上限
    const lastPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
    if (lastPlayer === 'black' && this.blackUndoCount >= GameConfig.MAX_UNDO_PER_PLAYER) {
      alert("黑方悔棋次数已用尽！");
      return false;
    }
    if (lastPlayer === 'white' && this.whiteUndoCount >= GameConfig.MAX_UNDO_PER_PLAYER) {
      alert("白方悔棋次数已用尽！");
      return false;
    }
    // 从备忘录恢复游戏状态
    const memento = this.history.pop();
    this.board = memento.board;
    this.currentPlayer = memento.currentPlayer;
    this.isGameOver = memento.isGameOver;
    this.blackUndoCount = memento.blackUndoCount;
    this.whiteUndoCount = memento.whiteUndoCount;
    this.restoreExtendState(memento.extendState);
    // 累计对应玩家的悔棋次数
    lastPlayer === 'black' ? this.blackUndoCount++ : this.whiteUndoCount++;
    return true;
  }
  // 切换当前落子玩家
  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
  }
  // 校验坐标是否在棋盘范围内
  isValidPosition(row, col) {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }
  // 获取悔棋剩余次数文本
  getUndoCountText() {
    return `黑方剩余悔棋：${GameConfig.MAX_UNDO_PER_PLAYER - this.blackUndoCount}次 | 白方剩余悔棋：${GameConfig.MAX_UNDO_PER_PLAYER - this.whiteUndoCount}次`;
  }
  // 导出游戏数据（用于保存棋谱）
  exportData() {
    return {
      type: this.getGameType(),
      size: this.size,
      board: structuredClone(this.board),
      currentPlayer: this.currentPlayer,
      isGameOver: this.isGameOver,
      blackUndoCount: this.blackUndoCount,
      whiteUndoCount: this.whiteUndoCount,
      ...this.getExtendMementoState()
    };
  }
  // 钩子方法：子类重写，返回游戏类型
  getGameType() {
    return '';
  }
  // 导入游戏数据（用于加载棋谱）
  importData(data) {
    this.size = data.size;
    this.board = data.board;
    this.currentPlayer = data.currentPlayer;
    this.isGameOver = data.isGameOver;
    this.blackUndoCount = data.blackUndoCount;
    this.whiteUndoCount = data.whiteUndoCount;
    this.restoreExtendState(data);
    this.history = [];
  }
}
// 五子棋游戏子类：继承基类，实现五子棋专属逻辑
class GobangGame extends BaseGame {
  getGameType() {
    return 'gobang';
  }
  placeChess(row, col) {
    if (this.isGameOver || this.board[row][col]) return;
    
    this.saveState();
    this.board[row][col] = this.currentPlayer;
    if (this.judgeWin(row, col)) {
      this.isGameOver = true;
      return { success: true, win: true, winner: this.currentPlayer };
    }
    this.switchPlayer();
    return { success: true };
  }
  // 五子棋胜利条件判断：判断是否连成五子
  judgeWin(row, col) {
    const directions = GameConfig.GOBANG_WIN_DIRS;
    const currentColor = this.board[row][col];
    for (const [dx, dy] of directions) {
      let count = 1;
      // 正方向统计同色棋子
      for (let i = 1; i < 5; i++) {
        const r = row + dx * i;
        const c = col + dy * i;
        if (this.isValidPosition(r, c) && this.board[r][c] === currentColor) count++;
        else break;
      }
      // 反方向统计同色棋子
      for (let i = 1; i < 5; i++) {
        const r = row - dx * i;
        const c = col - dy * i;
        if (this.isValidPosition(r, c) && this.board[r][c] === currentColor) count++;
        else break;
      }
      if (count >= 5) return true;
    }
    return false;
  }
}
// 围棋游戏子类：继承基类，实现围棋核心规则 + 胜负计算功能
class GoGame extends BaseGame {
  constructor(size) {
    super(size);
    this.passCount = 0; // 连续虚着次数
  }
  getGameType() {
    return 'go';
  }
  getExtendMementoState() {
    return { passCount: this.passCount };
  }
  restoreExtendState(state) {
    this.passCount = state.passCount || 0;
  }
  resetPassCount() {
    this.passCount = 0;
  }
  /**
   * 获取棋子的棋块与气数
   * 迭代实现，避免递归栈溢出，一次遍历完成计算
   * @returns {group: 棋子数组, liberties: 气数}
   */
  getGroupAndLiberties(row, col) {
    const color = this.board[row][col];
    if (!color) return { group: [], liberties: 0 };
    const group = [];
    const visited = new Set();
    const queue = [[row, col]];
    const key = (r, c) => `${r},${c}`;
    let liberties = 0;
    visited.add(key(row, col));
    const directions = GameConfig.DIRECTIONS;
    while (queue.length) {
      const [r, c] = queue.shift();
      group.push([r, c]);
      // 遍历四个方向，统计气数并查找相连的同色棋子
      for (const [dx, dy] of directions) {
        const nr = r + dx;
        const nc = c + dy;
        if (!this.isValidPosition(nr, nc)) continue;
        const posKey = key(nr, nc);
        // 空位：气数+1
        if (!this.board[nr][nc]) {
          liberties++;
          continue;
        }
        // 同色未访问棋子：加入棋块
        if (this.board[nr][nc] === color && !visited.has(posKey)) {
          visited.add(posKey);
          queue.push([nr, nc]);
        }
      }
    }
    return { group, liberties: liberties };
  }
  /**
   * 提子：移除棋盘上无气的敌方棋子
   * @param {*} skipColor 跳过当前玩家的棋子，为'none'时无差别提死棋
   * @returns 是否执行了提子
   */
  captureStones(skipColor) {
    let hasCapture = false;
    const visited = new Set();
    const key = (r, c) => `${r},${c}`;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const color = this.board[r][c];
        const posKey = key(r, c);
        // 跳过空点、已处理的棋子
        if (!color || visited.has(posKey)) continue;
        // 非终局清理时，跳过己方棋子
        if (skipColor !== 'none' && color === skipColor) continue;

        const { group, liberties } = this.getGroupAndLiberties(r, c);
        // 无气棋子被提走
        if (liberties === 0) {
          group.forEach(([gr, gc]) => {
            this.board[gr][gc] = null;
            visited.add(key(gr, gc));
          });
          hasCapture = true;
        }
      }
    }
    return hasCapture;
  }
  /**
   * 禁着点判断：落子后无气且无法提子，即为禁着点
   * 不修改棋盘，纯计算校验
   */
  isForbiddenPoint(row, col) {
    const color = this.currentPlayer;
    // 临时落子
    this.board[row][col] = color;
    const { liberties } = this.getGroupAndLiberties(row, col);
    const hasCapture = this.captureStones(color);
    // 恢复棋盘
    this.board[row][col] = null;
    // 无气 + 未提子 = 禁着点
    return liberties === 0 && !hasCapture;
  }
  // 围棋落子：实现禁着点、提子、自杀规则
  placeChess(row, col) {
    // 基础校验
    if (this.isGameOver || this.board[row][col]) return;
    // 禁着点校验
    if (this.isForbiddenPoint(row, col)) {
      alert("禁着点，不可落子！");
      return;
    }
    this.saveState();
    this.board[row][col] = this.currentPlayer;
    this.resetPassCount();
    // 提掉对方无气的棋子
    this.captureStones(this.currentPlayer);
    // 自杀判断：落子后自身无气，禁止落子
    const { liberties } = this.getGroupAndLiberties(row, col);
    if (liberties === 0) {
      this.board[row][col] = null;
      this.history.pop();
      alert("禁止自杀！");
      return;
    }
    this.switchPlayer();
    return { success: true };
  }
  // 虚着：放弃当前回合落子
  passChess() {
    this.saveState();
    this.passCount++;
    // 双方连续虚着 → 游戏结束，计算胜负
    if (this.passCount >= 2) {
      this.isGameOver = true;
      // 自动计算并展示围棋胜负
      this.showResult();
    }
    this.switchPlayer();
  }
  // ====================== 修复后：围棋胜负计算 ======================
  /**
   * 中国数子法：统计黑棋/白棋的总子数（活棋 + 围住的空）
   * 修复：终局先剔除死棋，再统计子数
   */
  countStones() {
    // 关键修复：终局无差别剔除所有无气死棋
    this.captureStones('none');

    let black = 0;
    let white = 0;
    const visited = new Set();
    const key = (r, c) => `${r},${c}`;

    // 统计单方围住的空点
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (visited.has(key(r, c)) || this.board[r][c] !== null) continue;

        const queue = [[r, c]];
        const area = [];
        let hasBlack = false;
        let hasWhite = false;
        visited.add(key(r, c));

        while (queue.length) {
          const [x, y] = queue.shift();
          area.push([x, y]);

          for (const [dx, dy] of GameConfig.DIRECTIONS) {
            const nx = x + dx;
            const ny = y + dy;
            if (!this.isValidPosition(nx, ny)) continue;
            const k = key(nx, ny);

            if (this.board[nx][ny] === 'black') hasBlack = true;
            else if (this.board[nx][ny] === 'white') hasWhite = true;
            else if (!visited.has(k)) {
              visited.add(k);
              queue.push([nx, ny]);
            }
          }
        }
        // 仅单方围住的空计入对应方
        if (hasBlack && !hasWhite) black += area.length;
        if (hasWhite && !hasBlack) white += area.length;
      }
    }

    // 统计活棋数量
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 'black') black++;
        if (this.board[r][c] === 'white') white++;
      }
    }

    return { black, white };
  }
  /**
   * 计算围棋最终胜负（标准中国数子法）
   */
  calculateResult() {
    const { black, white } = this.countStones();
    const total = this.size * this.size;
    // 贴子规则：19路贴3.75子，其他贴2.75子
    const komi = this.size === 19 ? 3.75 : 2.75;
    const base = total / 2;
    const blackTarget = base + komi;

    if (black > blackTarget) {
      const win = (black - blackTarget).toFixed(1);
      return { winner: 'black', winStones: win, black, white };
    } else {
      const win = (blackTarget - black).toFixed(1);
      return { winner: 'white', winStones: win, black, white };
    }
  }
  /**
   * 弹窗展示围棋胜负结果
   */
  showResult() {
    const res = this.calculateResult();
    const winnerText = res.winner === 'black' ? '黑方' : '白方';
    alert(
      `★ 围棋终局 ★\n` +
      `黑棋总子：${res.black} 子\n` +
      `白棋总子：${res.white} 子\n` +
      `------------------------\n` +
      `${winnerText} 胜，胜 ${res.winStones} 子！`
    );
  }
  // ====================== 修复完成 ======================
  /**
   * 认输时调用：快速判定胜负
   */
  showResignResult(loser) {
    const winner = loser === 'black' ? '白方' : '黑方';
    alert(`游戏结束！\n${loser === 'black' ? '黑方' : '白方'}投子认负\n${winner} 获胜！`);
  }
}
// UI管理器：封装界面渲染、事件绑定、公共操作
class UIManager {
  constructor() {
    this.selectedSize = 15;
    this.currentGame = null;
    this.init();
  }
  init() {
    this.renderSizeButtons();
    this.bindEvents();
  }
  // 渲染棋盘尺寸选择按钮
  renderSizeButtons() {
    const container = document.getElementById('sizeBtns');
    for (let size = GameConfig.MIN_BOARD_SIZE; size <= GameConfig.MAX_BOARD_SIZE; size++) {
      const button = document.createElement('button');
      button.textContent = size;
      if (size === this.selectedSize) button.classList.add('active');
      
      button.onclick = () => {
        document.querySelectorAll('.size-btns button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.selectedSize = size;
      };
      container.appendChild(button);
    }
  }
  /**
   * 统一渲染棋盘：兼容五子棋、围棋
   */
  renderBoard(container, game) {
    container.innerHTML = '';
    const size = game.size;
    const contentSize = (size - 1) * GameConfig.POINT_SIZE;
    const totalSize = contentSize + 2 * GameConfig.BOARD_FRAME_MARGIN;
    
    container.style.width = container.style.height = `${totalSize}px`;
    // 渲染棋盘网格
    const bgStyles = this.generateBoardBackground(size, contentSize);
    container.style.backgroundImage = bgStyles.images.join(',');
    container.style.backgroundSize = bgStyles.sizes.join(',');
    container.style.backgroundPosition = bgStyles.positions.join(',');
    // 渲染棋子
    this.renderPieces(container, game);
    // 更新界面状态
    this.updateGameUI(game);
  }
  // 生成棋盘网格背景样式
  generateBoardBackground(size, contentSize) {
    const images = [], sizes = [], positions = [];
    const margin = GameConfig.BOARD_FRAME_MARGIN;
    const pointSize = GameConfig.POINT_SIZE;
    for (let i = 0; i < size; i++) {
      const offset = margin + i * pointSize;
      // 竖线
      images.push(`linear-gradient(#5a3921 ${contentSize}px,transparent 0)`);
      sizes.push(`1px ${contentSize}px`);
      positions.push(`${offset}px ${margin}px`);
      // 横线
      images.push(`linear-gradient(90deg,#5a3921 ${contentSize}px,transparent 0)`);
      sizes.push(`${contentSize}px 1px`);
      positions.push(`${margin}px ${offset}px`);
    }
    return { images, sizes, positions };
  }
  // 渲染棋盘上的所有棋子
  renderPieces(container, game) {
    const size = game.size;
    const margin = GameConfig.BOARD_FRAME_MARGIN;
    const pointSize = GameConfig.POINT_SIZE;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const point = document.createElement('div');
        point.className = 'cross-point';
        point.style.left = `${col * pointSize + margin}px`;
        point.style.top = `${row * pointSize + margin}px`;
        // 渲染黑白棋子
        const pieceColor = game.board[row][col];
        if (pieceColor) {
          const piece = document.createElement('div');
          piece.className = `piece ${pieceColor}`;
          point.appendChild(piece);
        }
        // 绑定落子点击事件
        point.onclick = () => {
          const result = game.placeChess(row, col);
          this.renderBoard(container, game);
          // 胜利提示
          if (result?.win) {
            setTimeout(() => alert(`${result.winner === 'black' ? '黑方' : '白方'}获胜！`), 100);
          }
        };
        container.appendChild(point);
      }
    }
  }
  // 更新游戏界面：当前回合、悔棋次数
  updateGameUI(game) {
    const isGo = game instanceof GoGame;
    const turnEl = document.getElementById(isGo ? 'goTurn' : 'gobangTurn');
    const undoEl = document.getElementById(isGo ? 'goUndoCount' : 'gobangUndoCount');
    // 回合信息
    const playerText = game.currentPlayer === 'black' ? '黑方' : '白方';
    const playerClass = game.currentPlayer === 'black' ? 'turn-black' : 'turn-white';
    turnEl.innerHTML = `当前回合：<span class="${playerClass}">${playerText}</span> 落子`;
    // 悔棋次数
    undoEl.textContent = game.getUndoCountText();
  }
  // 保存游戏棋谱到本地文件
  saveGame(isGobang) {
    if (!this.currentGame) return;
    const data = this.currentGame.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${isGobang ? '五子棋' : '围棋'}_棋谱_${new Date().getTime()}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    alert("棋谱保存成功！");
  }
  // 从本地文件加载游戏棋谱
  loadGame(file, isGobang) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const typeMatch = isGobang ? (data.type === 'gobang') : (data.type === 'go');
        if (!typeMatch) {
          alert(`请选择${isGobang ? '五子棋' : '围棋'}棋谱！`);
          return;
        }
        this.currentGame = isGobang ? new GobangGame(data.size) : new GoGame(data.size);
        this.currentGame.importData(data);
        this.renderBoard(document.getElementById(isGobang ? 'gobangBoard' : 'goBoard'), this.currentGame);
        alert("棋谱读取成功！");
      } catch (err) {
        alert("棋谱文件格式错误！");
      }
    };
    reader.readAsText(file);
  }
  // 返回游戏主页
  backToHome() {
    document.getElementById('mainPage').classList.remove('hide');
    document.querySelectorAll('.game-page').forEach(page => page.classList.remove('show'));
    this.currentGame = null;
  }
  // 绑定所有界面交互事件
  bindEvents() {
    // 进入五子棋游戏
    document.getElementById('toGobang').onclick = () => {
      this.currentGame = new GobangGame(this.selectedSize);
      document.getElementById('mainPage').classList.add('hide');
      document.getElementById('gobangPage').classList.add('show');
      this.renderBoard(document.getElementById('gobangBoard'), this.currentGame);
    };
    // 进入围棋游戏
    document.getElementById('toGo').onclick = () => {
      this.currentGame = new GoGame(this.selectedSize);
      document.getElementById('mainPage').classList.add('hide');
      document.getElementById('goPage').classList.add('show');
      this.renderBoard(document.getElementById('goBoard'), this.currentGame);
    };
    // 返回主页按钮
    document.getElementById('back1').onclick = () => this.backToHome();
    document.getElementById('back2').onclick = () => this.backToHome();
    // 悔棋按钮
    document.getElementById('undo1').onclick = () => {
      if (this.currentGame.undoChess()) {
        this.renderBoard(document.getElementById('gobangBoard'), this.currentGame);
      }
    };
    document.getElementById('undo2').onclick = () => {
      if (this.currentGame.undoChess()) {
        this.renderBoard(document.getElementById('goBoard'), this.currentGame);
      }
    };
    // 围棋虚着按钮
    document.getElementById('pass2').onclick = () => {
      if (this.currentGame instanceof GoGame) {
        this.currentGame.passChess();
        this.renderBoard(document.getElementById('goBoard'), this.currentGame);
      }
    };
    // 重新开始游戏
    document.getElementById('restart1').onclick = () => {
      if (confirm('确定重新开始？')) {
        this.currentGame = new GobangGame(this.selectedSize);
        this.renderBoard(document.getElementById('gobangBoard'), this.currentGame);
      }
    };
    document.getElementById('restart2').onclick = () => {
      if (confirm('确定重新开始？')) {
        this.currentGame = new GoGame(this.selectedSize);
        this.renderBoard(document.getElementById('goBoard'), this.currentGame);
      }
    };
    // 投子认负
    document.getElementById('resign1').onclick = () => {
      if (confirm('确定认输？')) {
        alert(`${this.currentGame.currentPlayer === 'black' ? '白方' : '黑方'}获胜！`);
        this.currentGame.isGameOver = true;
      }
    };
    // 围棋认输时调用胜负提示
    document.getElementById('resign2').onclick = () => {
      if (confirm('确定认输？')) {
        this.currentGame.isGameOver = true;
        this.currentGame.showResignResult(this.currentGame.currentPlayer);
      }
    };
    // 保存/加载棋谱
    document.getElementById('saveToFile1').onclick = () => this.saveGame(true);
    document.getElementById('saveToFile2').onclick = () => this.saveGame(false);
    
    const loadInput1 = document.getElementById('loadFromFileInput1');
    const loadInput2 = document.getElementById('loadFromFileInput2');
    
    document.getElementById('loadFromFile1').onclick = () => loadInput1.click();
    document.getElementById('loadFromFile2').onclick = () => loadInput2.click();
    
    loadInput1.onchange = (e) => {
      e.target.files[0] && this.loadGame(e.target.files[0], true);
      e.target.value = '';
    };
    loadInput2.onchange = (e) => {
      e.target.files[0] && this.loadGame(e.target.files[0], false);
      e.target.value = '';
    };
    // 显示/隐藏提示
    document.getElementById('tipsToggleBtn').onclick = (e) => {
      const tips = document.getElementById('tipsContent');
      tips.classList.toggle('hide');
      e.target.textContent = tips.classList.contains('hide') ? '显示' : '隐藏';
    };
  }
}
// 页面加载完成后初始化UI管理器
window.onload = () => new UIManager();