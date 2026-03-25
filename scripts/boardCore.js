/**
 * Node / 脚本用棋盘核心：从 public/js/gameLogic.js 抽取的纯逻辑，无 window / Hamster。
 *
 * 坐标：gameList[x][y]，与浏览器一致；子值 0 空、1 黑、2 白。
 * 行棋：gameTurn 0 = 黑方行棋 → 落子为 1；gameTurn 1 = 白方 → 落子为 2。
 */

"use strict";

var BOARD_SIZE = 15;

function createEmptyBoard() {
	var b = [];
	for (var x = 0; x < BOARD_SIZE; x++) {
		var row = [];
		for (var y = 0; y < BOARD_SIZE; y++) {
			row.push(0);
		}
		b.push(row);
	}
	return b;
}

function cloneBoard(b) {
	var out = [];
	for (var i = 0; i < b.length; i++) {
		out.push(b[i].slice());
	}
	return out;
}

/**
 * @param {number} gameTurn 0 黑 / 1 白
 * @returns {boolean} 是否成功落子
 */
function applyMove(board, x, y, gameTurn) {
	if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) {
		return false;
	}
	if (board[x][y] !== 0) {
		return false;
	}
	if (gameTurn === 0) {
		board[x][y] = 1;
	} else if (gameTurn === 1) {
		board[x][y] = 2;
	} else {
		return false;
	}
	return true;
}

function virtualCell(gameList, cx, cy, mx, my, player) {
	if (cx === mx && cy === my) {
		return player;
	}
	if (cx < 0 || cy < 0 || cx > 14 || cy > 14) {
		return -1;
	}
	return gameList[cx][cy];
}

/**
 * 扫描某个方向上的连子情况（基于虚拟落子）。
 * @param {number[][]} gameList 棋盘二维数组，0 表示空位。
 * @param {number} mx 候选落子 x 坐标。
 * @param {number} my 候选落子 y 坐标。
 * @param {number} dx 扫描方向 x 步进（如 1、0、-1）。
 * @param {number} dy 扫描方向 y 步进（如 1、0、-1）。
 * @param {number} player 当前评估的玩家标识。
 * @returns {{total: number, leftOpen: boolean, rightOpen: boolean}} 连子总数与两端开口状态。
 */
function scanConnectedLine(gameList, mx, my, dx, dy, player) {
	// 从候选点反方向开始，统计连续同色棋子数量（left）
	var left = 0;
	var cx = mx - dx;
	var cy = my - dy;
	while (cx >= 0 && cy >= 0 && cx <= 14 && cy <= 14) {
		// virtualCell 会把 (mx,my) 视为 player 的“虚拟落子”
		if (virtualCell(gameList, cx, cy, mx, my, player) !== player) {
			break;
		}
		left++;
		cx -= dx;
		cy -= dy;
	}
	// 记录 left 方向上第一个非连续点（用于判断是否开口）
	var lx = cx;
	var ly = cy;

	// 从候选点正方向开始，统计连续同色棋子数量（right）
	var right = 0;
	cx = mx + dx;
	cy = my + dy;
	while (cx >= 0 && cy >= 0 && cx <= 14 && cy <= 14) {
		if (virtualCell(gameList, cx, cy, mx, my, player) !== player) {
			break;
		}
		right++;
		cx += dx;
		cy += dy;
	}
	// 记录 right 方向上第一个非连续点（用于判断是否开口）
	var rx = cx;
	var ry = cy;

	// total 包含虚拟落子自身：1 + 左连续 + 右连续
	var total = 1 + left + right;
	// 两端开口条件：坐标仍在棋盘内，且该位置为空
	var leftOpen = (lx >= 0 && ly >= 0 && lx <= 14 && ly <= 14 && gameList[lx][ly] === 0);
	var rightOpen = (rx >= 0 && ry >= 0 && rx <= 14 && ry <= 14 && gameList[rx][ry] === 0);

	return {
		total: total,
		leftOpen: leftOpen,
		rightOpen: rightOpen
	};
}

/**
 * 根据连子长度与两端开口情况，返回线型分值与类型。
 * @param {number} total 该方向上的连子总数（含虚拟落子）。
 * @param {boolean} leftOpen 左端是否开口。
 * @param {boolean} rightOpen 右端是否开口。
 * @returns {{score: number, kind: string}} 评分结果（分值 + 线型标签）。
 */
function linePatternScore(total, leftOpen, rightOpen) {
	// 成五（或超过五）直接给最高分
	if (total >= 5) {
		return { score: 1000000, kind: "FIVE" };
	}
	// 四连：按两端开口数区分
	// - OPEN4（活四）：两端都空（2 个成五点），威胁最高
	// - RUSH4（冲四）：仅一端空（1 个成五点），威胁次之
	// - DEAD4（死四）：两端都堵（0 个成五点），实际威胁较低
	if (total === 4) {
		if (leftOpen && rightOpen) {
			return { score: 120000, kind: "OPEN4" };
		}
		if (leftOpen || rightOpen) {
			return { score: 15000, kind: "RUSH4" };
		}
		return { score: 220, kind: "DEAD4" };
	}
	// 三连：区分活三、眠三、死三
	if (total === 3) {
		if (leftOpen && rightOpen) {
			return { score: 2800, kind: "OPEN3" };
		}
		if (leftOpen || rightOpen) {
			return { score: 650, kind: "SLEEP3" };
		}
		return { score: 120, kind: "DEAD3" };
	}
	// 二连：区分活二、眠二、死二
	if (total === 2) {
		if (leftOpen && rightOpen) {
			return { score: 180, kind: "OPEN2" };
		}
		if (leftOpen || rightOpen) {
			return { score: 55, kind: "SLEEP2" };
		}
		return { score: 15, kind: "DEAD2" };
	}
	// 单子：根据开口数给基础分
	if (leftOpen && rightOpen) {
		return { score: 35, kind: "OPEN1" };
	}
	if (leftOpen || rightOpen) {
		return { score: 10, kind: "SLEEP1" };
	}
	return { score: 3, kind: "LOW" };
}

function getPatternScoreAt(gameList, mx, my, player) {
	// 该位置已有棋子时，不能落子，分值记为 0
	if (gameList[mx][my] !== 0) {
		return 0;
	}
	// 四个主方向：横、竖、主对角、副对角
	var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
	// 累积分值，以及用于组合加分的形态计数
	var sum = 0;
	var open3Count = 0;
	var rush4Count = 0;
	var i;
	var d;
	var scan;
	var r;

	for (i = 0; i < dirs.length; i++) {
		d = dirs[i];
		// 在当前方向上扫描连子与两端是否开口
		scan = scanConnectedLine(gameList, mx, my, d[0], d[1], player);
		// 将线形转换为对应分值与形态类型
		r = linePatternScore(scan.total, scan.leftOpen, scan.rightOpen);
		sum += r.score;
		if (r.kind === "OPEN3") {
			open3Count++;
		}
		if (r.kind === "RUSH4") {
			rush4Count++;
		}
	}
	// 双活三：在基础分上追加组合奖励
	if (open3Count >= 2) {
		sum += 12000;
	}
	// 双冲四：在基础分上追加更高组合奖励
	if (rush4Count >= 2) {
		sum += 80000;
	}
	return sum;
}

function checkHorizontal(gameList, x, y) {
	return gameList[x][y] !== 0 &&
		gameList[x][y] === gameList[x + 1][y] &&
		gameList[x][y] === gameList[x + 2][y] &&
		gameList[x][y] === gameList[x + 3][y] &&
		gameList[x][y] === gameList[x + 4][y];
}

function checkVertica(gameList, x, y) {
	return gameList[x][y] !== 0 &&
		gameList[x][y] === gameList[x][y + 1] &&
		gameList[x][y] === gameList[x][y + 2] &&
		gameList[x][y] === gameList[x][y + 3] &&
		gameList[x][y] === gameList[x][y + 4];
}

function checkViceDiagonal(gameList, x, y) {
	return gameList[x][y] !== 0 &&
		gameList[x][y] === gameList[x + 1][y + 1] &&
		gameList[x][y] === gameList[x + 2][y + 2] &&
		gameList[x][y] === gameList[x + 3][y + 3] &&
		gameList[x][y] === gameList[x + 4][y + 4];
}

function checkMainDiagonal(gameList, x, y) {
	return gameList[x][y] !== 0 &&
		gameList[x][y] === gameList[x + 1][y - 1] &&
		gameList[x][y] === gameList[x + 2][y - 2] &&
		gameList[x][y] === gameList[x + 3][y - 3] &&
		gameList[x][y] === gameList[x + 4][y - 4];
}

/**
 * 与浏览器 gameLogic.getResult 等价的全盘扫描（任一方五连即 true）。
 */
function checkWin(gameList) {
	var x;
	var y;
	for (x = 0; x < gameList.length; x++) {
		for (y = 0; y < gameList[x].length; y++) {
			if (x <= 10 && gameList[x][y] !== 0) {
				if (checkHorizontal(gameList, x, y)) {
					return true;
				}
			}
			if (y <= 10 && gameList[x][y] !== 0) {
				if (checkVertica(gameList, x, y)) {
					return true;
				}
			}
			if (x <= 10 && y <= 10 && gameList[x][y] !== 0) {
				if (checkViceDiagonal(gameList, x, y)) {
					return true;
				}
			}
			if (x <= 10 && y >= 4 && gameList[x][y] !== 0) {
				if (checkMainDiagonal(gameList, x, y)) {
					return true;
				}
			}
		}
	}
	return false;
}

function pushUnique(list, seen, x, y) {
	var key = x + "," + y;
	if (seen[key]) {
		return;
	}
	seen[key] = true;
	list.push({ x: x, y: y });
}

/**
 * 与 gameLogic.checkDanger + window.needComputePlace 语义一致（邻接已有子的空点），去重。
 */
function getLegalCandidates(gameList) {
	var list = [];
	var seen = {};
	var i;
	var k;

	for (i = 0; i < BOARD_SIZE; i++) {
		for (k = 0; k < BOARD_SIZE; k++) {
			if (gameList[i][k] !== 0) {
				continue;
			}

			if (i < 14 && gameList[i + 1][k] !== 0) {
				pushUnique(list, seen, i, k);
			}
			if (i > 0 && gameList[i - 1][k] !== 0) {
				pushUnique(list, seen, i, k);
			}
			if (k < 14 && gameList[i][k + 1] !== 0) {
				pushUnique(list, seen, i, k);
			}
			if (k > 0 && gameList[i][k - 1] !== 0) {
				pushUnique(list, seen, i, k);
			}
			if (k > 0 && i > 0 && gameList[i - 1][k - 1] !== 0) {
				pushUnique(list, seen, i, k);
			}
			if (k < 14 && i > 0 && gameList[i - 1][k + 1] !== 0) {
				pushUnique(list, seen, i, k);
			}
			if (i < 14 && k > 0 && gameList[i + 1][k - 1] !== 0) {
				pushUnique(list, seen, i, k);
			}
			if (i < 14 && k < 14 && gameList[i + 1][k + 1] !== 0) {
				pushUnique(list, seen, i, k);
			}
		}
	}

	list.sort(function (a, b) {
		if (a.x !== b.x) {
			return a.x - b.x;
		}
		return a.y - b.y;
	});
	return list;
}

function countStones(gameList) {
	var c = 0;
	var i;
	var j;
	for (i = 0; i < BOARD_SIZE; i++) {
		for (j = 0; j < BOARD_SIZE; j++) {
			if (gameList[i][j] !== 0) {
				c++;
			}
		}
	}
	return c;
}

module.exports = {
	BOARD_SIZE: BOARD_SIZE,
	createEmptyBoard: createEmptyBoard,
	cloneBoard: cloneBoard,
	applyMove: applyMove,
	checkWin: checkWin,
	getLegalCandidates: getLegalCandidates,
	getPatternScoreAt: getPatternScoreAt,
	countStones: countStones
};
