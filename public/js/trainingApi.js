// 训练数据接口：负责将局后日志写入本地 Node API

var DEFAULT_API_BASE = "http://127.0.0.1:3847";

function getTrainingApiBase() {
	if (window.TRAINING_API_BASE && typeof window.TRAINING_API_BASE == "string") {
		return window.TRAINING_API_BASE;
	}
	return DEFAULT_API_BASE;
}

function fetchTrainingData() {
	var base = getTrainingApiBase();
	return fetch(base + "/api/training", {
		"method": "GET",
		"headers": {
			"Accept": "application/json"
		}
	}).then(function (res) {
		if (!res.ok) {
			throw new Error("fetch training failed: " + res.status);
		}
		return res.json();
	}).then(function (body) {
		if (!body || body.ok !== true) {
			throw new Error("fetch training: response not ok");
		}
		return body.data;
	}).catch(function (err) {
		console.warn("[trainingApi]", err && err.message ? err.message : err);
		return null;
	});
}

function appendTrainingLog(entry) {
	var base = getTrainingApiBase();
	return fetch(base + "/api/training/append", {
		"method": "PUT",
		"headers": {
			"Content-Type": "application/json"
		},
		"body": JSON.stringify({
			"entry": entry
		})
	}).then(function (res) {
		if (!res.ok) {
			throw new Error("append training log failed: " + res.status);
		}
		return res.json();
	}).catch(function (err) {
		// 训练服务是可选能力，失败不能阻断主流程
		console.warn("[trainingApi]", err && err.message ? err.message : err);
		return {
			"ok": false
		};
	});
}

function appendDebugLog(entry) {
	var base = getTrainingApiBase();
	return fetch(base + "/api/log/append", {
		"method": "PUT",
		"headers": {
			"Content-Type": "application/json"
		},
		"body": JSON.stringify({
			"entry": entry
		})
	}).then(function (res) {
		if (!res.ok) {
			throw new Error("append debug log failed: " + res.status);
		}
		return res.json();
	}).catch(function (err) {
		// 调试日志是可选能力，失败不阻断主流程
		console.warn("[trainingApi]", err && err.message ? err.message : err);
		return {
			"ok": false
		};
	});
}

function countStones(gameList) {
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

module.exports = {
	"getTrainingApiBase": getTrainingApiBase,
	"fetchTrainingData": fetchTrainingData,
	"appendTrainingLog": appendTrainingLog,
	"appendDebugLog": appendDebugLog,
	"countStones": countStones
};

