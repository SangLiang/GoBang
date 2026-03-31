/**
 * v2 NN 独立评分选点（Node 侧），供进化评估。
 */

"use strict";

var path = require("path");
var boardCore = require("./boardCore");
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

		var player = gameTurn === 0 ? 1 : 2;
		var candLen = candidates.length;
		var stonesOnBoard = boardCore.countStones(gameList);
		var best = null;
		var i;
		var cx;
		var cy;
		var feat;
		var raw;
		var score;
		var weight;

		for (i = 0; i < candLen; i++) {
			cx = candidates[i].x;
			cy = candidates[i].y;
			feat = boardCore.buildLocalFeatures(gameList, cx, cy, player, stonesOnBoard);
			if (feat.length !== nnFeatures.FEATURE_DIM_V2) {
				throw new Error("nnAssistPick v2 feature dim mismatch: " + feat.length);
			}
			raw = network.compute(feat);
			score = raw && raw.length ? raw[0] : 0;
			if (typeof score !== "number" || isNaN(score)) {
				score = 0;
			}
			weight = lambda * score;
			if (!best || weight > best.weight) {
				best = { x: cx, y: cy, weight: weight };
			}
		}

		if (!best) {
			return { x: 7, y: 7 };
		}
		return { x: best.x, y: best.y };
	};
}

module.exports = {
	makePicker: makePicker
};
