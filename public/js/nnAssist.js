// 双版本前向网络：
// - v1: 6->4->1（兼容现有 AI.js 的辅助分逻辑）
// - v2: 22->32->1（供 NN 独立决策链路使用）
//
// 可选：在 data/ai-training.json 根级（或与 records 并列）写入：
//   "nnAssistSchemaVersion": 1|2,
//   "nnAssistWeights": { "neurons": [...], "weights": [...] }  // Network.getSave()
// 亦兼容字段名 "weights"（须同时带 nnAssistSchemaVersion）。

var Neuroevolution = require("./Neuroevolution");
var nnFeatures = require("./nnFeatures");
var trainingApi = require("./trainingApi");

var NN_ASSIST_SCHEMA_VERSION_V1 = 1;
var NN_ASSIST_SCHEMA_VERSION_V2 = 2;
// 保留旧导出名，避免现有调用方受影响（默认仍指向 v1）。
var NN_ASSIST_SCHEMA_VERSION = NN_ASSIST_SCHEMA_VERSION_V1;

var assistNetworkV1 = null;
var assistNetworkV2 = null;

function validateSaveShape(save, exp) {
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

function expectedShapeForSchema(schema) {
	if (schema === NN_ASSIST_SCHEMA_VERSION_V2) {
		return [nnFeatures.FEATURE_DIM_V2, nnFeatures.NN_ASSIST_HIDDEN_V2[0], 1];
	}
	return [nnFeatures.FEATURE_DIM, nnFeatures.NN_ASSIST_HIDDEN[0], 1];
}

function pickPayloadFromRecords(data) {
	if (!data || !Array.isArray(data.records)) {
		return null;
	}
	for (var i = 0; i < data.records.length; i++) {
		var item = data.records[i];
		if (!item) {
			continue;
		}
		var schema = item.nnAssistSchemaVersion;
		var save = item.nnAssistWeights != null ? item.nnAssistWeights : item.weights;
		if ((schema === NN_ASSIST_SCHEMA_VERSION_V1 || schema === NN_ASSIST_SCHEMA_VERSION_V2) &&
			save && Array.isArray(save.neurons) && Array.isArray(save.weights)) {
			return item;
		}
	}
	return null;
}

function resolveTrainingPayload(data) {
	if (!data) {
		return null;
	}
	if (data.nnAssistSchemaVersion === NN_ASSIST_SCHEMA_VERSION_V1 ||
		data.nnAssistSchemaVersion === NN_ASSIST_SCHEMA_VERSION_V2) {
		return data;
	}
	return pickPayloadFromRecords(data);
}

function createNetwork(inputDim, hiddenList) {
	var ne = new Neuroevolution({
		network: [inputDim, hiddenList, 1],
		population: 1,
		elitism: 1,
		randomBehaviour: 0,
		mutationRate: 0,
		historic: 0
	});
	var nets = ne.nextGeneration();
	return nets[0];
}

function ensureNetworkV1() {
	if (!assistNetworkV1) {
		assistNetworkV1 = createNetwork(nnFeatures.FEATURE_DIM, nnFeatures.NN_ASSIST_HIDDEN);
	}
	return assistNetworkV1;
}

function ensureNetworkV2() {
	if (!assistNetworkV2) {
		assistNetworkV2 = createNetwork(nnFeatures.FEATURE_DIM_V2, nnFeatures.NN_ASSIST_HIDDEN_V2);
	}
	return assistNetworkV2;
}

/**
 * 若 data 含合法 nn 权重则 setSave；失败或未匹配则保持/回退到默认随机网（首次 compute 时创建）。
 * @return {boolean} 是否已成功应用文件中的权重
 */
function tryApplySavedWeights(data) {
	var payload = resolveTrainingPayload(data);
	if (!payload) {
		return false;
	}
	var schema = payload.nnAssistSchemaVersion;
	if (schema !== NN_ASSIST_SCHEMA_VERSION_V1 && schema !== NN_ASSIST_SCHEMA_VERSION_V2) {
		return false;
	}
	var save = payload.nnAssistWeights != null ? payload.nnAssistWeights : payload.weights;
	var exp = expectedShapeForSchema(schema);
	if (!validateSaveShape(save, exp)) {
		return false;
	}
	try {
		if (schema === NN_ASSIST_SCHEMA_VERSION_V2) {
			ensureNetworkV2().setSave(save);
		} else {
			ensureNetworkV1().setSave(save);
		}
		return true;
	} catch (e) {
		console.warn("[nnAssist] setSave failed", e && e.message ? e.message : e);
		if (schema === NN_ASSIST_SCHEMA_VERSION_V2) {
			assistNetworkV2 = null;
		} else {
			assistNetworkV1 = null;
		}
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

function computeAssist(features) {
	var net = ensureNetworkV1();
	var raw = net.compute(features);
	var v = raw && raw.length ? raw[0] : 0;
	return typeof v === "number" && !isNaN(v) ? v : 0;
}

function computeV2(features) {
	var net = ensureNetworkV2();
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
	window.__nnAssistSmokeV2 = function () {
		var gl = window.gameList;
		if (!gl) {
			return null;
		}
		var stones = 0;
		for (var i = 0; i < gl.length; i++) {
			for (var j = 0; j < gl[i].length; j++) {
				if (gl[i][j] != 0) stones++;
			}
		}
		var f2 = nnFeatures.buildFeaturesV2(gl, 7, 7, 1, {
			stonesOnBoard: stones,
			isMyTurn: 1
		});
		return computeV2(f2);
	};
}

module.exports = {
	NN_ASSIST_SCHEMA_VERSION: NN_ASSIST_SCHEMA_VERSION,
	NN_ASSIST_SCHEMA_VERSION_V1: NN_ASSIST_SCHEMA_VERSION_V1,
	NN_ASSIST_SCHEMA_VERSION_V2: NN_ASSIST_SCHEMA_VERSION_V2,
	computeAssist: computeAssist,
	computeV2: computeV2,
	tryApplySavedWeights: tryApplySavedWeights,
	preloadWeightsFromTrainingApi: preloadWeightsFromTrainingApi
};

