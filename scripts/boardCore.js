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
			return { score: 10000, kind: "OPEN3" };  // 活三：两个成四点，仅次于冲四
		}
		if (leftOpen || rightOpen) {
			return { score: 800, kind: "SLEEP3" };
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

/**
 * 判断坐标是否在棋盘范围内。
 * 棋盘固定为 15x15，合法索引区间为 [0, 14]。
 *
 * @param {number} x 横坐标（列）
 * @param {number} y 纵坐标（行）
 * @returns {boolean} true 表示坐标合法，false 表示越界
 */
function inBoard(x, y) {
	return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
}

/**
 * 从候选点沿某一侧方向扫描“连续同色子”。
 *
 * 扫描起点不是 (mx,my) 本身，而是它相邻的一格 `(mx + dx, my + dy)`，
 * 连续计数仅统计棋盘中已经存在的 stone，不包含候选点虚拟落子。
 * 扫描在遇到以下任一条件时停止：
 * 1) 越界
 * 2) 当前位置不是 stone
 *
 * @param {number[][]} board 当前棋盘（0 空 / 1 黑 / 2 白）
 * @param {number} mx 候选点 x
 * @param {number} my 候选点 y
 * @param {number} dx 扫描方向 x 步进（-1/0/1）
 * @param {number} dy 扫描方向 y 步进（-1/0/1）
 * @param {number} stone 目标棋子颜色（1 或 2）
 * @returns {{count:number,endX:number,endY:number}}
 *   - count: 连续同色子数量
 *   - endX/endY: 停止位置（第一个不满足连续条件的位置，可用于后续 gap/open 计算）
 */
function scanOneSideForLocal(board, mx, my, dx, dy, stone) {
	var count = 0;
	var cx = mx + dx;
	var cy = my + dy;
	while (inBoard(cx, cy) && board[cx][cy] === stone) {
		count++;
		cx += dx;
		cy += dy;
	}
	return {
		count: count,
		endX: cx,
		endY: cy
	};
}

/**
 * 判断某一侧是否存在“跳空”形态（X _ X）。
 *
 * 规则：
 * - startX/startY 应该是“连续段之后第一个格子”（通常来自 scanOneSideForLocal 的 endX/endY）
 * - 该格必须为空（_）
 * - 再向同方向跨一格必须是 stone（X）
 * 满足则返回 1，否则返回 0。
 *
 * @param {number[][]} board 当前棋盘
 * @param {number} startX 连续段外侧首格 x
 * @param {number} startY 连续段外侧首格 y
 * @param {number} dx 扫描方向 x 步进
 * @param {number} dy 扫描方向 y 步进
 * @param {number} stone 目标棋子颜色（1 或 2）
 * @returns {0|1} 是否存在跳空
 */
function hasGapOnSideForLocal(board, startX, startY, dx, dy, stone) {
	if (!inBoard(startX, startY) || board[startX][startY] !== 0) {
		return 0;
	}
	var bx = startX + dx;
	var by = startY + dy;
	if (inBoard(bx, by) && board[bx][by] === stone) {
		return 1;
	}
	return 0;
}

/**
 * 计算单个方向上的 v2 局部特征（未归一化原值）。
 *
 * 特征含义：
 * - myCount: 我方连续子数（含候选点虚拟落子，最大截断为 4）
 * - myGap:   我方是否存在跳空（X _ X）
 * - oppCount:对手连续子数（不含候选点，最大截断为 4）
 * - oppGap:  对手是否存在跳空（X _ X）
 * - openSides: 我方连续段外侧两端可延伸空位总数，最大截断为 5
 *
 * 说明：
 * - “我方”连续数按“落在候选点后”视角计算，所以是 `1 + left + right`
 * - “对手”连续数按当前盘面威胁计算，不做候选点虚拟落子
 * - openSides 以我方连续段两端向外数空格，遇到边界或非空即停止
 *
 * @param {number[][]} board 当前棋盘
 * @param {number} mx 候选点 x
 * @param {number} my 候选点 y
 * @param {number} dx 方向 x 步进
 * @param {number} dy 方向 y 步进
 * @param {number} player 当前评估方（1 或 2）
 * @returns {{myCount:number,myGap:0|1,oppCount:number,oppGap:0|1,openSides:number}}
 */
function scanDirectionLocal(board, mx, my, dx, dy, player) {
	var opponent = player === 1 ? 2 : 1;

	var myLeft = scanOneSideForLocal(board, mx, my, -dx, -dy, player);
	var myRight = scanOneSideForLocal(board, mx, my, dx, dy, player);
	var myCount = Math.min(1 + myLeft.count + myRight.count, 4);

	var myGap = hasGapOnSideForLocal(board, myLeft.endX, myLeft.endY, -dx, -dy, player);
	if (!myGap) {
		myGap = hasGapOnSideForLocal(board, myRight.endX, myRight.endY, dx, dy, player);
	}

	var oppLeft = scanOneSideForLocal(board, mx, my, -dx, -dy, opponent);
	var oppRight = scanOneSideForLocal(board, mx, my, dx, dy, opponent);
	var oppCount = Math.min(oppLeft.count + oppRight.count, 4);

	var oppGap = hasGapOnSideForLocal(board, oppLeft.endX, oppLeft.endY, -dx, -dy, opponent);
	if (!oppGap) {
		oppGap = hasGapOnSideForLocal(board, oppRight.endX, oppRight.endY, dx, dy, opponent);
	}

	var openSides = 0;
	var cx = myLeft.endX;
	var cy = myLeft.endY;
	while (inBoard(cx, cy) && board[cx][cy] === 0 && openSides < 5) {
		openSides++;
		cx -= dx;
		cy -= dy;
	}
	cx = myRight.endX;
	cy = myRight.endY;
	while (inBoard(cx, cy) && board[cx][cy] === 0 && openSides < 5) {
		openSides++;
		cx += dx;
		cy += dy;
	}

	return {
		myCount: myCount,
		myGap: myGap,
		oppCount: oppCount,
		oppGap: oppGap,
		openSides: Math.min(openSides, 5)
	};
}

/**
 * 构建 Node 侧 v2 特征向量（22 维）。
 *
 * 维度布局：
 * - 0: isMyTurn（当前固定写 1，用于与浏览器/训练端接口保持一致）
 * - 1: progress = stonesOnBoard / 225，裁剪到 [0,1]
 * - 2..21: 四个方向，每个方向 5 维：
 *   [myCount/4, myGap, oppCount/4, oppGap, openSides/5]
 *
 * 方向顺序固定为：
 * - [1, 0]   横向
 * - [0, 1]   纵向
 * - [1, 1]   主对角
 * - [1, -1]  副对角
 *
 * 注意：
 * - 顺序是协议的一部分，训练与推理两端必须一致
 * - 所有输出都被归一化到 [0,1]
 * - 本函数只负责“特征提取”，不做候选合法性判断
 *
 * @param {number[][]} gameList 当前棋盘
 * @param {number} x 候选点 x
 * @param {number} y 候选点 y
 * @param {number} player 当前评估方（1 或 2）
 * @param {number} [stonesOnBoard] 盘面已有落子数；未传时自动统计
 * @returns {number[]} 22 维特征数组
 */
function buildLocalFeatures(gameList, x, y, player, stonesOnBoard) {
	if (stonesOnBoard === undefined || stonesOnBoard === null) {
		stonesOnBoard = countStones(gameList);
	}
	var features = [1, Math.max(0, Math.min(1, stonesOnBoard / 225))];
	var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
	for (var i = 0; i < dirs.length; i++) {
		var d = dirs[i];
		var f = scanDirectionLocal(gameList, x, y, d[0], d[1], player);
		features.push(Math.max(0, Math.min(1, f.myCount / 4)));
		features.push(f.myGap ? 1 : 0);
		features.push(Math.max(0, Math.min(1, f.oppCount / 4)));
		features.push(f.oppGap ? 1 : 0);
		features.push(Math.max(0, Math.min(1, f.openSides / 5)));
	}
	return features;
}

module.exports = {
	BOARD_SIZE: BOARD_SIZE,
	createEmptyBoard: createEmptyBoard,
	cloneBoard: cloneBoard,
	applyMove: applyMove,
	checkWin: checkWin,
	getLegalCandidates: getLegalCandidates,
	getPatternScoreAt: getPatternScoreAt,
	countStones: countStones,
	buildLocalFeatures: buildLocalFeatures
};
