// ==================== 1. 全局常量与DOM元素获取 ====================
const chessboard = document.getElementById('chessboard'); // 棋盘容器
const statusText = document.getElementById('status');     // 状态提示文本
const restartBtn = document.getElementById('restart');   // 重新开始按钮
const BOARD_SIZE = 15; // 五子棋标准棋盘：15x15

// ==================== 2. 游戏状态管理（封装核心数据） ====================
let currentPlayer = 'black'; // 当前玩家：黑棋先行
let gameBoard = [];         // 二维数组存储棋盘状态
let isGameOver = false;     // 游戏结束标志（锁定落子）

// ==================== 3. 初始化游戏（核心入口） ====================
initGame();

/**
 * 初始化游戏：重置所有状态，生成棋盘格子
 */
function initGame() {
    // 重置状态
    currentPlayer = 'black';
    isGameOver = false;
    gameBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
    
    // 清空棋盘容器
    chessboard.innerHTML = '';
    
    // 更新提示文字
    statusText.textContent = '✅ 黑方先行，点击棋盘落子';
    
    // 生成15x15棋盘格子
    createChessBoard();
}

/**
 * 生成棋盘格子（动态创建DOM）
 */
function createChessBoard() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            // 绑定坐标，用于落子判断
            cell.dataset.row = row;
            cell.dataset.col = col;
            // 绑定点击事件
            cell.addEventListener('click', handlePlacePiece);
            chessboard.appendChild(cell);
        }
    }
}

// ==================== 4. 落子逻辑（核心功能） ====================
/**
 * 处理玩家落子事件
 * @param {Event} e - 点击事件对象
 */
function handlePlacePiece(e) {
    const cell = e.target;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    // ==================== 非法操作拦截（作业要求） ====================
    if (isGameOver) {
        statusText.textContent = '❌ 游戏已结束，请点击重新开始！';
        return;
    }
    if (gameBoard[row][col] !== null) {
        statusText.textContent = '❌ 该位置已有棋子，无法落子！';
        return;
    }

    // 1. 执行落子：更新数据 + 渲染页面
    gameBoard[row][col] = currentPlayer;
    const piece = document.createElement('div');
    piece.className = currentPlayer;
    cell.appendChild(piece);

    // 2. 判断胜负
    if (checkWin(row, col, currentPlayer)) {
        statusText.textContent = `🎉 ${currentPlayer === 'black' ? '黑方' : '白方'} 获胜！`;
        isGameOver = true;
        return;
    }

    // 3. 判断平局（棋盘已满）
    if (checkDraw()) {
        statusText.textContent = '🤝 棋盘已满，平局！';
        isGameOver = true;
        return;
    }

    // 4. 切换玩家
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    statusText.textContent = `⏳ ${currentPlayer === 'black' ? '黑方' : '白方'} 回合`;
}

// ==================== 5. 胜负/平局判断 ====================
/**
 * 判断是否连成五子（横、竖、左斜、右斜）
 * @param {number} row - 落子行
 * @param {number} col - 落子列
 * @param {string} player - 当前玩家
 * @returns {boolean} 是否获胜
 */
function checkWin(row, col, player) {
    // 四个判断方向
    const directions = [
        [0, 1],   // 横向 →
        [1, 0],   // 纵向 ↓
        [1, 1],   // 右下斜 ↘
        [1, -1]   // 左下斜 ↙
    ];

    for (const [dx, dy] of directions) {
        let count = 1;
        // 向正方向计数
        for (let i = 1; i < 5; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            if (!isValidPos(newRow, newCol) || gameBoard[newRow][newCol] !== player) break;
            count++;
        }
        // 向反方向计数
        for (let i = 1; i < 5; i++) {
            const newRow = row - dx * i;
            const newCol = col - dy * i;
            if (!isValidPos(newRow, newCol) || gameBoard[newRow][newCol] !== player) break;
            count++;
        }
        // 连成五子，获胜
        if (count >= 5) return true;
    }
    return false;
}

/**
 * 判断平局（棋盘无空位）
 * @returns {boolean} 是否平局
 */
function checkDraw() {
    for (let row of gameBoard) {
        if (row.includes(null)) return false;
    }
    return true;
}

/**
 * 判断坐标是否在棋盘范围内
 * @param {number} row - 行
 * @param {number} col - 列
 * @returns {boolean}
 */
function isValidPos(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// ==================== 6. 重新开始游戏 ====================
restartBtn.addEventListener('click', () => {
    initGame();
    statusText.textContent = '✅ 游戏已重置，黑方先行';
});