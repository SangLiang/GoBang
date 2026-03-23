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

function scanConnectedLine(gameList, mx, my, dx, dy, player) {
	var left = 0;
	var cx = mx - dx;
	var cy = my - dy;
	while (cx >= 0 && cy >= 0 && cx <= 14 && cy <= 14) {
		if (virtualCell(gameList, cx, cy, mx, my, player) !== player) {
			break;
		}
		left++;
		cx -= dx;
		cy -= dy;
	}
	var lx = cx;
	var ly = cy;

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
	var rx = cx;
	var ry = cy;

	var total = 1 + left + right;
	var leftOpen = (lx >= 0 && ly >= 0 && lx <= 14 && ly <= 14 && gameList[lx][ly] === 0);
	var rightOpen = (rx >= 0 && ry >= 0 && rx <= 14 && ry <= 14 && gameList[rx][ry] === 0);

	return {
		total: total,
		leftOpen: leftOpen,
		rightOpen: rightOpen
	};
}

function linePatternScore(total, leftOpen, rightOpen) {
	if (total >= 5) {
		return { score: 1000000, kind: "FIVE" };
	}
	if (total === 4) {
		if (leftOpen && rightOpen) {
			return { score: 120000, kind: "OPEN4" };
		}
		if (leftOpen || rightOpen) {
			return { score: 15000, kind: "RUSH4" };
		}
		return { score: 220, kind: "DEAD4" };
	}
	if (total === 3) {
		if (leftOpen && rightOpen) {
			return { score: 2800, kind: "OPEN3" };
		}
		if (leftOpen || rightOpen) {
			return { score: 650, kind: "SLEEP3" };
		}
		return { score: 120, kind: "DEAD3" };
	}
	if (total === 2) {
		if (leftOpen && rightOpen) {
			return { score: 180, kind: "OPEN2" };
		}
		if (leftOpen || rightOpen) {
			return { score: 55, kind: "SLEEP2" };
		}
		return { score: 15, kind: "DEAD2" };
	}
	if (leftOpen && rightOpen) {
		return { score: 35, kind: "OPEN1" };
	}
	if (leftOpen || rightOpen) {
		return { score: 10, kind: "SLEEP1" };
	}
	return { score: 3, kind: "LOW" };
}

function getPatternScoreAt(gameList, mx, my, player) {
	if (gameList[mx][my] !== 0) {
		return 0;
	}
	var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
	var sum = 0;
	var open3Count = 0;
	var rush4Count = 0;
	var i;
	var d;
	var scan;
	var r;

	for (i = 0; i < dirs.length; i++) {
		d = dirs[i];
		scan = scanConnectedLine(gameList, mx, my, d[0], d[1], player);
		r = linePatternScore(scan.total, scan.leftOpen, scan.rightOpen);
		sum += r.score;
		if (r.kind === "OPEN3") {
			open3Count++;
		}
		if (r.kind === "RUSH4") {
			rush4Count++;
		}
	}
	if (open3Count >= 2) {
		sum += 12000;
	}
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
