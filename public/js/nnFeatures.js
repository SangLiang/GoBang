/**
 * 特征模块支持 v1 / v2 两套方案：
 * - v1：6 维规则辅助特征（保持兼容）
 * - v2：22 维局部棋盘特征（独立决策）
 */

var FEATURE_DIM_V1 = 6;
var NN_ASSIST_HIDDEN_V1 = [4];
var FEATURE_DIM_V2 = 22;
var NN_ASSIST_HIDDEN_V2 = [32];

// 默认导出的维度/网络保持 v1，避免影响现有 S 模式。
var FEATURE_DIM = FEATURE_DIM_V1;
var NN_ASSIST_HIDDEN = NN_ASSIST_HIDDEN_V1;

var SCORE_SCALE = 1e6;
var MAX_CAND = 50;
var BOARD_CELLS = 225;
var BOARD_SIZE = 15;

function clamp(v, lo, hi) {
	if (v < lo) return lo;
	if (v > hi) return hi;
	return v;
}

function countStonesOnBoard(gameList) {
	var count = 0;
	for (var i = 0; i < gameList.length; i++) {
		for (var j = 0; j < gameList[i].length; j++) {
			if (gameList[i][j] != 0) {
				count++;
			}
		}
	}
	return count;
}

function inBoard(x, y) {
	return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
}

/**
 * v1 特征（兼容旧逻辑）
 */
function buildFeaturesV1(gameList, x, y, context) {
	context = context || {};
	var attackScore = context.attackScore;
	var defenseScore = context.defenseScore;
	var candidateCount = context.candidateCount;
	var stonesOnBoard = context.stonesOnBoard;
	if (stonesOnBoard === undefined || stonesOnBoard === null) {
		stonesOnBoard = countStonesOnBoard(gameList);
	}

	var nx = (x - 7) / 7;
	var ny = (y - 7) / 7;
	var attackNorm = clamp(attackScore / SCORE_SCALE, -1, 1);
	var defenseNorm = clamp(defenseScore / SCORE_SCALE, -1, 1);
	var candCountNorm = clamp(candidateCount / MAX_CAND, 0, 1);
	var moveProgress = clamp(stonesOnBoard / BOARD_CELLS, 0, 1);

	var out = [nx, ny, attackNorm, defenseNorm, candCountNorm, moveProgress];
	if (out.length !== FEATURE_DIM_V1) {
		throw new Error("nnFeatures v1 dim");
	}
	return out;
}

function scanOneSide(board, mx, my, dx, dy, stone) {
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

function hasGapOnSide(board, startX, startY, dx, dy, stone) {
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
 * v2：扫描单方向线特征。
 * 返回：myCount/myGap/oppCount/oppGap/openSides（均为未归一化值）。
 */
function scanDirectionLine(board, mx, my, dx, dy, player) {
	var opponent = player === 1 ? 2 : 1;

	var myLeft = scanOneSide(board, mx, my, -dx, -dy, player);
	var myRight = scanOneSide(board, mx, my, dx, dy, player);
	var myCount = Math.min(1 + myLeft.count + myRight.count, 4);

	var myGap = hasGapOnSide(board, myLeft.endX, myLeft.endY, -dx, -dy, player);
	if (!myGap) {
		myGap = hasGapOnSide(board, myRight.endX, myRight.endY, dx, dy, player);
	}

	var oppLeft = scanOneSide(board, mx, my, -dx, -dy, opponent);
	var oppRight = scanOneSide(board, mx, my, dx, dy, opponent);
	var oppCount = Math.min(oppLeft.count + oppRight.count, 4);

	var oppGap = hasGapOnSide(board, oppLeft.endX, oppLeft.endY, -dx, -dy, opponent);
	if (!oppGap) {
		oppGap = hasGapOnSide(board, oppRight.endX, oppRight.endY, dx, dy, opponent);
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
 * v2：22 维局部特征。
 * @param {number[][]} gameList
 * @param {number} x
 * @param {number} y
 * @param {number} player 1|2，按评估方视角
 * @param {object} context stonesOnBoard/isMyTurn（可选）
 */
function buildFeaturesV2(gameList, x, y, player, context) {
	context = context || {};
	var stonesOnBoard = context.stonesOnBoard;
	var isMyTurn = context.isMyTurn;
	if (stonesOnBoard === undefined || stonesOnBoard === null) {
		stonesOnBoard = countStonesOnBoard(gameList);
	}
	if (isMyTurn === undefined || isMyTurn === null) {
		isMyTurn = 1;
	}

	var out = [isMyTurn ? 1 : 0, clamp(stonesOnBoard / BOARD_CELLS, 0, 1)];
	var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
	for (var i = 0; i < dirs.length; i++) {
		var d = dirs[i];
		var f = scanDirectionLine(gameList, x, y, d[0], d[1], player);
		out.push(clamp(f.myCount / 4, 0, 1));
		out.push(f.myGap ? 1 : 0);
		out.push(clamp(f.oppCount / 4, 0, 1));
		out.push(f.oppGap ? 1 : 0);
		out.push(clamp(f.openSides / 5, 0, 1));
	}
	if (out.length !== FEATURE_DIM_V2) {
		throw new Error("nnFeatures v2 dim");
	}
	return out;
}

/**
 * 默认接口保持 v1，避免影响现有逻辑。
 */
function buildFeatures(gameList, x, y, context) {
	return buildFeaturesV1(gameList, x, y, context);
}

module.exports = {
	FEATURE_DIM: FEATURE_DIM,
	NN_ASSIST_HIDDEN: NN_ASSIST_HIDDEN,
	FEATURE_DIM_V1: FEATURE_DIM_V1,
	NN_ASSIST_HIDDEN_V1: NN_ASSIST_HIDDEN_V1,
	FEATURE_DIM_V2: FEATURE_DIM_V2,
	NN_ASSIST_HIDDEN_V2: NN_ASSIST_HIDDEN_V2,
	buildFeatures: buildFeatures,
	buildFeaturesV1: buildFeaturesV1,
	buildFeaturesV2: buildFeaturesV2,
	scanDirectionLine: scanDirectionLine,
	countStonesOnBoard: countStonesOnBoard
};
