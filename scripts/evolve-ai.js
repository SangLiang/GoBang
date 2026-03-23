/**
 * Node 离线进化：NN 辅助网对局 ruleAi，适应度为胜/负/平均值。
 *
 * 环境变量：
 *   POPULATION（默认 12）
 *   GENERATIONS（默认 5）
 *   GAMES_PER_INDIVIDUAL（默认 4）局数越多，均值越稳定、排序越不靠运气
 *   NN_LAMBDA（默认 0.08）评估时混合系数
 *   DRAW_FITNESS（默认 -0.1）满盘和棋时的适应度
 *   WIN_SPEED_BONUS（默认 0.04）胜局越早结束额外奖励（上限）
 *   FITNESS_NOISE（默认 0.015）加在「场均 clean」上的噪声；宜明显小于常见胜-负差距，否则会淹没真实差异
 *   EVOLVE_POST_PORT 若设置（如 3847）则向 http://127.0.0.1:PORT/api/training POST 最优权重（会覆盖整文件，慎用）
 */

"use strict";

var fs = require("fs");
var path = require("path");
var http = require("http");

var Neuroevolution = require("./vendor/Neuroevolution");
var ruleAi = require("./ruleAi");
var playout = require("./playout");
var nnAssistPick = require("./nnAssistPick");

var POPULATION = parseInt(process.env.POPULATION || "12", 10);
var GENERATIONS = parseInt(process.env.GENERATIONS || "5", 10);
var GAMES = parseInt(process.env.GAMES_PER_INDIVIDUAL || "4", 10);
var LAMBDA = parseFloat(process.env.NN_LAMBDA || "0.08");
if (isNaN(LAMBDA)) {
	LAMBDA = 0.08;
}
var POST_PORT = process.env.EVOLVE_POST_PORT;

var DRAW_FITNESS = parseFloat(process.env.DRAW_FITNESS || "-0.1");
if (isNaN(DRAW_FITNESS)) {
	DRAW_FITNESS = -0.1;
}
var WIN_SPEED_BONUS = parseFloat(process.env.WIN_SPEED_BONUS || "0.04");
if (isNaN(WIN_SPEED_BONUS)) {
	WIN_SPEED_BONUS = 0.04;
}
var FITNESS_NOISE = parseFloat(process.env.FITNESS_NOISE || "0.015");
if (isNaN(FITNESS_NOISE)) {
	FITNESS_NOISE = 0.015;
}

var FITNESS_OPTS = {
	drawFitness: DRAW_FITNESS,
	winSpeedBonus: WIN_SPEED_BONUS
};

var FEATURE_IN = 6;
var HIDDEN = [4];
var OUT = 1;

function evaluateNetworkClean(net) {
	var pickNn = nnAssistPick.makePicker(net, LAMBDA);
	var sum = 0;
	var g;
	var r;
	var playingBlack;

	for (g = 0; g < GAMES; g++) {
		playingBlack = g % 2 === 0;
		if (playingBlack) {
			r = playout.playOneGame(pickNn, ruleAi.pickMove);
		} else {
			r = playout.playOneGame(ruleAi.pickMove, pickNn);
		}
		sum += playout.fitnessFromResult(r.winner, playingBlack, r.moves, FITNESS_OPTS);
	}
	return sum / GAMES;
}

function evaluateNetworkNoisy(net) {
	var clean = evaluateNetworkClean(net);
	var noisy = clean + (Math.random() - 0.5) * FITNESS_NOISE;
	return { clean: clean, noisy: noisy };
}

function medianSorted(arr) {
	if (arr.length === 0) {
		return NaN;
	}
	var s = arr.slice().sort(function (a, b) {
		return a - b;
	});
	var m = Math.floor(s.length / 2);
	if (s.length % 2 === 1) {
		return s[m];
	}
	return (s[m - 1] + s[m]) / 2;
}

/** 粗略说明场均 clean（无和棋、无速度加成时：胜=1 负=-1） */
function describeCleanMean(mean, games, drawFitness) {
	if (games <= 0) {
		return "";
	}
	if (Math.abs(mean - drawFitness) < 1e-6) {
		return "≈全和棋";
	}
	var onlyWL = (mean >= -1 - 1e-6 && mean <= 1 + 1e-6);
	if (onlyWL && games === 2 && mean > -0.2 && mean < 0.2) {
		return "2 局时≈0.01 多为 1 胜 1 负";
	}
	var estDelta = mean * games;
	if (onlyWL && Math.abs(estDelta - Math.round(estDelta)) < 0.15) {
		var k = Math.round(estDelta);
		return "净胜局约 " + k + " / " + games + "（仅胜/负粗估）";
	}
	return "胜/负/和混合";
}

function postTrainingJson(port, payload, callback) {
	var body = JSON.stringify(payload);
	var req = http.request(
		{
			hostname: "127.0.0.1",
			port: port,
			path: "/api/training",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(body)
			}
		},
		function (res) {
			var chunks = [];
			res.on("data", function (c) {
				chunks.push(c);
			});
			res.on("end", function () {
				callback(null, Buffer.concat(chunks).toString());
			});
		}
	);
	req.on("error", function (e) {
		callback(e);
	});
	req.write(body);
	req.end();
}

function main() {
	var ne = new Neuroevolution({
		network: [FEATURE_IN, HIDDEN, OUT],
		population: POPULATION,
		elitism: 0.2,
		randomBehaviour: 0.1,
		mutationRate: 0.15,
		mutationRange: 0.5,
		historic: 0,
		scoreSort: -1
	});

	var gen;
	var nets;
	var i;
	var bestEver = -Infinity;
	var bestSave = null;
	var bestCleanAfterGen0 = null;

	console.log("[evolve-ai] POPULATION=%d GENERATIONS=%d GAMES_PER_INDIVIDUAL=%d LAMBDA=%s",
		POPULATION, GENERATIONS, GAMES, String(LAMBDA));
	console.log("[evolve-ai] DRAW_FITNESS=%s WIN_SPEED_BONUS=%s FITNESS_NOISE=%s",
		String(DRAW_FITNESS), String(WIN_SPEED_BONUS), String(FITNESS_NOISE));
	console.log("[evolve-ai] clean=场均适应度（胜≈1+、负=-1、和=DRAW_FITNESS）；排序用 clean+小幅噪声。");

	for (gen = 0; gen < GENERATIONS; gen++) {
		nets = ne.nextGeneration();
		var bestThisNoisy = -Infinity;
		var bestThisClean = -Infinity;
		var cleans = [];
		for (i = 0; i < nets.length; i++) {
			var ev = evaluateNetworkNoisy(nets[i]);
			ne.networkScore(nets[i], ev.noisy);
			cleans.push(ev.clean);
			if (ev.noisy > bestThisNoisy) {
				bestThisNoisy = ev.noisy;
			}
			if (ev.clean > bestThisClean) {
				bestThisClean = ev.clean;
			}
			if (ev.clean > bestEver) {
				bestEver = ev.clean;
				bestSave = nets[i].getSave();
			}
		}
		var minC = Math.min.apply(null, cleans);
		var maxC = Math.max.apply(null, cleans);
		var medC = medianSorted(cleans);
		console.log("[evolve-ai] generation", gen,
			"bestNoisy", bestThisNoisy.toFixed(4),
			"bestClean", bestThisClean.toFixed(4),
			"bestCleanEver", bestEver.toFixed(4),
			"| clean[min med max]", minC.toFixed(4), medC.toFixed(4), maxC.toFixed(4));
		if (gen === 0) {
			bestCleanAfterGen0 = bestEver;
			console.log("[evolve-ai] 解读 bestClean:", describeCleanMean(bestThisClean, GAMES, DRAW_FITNESS));
		}
	}

	if (GENERATIONS > 1 && bestCleanAfterGen0 !== null &&
			bestEver - bestCleanAfterGen0 < 1e-5) {
		console.log("[evolve-ai] 提示: bestCleanEver 较第 0 代几乎无提升。可试 GAMES_PER_INDIVIDUAL=6～8、NN_LAMBDA=0.12、GENERATIONS 增大，或略调 mutationRate。");
	}

	if (!bestSave) {
		console.error("[evolve-ai] no best save");
		process.exit(1);
	}

	var outDir = path.join(__dirname, "..", "data");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}
	var stamp = new Date().toISOString().replace(/[:.]/g, "-");
	var filePath = path.join(outDir, "evolved-" + stamp + ".json");
	var payload = {
		nnAssistSchemaVersion: 1,
		nnAssistWeights: bestSave,
		evolvedAt: new Date().toISOString(),
		bestFitness: bestEver,
		bestFitnessNote: "clean mean (no noise); win=1+speed, loss=-1, draw=DRAW_FITNESS",
		generations: GENERATIONS,
		population: POPULATION
	};
	fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
	console.log("[evolve-ai] wrote", filePath);

	if (POST_PORT) {
		postTrainingJson(parseInt(POST_PORT, 10), payload, function (err, resBody) {
			if (err) {
				console.warn("[evolve-ai] POST failed", err.message);
			} else {
				console.log("[evolve-ai] POST /api/training", resBody);
			}
		});
	} else {
		console.log("[evolve-ai] 未设置 EVOLVE_POST_PORT，未 POST。可将 evolved JSON 中的 nnAssistWeights 合并进 ai-training.json 供前端 GET 加载。");
	}
}

main();
