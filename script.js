/**
 * 棋类对战平台核心逻辑
 */

// --- 全局配置 ---
const MAX_UNDO_COUNT = 5;
const MIN_BOARD_SIZE = 8;
const MAX_BOARD_SIZE = 19;
const POINT_SIZE = 34; // 交叉点间距
const BOARD_FRAME_MARGIN = POINT_SIZE / 2; // 棋盘外边距

// --- 备忘录模式：存储棋盘状态 ---
class GameMemento {
    constructor(board, currentPlayer, isGameOver, size) {
        this.board = JSON.parse(JSON.stringify(board));
        this.currentPlayer = currentPlayer;
        this.isGameOver = isGameOver;
        this.size = size;
    }
}

// --- 抽象游戏基类 ---
class BaseGame {
    constructor(size) {
        this.size = size;
        this.currentPlayer = 'black';
        this.board = Array(size).fill().map(() => Array(size).fill(null));
        this.isGameOver = false;
        this.history = [];
    }

    saveState() {
        if (this.history.length >= MAX_UNDO_COUNT) this.history.shift();
        this.history.push(new GameMemento(this.board, this.currentPlayer, this.isGameOver, this.size));
    }

    undoChess() {
        if (this.history.length === 0) {
            alert("无法再悔棋了！");
            return false;
        }
        const memento = this.history.pop();
        this.board = memento.board;
        this.currentPlayer = memento.currentPlayer;
        this.isGameOver = memento.isGameOver;
        return true;
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }
}

// --- 五子棋逻辑 ---
class GobangGame extends BaseGame {
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

    judgeWin(row, col) {
        const directions = [[0,1],[1,0],[1,1],[1,-1]];
        const color = this.board[row][col];
        for (let [dx, dy] of directions) {
            let count = 1;
            for (let i = 1; i < 5; i++) {
                if (this.isValidPosition(row+dx*i, col+dy*i) && this.board[row+dx*i][col+dy*i] === color) count++;
                else break;
            }
            for (let i = 1; i < 5; i++) {
                if (this.isValidPosition(row-dx*i, col-dy*i) && this.board[row-dx*i][col-dy*i] === color) count++;
                else break;
            }
            if (count >= 5) return true;
        }
        return false;
    }
}

// --- 围棋逻辑 ---
class GoGame extends BaseGame {
    constructor(size) {
        super(size);
        this.passCount = 0;
    }

    placeChess(row, col) {
        if (this.isGameOver || this.board[row][col]) return;
        
        // 简单逻辑模拟：落子并记录历史（完整提子/气逻辑省略，保持与原代码一致）
        this.saveState();
        this.board[row][col] = this.currentPlayer;
        this.passCount = 0;
        this.switchPlayer();
        return { success: true };
    }

    passChess() {
        this.passCount++;
        if (this.passCount >= 2) {
            this.isGameOver = true;
            alert("双方虚着，游戏结束，请手动计算胜负。");
        }
        this.switchPlayer();
    }
}

// --- UI 管理器 (单例) ---
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

    renderSizeButtons() {
        const container = document.getElementById('sizeBtns');
        for (let i = MIN_BOARD_SIZE; i <= MAX_BOARD_SIZE; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            if (i === this.selectedSize) btn.classList.add('active');
            btn.onclick = () => {
                document.querySelectorAll('.size-btns button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedSize = i;
            };
            container.appendChild(btn);
        }
    }

    renderBoard(boardEl, game) {
        boardEl.innerHTML = '';
        const numLines = game.size;
        const contentSize = (numLines - 1) * POINT_SIZE;
        const totalSize = contentSize + 2 * BOARD_FRAME_MARGIN;

        boardEl.style.width = `${totalSize}px`;
        boardEl.style.height = `${totalSize}px`;

        // 动态绘制线条背景
        let bgImages = [], bgSizes = [], bgPositions = [];
        for (let i = 0; i < numLines; i++) {
            const offset = BOARD_FRAME_MARGIN + i * POINT_SIZE;
            // 竖线
            bgImages.push(`linear-gradient(#5a3921 ${contentSize}px, transparent 0)`);
            bgSizes.push(`1px ${contentSize}px`);
            bgPositions.push(`${offset}px ${BOARD_FRAME_MARGIN}px`);
            // 横线
            bgImages.push(`linear-gradient(90deg, #5a3921 ${contentSize}px, transparent 0)`);
            bgSizes.push(`${contentSize}px 1px`);
            bgPositions.push(`${BOARD_FRAME_MARGIN}px ${offset}px`);
        }
        boardEl.style.backgroundImage = bgImages.join(', ');
        boardEl.style.backgroundSize = bgSizes.join(', ');
        boardEl.style.backgroundPosition = bgPositions.join(', ');

        // 生成交叉点
        for (let r = 0; r < game.size; r++) {
            for (let c = 0; c < game.size; c++) {
                const pt = document.createElement('div');
                pt.className = 'cross-point';
                pt.style.left = `${c * POINT_SIZE + BOARD_FRAME_MARGIN}px`;
                pt.style.top = `${r * POINT_SIZE + BOARD_FRAME_MARGIN}px`;
                
                if (game.board[r][c]) {
                    const piece = document.createElement('div');
                    piece.className = `piece ${game.board[r][c]}`;
                    pt.appendChild(piece);
                }

                pt.onclick = () => {
                    const res = game.placeChess(r, c);
                    if (res?.success) {
                        this.renderBoard(boardEl, game);
                        if (res.win) setTimeout(() => alert(`恭喜！${res.winner === 'black' ? '黑方' : '白方'}获胜！`), 100);
                    }
                };
                boardEl.appendChild(pt);
            }
        }
        // 更新回合显示
        const turnEl = document.getElementById(game instanceof GobangGame ? 'gobangTurn' : 'goTurn');
        const pText = game.currentPlayer === 'black' ? '黑方' : '白方';
        const pClass = game.currentPlayer === 'black' ? 'turn-black' : 'turn-white';
        turnEl.innerHTML = `当前回合：<span class="${pClass}">${pText}</span> 落子`;
    }

    bindEvents() {
        // 切换页面
        document.getElementById('toGobang').onclick = () => {
            this.currentGame = new GobangGame(this.selectedSize);
            document.getElementById('mainPage').classList.add('hide');
            document.getElementById('gobangPage').classList.add('show');
            this.renderBoard(document.getElementById('gobangBoard'), this.currentGame);
        };

        document.getElementById('toGo').onclick = () => {
            this.currentGame = new GoGame(this.selectedSize);
            document.getElementById('mainPage').classList.add('hide');
            document.getElementById('goPage').classList.add('show');
            this.renderBoard(document.getElementById('goBoard'), this.currentGame);
        };

        // 返回主页
        const backHome = () => {
            document.getElementById('mainPage').classList.remove('hide');
            document.querySelectorAll('.game-page').forEach(p => p.classList.remove('show'));
        };
        document.getElementById('back1').onclick = backHome;
        document.getElementById('back2').onclick = backHome;

        // 悔棋
        document.getElementById('undo1').onclick = () => {
            if (this.currentGame.undoChess()) this.renderBoard(document.getElementById('gobangBoard'), this.currentGame);
        };
        document.getElementById('undo2').onclick = () => {
            if (this.currentGame.undoChess()) this.renderBoard(document.getElementById('goBoard'), this.currentGame);
        };

        // 提示面板
        document.getElementById('tipsToggleBtn').onclick = (e) => {
            const content = document.getElementById('tipsContent');
            content.classList.toggle('hide');
            e.target.textContent = content.classList.contains('hide') ? "显示" : "隐藏";
        };
    }
}

// 启动
window.onload = () => new UIManager();