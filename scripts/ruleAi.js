/**
 * 纯规则 AI（与浏览器 NN 全关时同一套棋形分 + 攻守比较），供 Node 对局 / 进化作基线对手。
 */

"use strict";

var boardCore = require("./boardCore");

function getMostDangerPlace(objlist) {
	var big = objlist[0];
	var i;
	for (i = 0; i < objlist.length; i++) {
		if (objlist[i].weight > big.weight) {
			big = objlist[i];
		}
	}
	return big;
}

/**
 * @param {number[][]} gameList
 * @param {number} gameTurn 当前行棋方 0 黑 / 1 白
 * @returns {{x:number,y:number}}
 */
function pickMove(gameList, gameTurn) {
	var candidates = boardCore.getLegalCandidates(gameList);
	var position;

	var turnAttack = gameTurn === 0 ? 1 : 2;
	var turnDefense = gameTurn === 0 ? 2 : 1;

	if (candidates.length > 0) {
		var winList = [];
		var dangerList = [];
		var i;
		var cx;
		var cy;
		var attackScore;
		var defenseScore;

		for (i = 0; i < candidates.length; i++) {
			cx = candidates[i].x;
			cy = candidates[i].y;
			attackScore = boardCore.getPatternScoreAt(gameList, cx, cy, turnAttack);
			winList.push({ x: cx, y: cy, weight: attackScore });
		}
		for (i = 0; i < candidates.length; i++) {
			cx = candidates[i].x;
			cy = candidates[i].y;
			defenseScore = boardCore.getPatternScoreAt(gameList, cx, cy, turnDefense);
			dangerList.push({ x: cx, y: cy, weight: defenseScore });
		}

		var winPoint = getMostDangerPlace(winList);
		var dangerPoint = getMostDangerPlace(dangerList);

		if (winPoint.weight > dangerPoint.weight) {
			position = { x: winPoint.x, y: winPoint.y };
		} else {
			position = { x: dangerPoint.x, y: dangerPoint.y };
		}
	} else {
		position = { x: 7, y: 7 };
	}

	return position;
}

module.exports = {
	getMostDangerPlace: getMostDangerPlace,
	pickMove: pickMove
};
