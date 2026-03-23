// 固定结构前向网络，用于 AI 落子辅助分
//
// 可选：在 data/ai-training.json 根级（或与 records 并列）写入：
//   "nnAssistSchemaVersion": 1,
//   "nnAssistWeights": { "neurons": [6,4,1], "weights": [...] }  // Network.getSave()
// 亦兼容计划中的字段名 "weights"（须同时带 nnAssistSchemaVersion）。

var Neuroevolution = require("./Neuroevolution");
var nnFeatures = require("./nnFeatures");
var trainingApi = require("./trainingApi");

/** 与训练文件里 nnAssistSchemaVersion 对齐；变更网络结构时 bump */
var NN_ASSIST_SCHEMA_VERSION = 1;

var assistNetwork = null;

function validateSaveShape(save) {
	var exp = [nnFeatures.FEATURE_DIM, nnFeatures.NN_ASSIST_HIDDEN[0], 1];
	if (!save || !Array.isArray(save.neurons) || save.neurons.length !== exp.length) {
		return false;
	}
	for (var i = 0; i < exp.length; i++) {
		if (save.neurons[i] !== exp[i]) {
			return false;
		}
	}
	return Array.isArray(save.weights);
}

/**
 * 若 data 含合法 nn 权重则 setSave；失败或未匹配则保持/回退到默认随机网（首次 compute 时创建）。
 * @return {boolean} 是否已成功应用文件中的权重
 */
function tryApplySavedWeights(data) {
	if (!data || data.nnAssistSchemaVersion !== NN_ASSIST_SCHEMA_VERSION) {
		return false;
	}
	var save = data.nnAssistWeights != null ? data.nnAssistWeights : data.weights;
	if (!validateSaveShape(save)) {
		return false;
	}
	try {
		ensureNetwork();
		assistNetwork.setSave(save);
		return true;
	} catch (e) {
		console.warn("[nnAssist] setSave failed", e && e.message ? e.message : e);
		assistNetwork = null;
		return false;
	}
}

/**
 * GET /api/training，仅在成功且 schema/结构匹配时覆盖权重。
 * @return {Promise<void>}
 */
function preloadWeightsFromTrainingApi() {
	return trainingApi.fetchTrainingData().then(function (data) {
		tryApplySavedWeights(data);
	});
}

function ensureNetwork() {
	if (assistNetwork) {
		return assistNetwork;
	}
	var ne = new Neuroevolution({
		network: [nnFeatures.FEATURE_DIM, nnFeatures.NN_ASSIST_HIDDEN, 1],
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
	NN_ASSIST_SCHEMA_VERSION: NN_ASSIST_SCHEMA_VERSION,
	computeAssist: computeAssist,
	tryApplySavedWeights: tryApplySavedWeights,
	preloadWeightsFromTrainingApi: preloadWeightsFromTrainingApi
};

