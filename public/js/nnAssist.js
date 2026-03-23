// 固定结构前向网络，用于 AI 落子辅助分（M2）

var Neuroevolution = require("./Neuroevolution");
var nnFeatures = require("./nnFeatures");

var assistNetwork = null;

function ensureNetwork() {
	if (assistNetwork) {
		return assistNetwork;
	}
	var ne = new Neuroevolution({
		network: [nnFeatures.FEATURE_DIM, [4], 1],
		population: 1,
		elitism: 1,
		randomBehaviour: 0,
		mutationRate: 0,
		historic: 0
	});
	var nets = ne.nextGeneration();
	assistNetwork = nets[0];
	return assistNetwork;
}

function computeAssist(features) {
	var net = ensureNetwork();
	var raw = net.compute(features);
	var v = raw && raw.length ? raw[0] : 0;
	return typeof v === "number" && !isNaN(v) ? v : 0;
}

if (typeof window !== "undefined") {
	window.__nnAssistSmoke = function () {
		var gl = window.gameList;
		if (!gl) {
			return null;
		}
		var n = window.needComputePlace && window.needComputePlace.length ? window.needComputePlace.length : 1;
		var stones = 0;
		for (var i = 0; i < gl.length; i++) {
			for (var j = 0; j < gl[i].length; j++) {
				if (gl[i][j] != 0) stones++;
			}
		}
		var f = nnFeatures.buildFeatures(gl, 7, 7, {
			attackScore: 0,
			defenseScore: 0,
			candidateCount: n,
			stonesOnBoard: stones
		});
		return computeAssist(f);
	};
}

module.exports = {
	computeAssist: computeAssist
};
