/**
 * 五子棋 NN 辅助特征 v1（顺序固定，变更须 bump schemaVersion）
 *
 * 索引 | 含义
 * -----|--------------------------------------------------
 * 0    | nx：归一化列坐标 (x - 7) / 7
 * 1    | ny：归一化行坐标 (y - 7) / 7
 * 2    | attackNorm：进攻向 pattern 分 / SCORE_SCALE（裁剪约 [-1,1]）
 * 3    | defenseNorm：防守向 pattern 分 / SCORE_SCALE
 * 4    | candCountNorm：候选点数 / 50，裁剪到 [0,1]
 * 5    | moveProgress：盘上已下子数 / 225
 */

var FEATURE_DIM = 6;
var SCORE_SCALE = 1e6;
var MAX_CAND = 50;
var BOARD_CELLS = 225;

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

/**
 * @param {Array} gameList 15×15
 * @param {number} x
 * @param {number} y
 * @param {object} context attackScore, defenseScore, candidateCount, stonesOnBoard（可选，缺省则从 gameList 统计子数）
 */
function buildFeatures(gameList, x, y, context) {
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
	if (out.length !== FEATURE_DIM) {
		throw new Error("nnFeatures dim");
	}
	return out;
}

module.exports = {
	FEATURE_DIM: FEATURE_DIM,
	buildFeatures: buildFeatures
};
