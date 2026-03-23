/**
 * 带 NN 辅助的选点（与浏览器 λ 混合一致），供 Node 进化评估。
 */

"use strict";

var path = require("path");
var boardCore = require("./boardCore");
var ruleAi = require("./ruleAi");
var nnFeatures = require(path.join(__dirname, "..", "public", "js", "nnFeatures.js"));

/**
 * @param {object} network Neuroevolution Network 实例（已 setSave / perceptronGeneration）
 * @param {number} lambda
 */
function makePicker(network, lambda) {
	return function pick(gameList, gameTurn) {
		var candidates = boardCore.getLegalCandidates(gameList);
		if (candidates.length === 0) {
			return { x: 7, y: 7 };
		}

		var turnAttack = gameTurn === 0 ? 1 : 2;
		var turnDefense = gameTurn === 0 ? 2 : 1;
		var candLen = candidates.length;
		var stonesOnBoard = boardCore.countStones(gameList);
		var winList = [];
		var dangerList = [];
		var i;
		var cx;
		var cy;
		var attackScore;
		var defenseScore;
		var feat;
		var raw;
		var assist;
		var bump;

		for (i = 0; i < candLen; i++) {
			cx = candidates[i].x;
			cy = candidates[i].y;
			attackScore = boardCore.getPatternScoreAt(gameList, cx, cy, turnAttack);
			defenseScore = boardCore.getPatternScoreAt(gameList, cx, cy, turnDefense);
			feat = nnFeatures.buildFeatures(gameList, cx, cy, {
				attackScore: attackScore,
				defenseScore: defenseScore,
				candidateCount: candLen,
				stonesOnBoard: stonesOnBoard
			});
			raw = network.compute(feat);
			assist = raw && raw.length ? raw[0] : 0;
			if (typeof assist !== "number" || isNaN(assist)) {
				assist = 0;
			}
			bump = lambda * assist;
			winList.push({ x: cx, y: cy, weight: attackScore + bump });
			dangerList.push({ x: cx, y: cy, weight: defenseScore + bump });
		}

		var winPoint = ruleAi.getMostDangerPlace(winList);
		var dangerPoint = ruleAi.getMostDangerPlace(dangerList);

		if (winPoint.weight > dangerPoint.weight) {
			return { x: winPoint.x, y: winPoint.y };
		}
		return { x: dangerPoint.x, y: dangerPoint.y };
	};
}

module.exports = {
	makePicker: makePicker
};
