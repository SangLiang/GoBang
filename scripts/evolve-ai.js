/**
 * Node 离线进化：NN 辅助网对局 ruleAi，适应度为胜/负/平均值。
 *
 * 所有配置统一从 config.js 读取，不支持环境变量覆盖。
 *
 * 可在 config.js 中配置：
 *   EVOLVE_POPULATION, EVOLVE_GENERATIONS, EVOLVE_GAMES_PER_INDIVIDUAL
 *   EVOLVE_PLAY_BLACK_RATIO, EVOLVE_OPPONENT, EVOLVE_MIXED, EVOLVE_MIXED_RATIO
 *   EVOLVE_SEED_FILE, EVOLVE_SEED_RATIO, EVOLVE_SEED_MUTATION_RANGE
 *   EVOLVE_OPPONENT_BLACK_FILE, EVOLVE_OPPONENT_WHITE_FILE
 *   NN_LAMBDA, DRAW_FITNESS, WIN_SPEED_BONUS, FITNESS_NOISE
 */

"use strict";

var fs = require("fs");
var http = require("http");

var path = require("path");
var Neuroevolution = require("./vendor/Neuroevolution");
var ruleAi = require("./ruleAi");
var playout = require("./playout");
var nnAssistPick = require("./nnAssistPick");
var nnFeatures = require(path.join(__dirname, "..", "public", "js", "nnFeatures.js"));

// ===== 所有配置统一从 config.js 读取 =====

var config = require(path.join(__dirname, "..", "config.js"));

// ===== 进化算法核心参数 =====

/** 每代种群大小 */
var POPULATION = parseInt(config.EVOLVE_POPULATION || "50", 10);

/** 进化代数 */
var GENERATIONS = parseInt(config.EVOLVE_GENERATIONS || "30", 10);

/** 每个个体评估时的对局数 */
var GAMES = parseInt(config.EVOLVE_GAMES_PER_INDIVIDUAL || "6", 10);

/** NN AI 执黑的比例（0~1）*/
var PLAY_BLACK_RATIO = parseFloat(config.EVOLVE_PLAY_BLACK_RATIO !== undefined ? config.EVOLVE_PLAY_BLACK_RATIO : "0.5");
if (isNaN(PLAY_BLACK_RATIO) || PLAY_BLACK_RATIO < 0) {
	PLAY_BLACK_RATIO = 0.5;
}
if (PLAY_BLACK_RATIO > 1) {
	PLAY_BLACK_RATIO = 1;
}

/** v2 评分放大系数 lambda：weight = lambda * score */
var LAMBDA = parseFloat(config.NN_LAMBDA || "1000");
if (isNaN(LAMBDA)) {
	LAMBDA = 1000;
}

/** 训练服务端口：若设置则自动POST最优权重到该端口 */
var POST_PORT = config.EVOLVE_POST_PORT;

/** 对手模式："self"=自对弈, "rule"=Rule AI */
var OPPONENT_MODE = (config.EVOLVE_OPPONENT || "rule").toLowerCase();
if (OPPONENT_MODE !== "rule" && OPPONENT_MODE !== "self") {
	OPPONENT_MODE = "rule";
}

/** 混合模式：每局随机选择对手（rule 或 self）*/
var MIXED_MODE = String(config.EVOLVE_MIXED || "0") === "1";
var MIXED_RATIO = parseFloat(config.EVOLVE_MIXED_RATIO || "0.5");
if (isNaN(MIXED_RATIO) || MIXED_RATIO < 0) {
	MIXED_RATIO = 0.5;
}
if (MIXED_RATIO > 1) {
	MIXED_RATIO = 1;
}

/** 种子文件路径 */
var SEED_FILE = config.EVOLVE_SEED_FILE || "";

/** 是否允许无种子冷启动 */
var ALLOW_SELF_NO_SEED = config.EVOLVE_ALLOW_SELF_NO_SEED === true;

/** 对手权重文件 */
var OPPONENT_BLACK_FILE = config.EVOLVE_OPPONENT_BLACK_FILE || "data/opponent-black.json";
var OPPONENT_WHITE_FILE = config.EVOLVE_OPPONENT_WHITE_FILE || "data/opponent-white.json";
var OPPONENT_FILE = PLAY_BLACK_RATIO === 0 ? OPPONENT_BLACK_FILE : OPPONENT_WHITE_FILE;

/** 首代种子占比 */
var SEED_RATIO = parseFloat(config.EVOLVE_SEED_RATIO || "0.8");
if (isNaN(SEED_RATIO)) {
	SEED_RATIO = 0.8;
}
if (SEED_RATIO < 0) {
	SEED_RATIO = 0;
}
if (SEED_RATIO > 1) {
	SEED_RATIO = 1;
}

/** 种子扰动幅度 */
var SEED_MUT_RANGE = parseFloat(config.EVOLVE_SEED_MUTATION_RANGE || "0.2");
if (isNaN(SEED_MUT_RANGE) || SEED_MUT_RANGE < 0) {
	SEED_MUT_RANGE = 0.2;
}

// ===== 适应度计算参数 =====

/** 和棋适应度：满盘和棋时给的适应度值
 *  应介于胜负之间（-1 ~ 1），默认略负激励争胜 */
var DRAW_FITNESS = parseFloat(process.env.DRAW_FITNESS || "-0.1");
if (isNaN(DRAW_FITNESS)) {
	DRAW_FITNESS = -0.1;
}

/** 速胜奖励上限：胜局越早结束额外奖励的上限
 *  实际奖励 = min(速胜奖励, WIN_SPEED_BONUS)，激励快速取胜 */
var WIN_SPEED_BONUS = parseFloat(process.env.WIN_SPEED_BONUS || "0.04");
if (isNaN(WIN_SPEED_BONUS)) {
	WIN_SPEED_BONUS = 0.04;
}

/** 适应度噪声：加在场均适应度上的随机扰动范围
 *  噪声 = (random-0.5) * NOISE；宜小于胜-负差距(2.0)，避免淹没真实差异 */
var FITNESS_NOISE = parseFloat(process.env.FITNESS_NOISE || "0.015");
if (isNaN(FITNESS_NOISE)) {
	FITNESS_NOISE = 0.015;
}

var FITNESS_OPTS = {
	drawFitness: DRAW_FITNESS,
	winSpeedBonus: WIN_SPEED_BONUS
};

function makeNetworkFromSave(save) {
	var ne = new Neuroevolution({
		network: [nnFeatures.FEATURE_DIM_V2, nnFeatures.NN_ASSIST_HIDDEN_V2, 1],
		population: 1,
		elitism: 1,
		randomBehaviour: 0,
		mutationRate: 0,
		historic: 0
	});
	var n = ne.nextGeneration()[0];
	if (save) {
		n.setSave(save);
	}
	return n;
}

function evaluateNetworkClean(net, context, debug) {
	var pickNn = nnAssistPick.makePicker(net, LAMBDA);
	var ruleOpponentPick = ruleAi.pickMove;
	var selfOpponentPick = context && context.selfOpponentPick ? context.selfOpponentPick : null;
	
	var sum = 0;
	var g;
	var r;
	var playingBlack;
	var wins = 0;
	var losses = 0;

	for (g = 0; g < GAMES; g++) {
		// 混合模式：每局随机选择对手
		var opponentPick;
		if (MIXED_MODE && selfOpponentPick) {
			// 按比例选择对手：MIXED_RATIO 概率选择 Rule AI，否则选择自对弈
			opponentPick = Math.random() < MIXED_RATIO ? ruleOpponentPick : selfOpponentPick;
		} else if (context && context.opponentMode === "self") {
			opponentPick = selfOpponentPick;
		} else {
			opponentPick = ruleOpponentPick;
		}
		
		// 确定执黑/执白：按比例随机
		playingBlack = Math.random() < PLAY_BLACK_RATIO;
		
		if (playingBlack) {
			r = playout.playOneGame(pickNn, opponentPick);
		} else {
			r = playout.playOneGame(opponentPick, pickNn);
		}
		sum += playout.fitnessFromResult(r.winner, playingBlack, r.moves, FITNESS_OPTS);
		
		if (debug) {
			var isWin = (!playingBlack && r.winner === "white") || (playingBlack && r.winner === "black");
			var isLoss = (!playingBlack && r.winner === "black") || (playingBlack && r.winner === "white");
			if (isWin) wins++;
			if (isLoss) losses++;
		}
	}
	
	if (debug) {
		console.log("[debug] 适应度=" + (sum/GAMES).toFixed(4) + ", 胜=" + wins + ", 负=" + losses + ", 和=" + (GAMES-wins-losses));
	}
	
	return sum / GAMES;
}

function evaluateNetworkNoisy(net, context, debug) {
	var clean = evaluateNetworkClean(net, context, debug);
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

function validateSeedSave(save) {
	if (!save || !Array.isArray(save.neurons) || !Array.isArray(save.weights)) {
		return false;
	}
	return save.neurons.length === 3 &&
		save.neurons[0] === nnFeatures.FEATURE_DIM_V2 &&
		save.neurons[1] === nnFeatures.NN_ASSIST_HIDDEN_V2[0] &&
		save.neurons[2] === 1;
}

function resolveSeedSave(raw) {
	if (!raw) {
		return null;
	}
	if (raw.nnAssistWeights && validateSeedSave(raw.nnAssistWeights)) {
		return raw.nnAssistWeights;
	}
	if (raw.nnAssistSchemaVersion === 2 && raw.weights && validateSeedSave(raw.weights)) {
		return raw.weights;
	}
	if (Array.isArray(raw.records)) {
		for (var i = 0; i < raw.records.length; i++) {
			var item = raw.records[i];
			if (item && item.nnAssistWeights && validateSeedSave(item.nnAssistWeights)) {
				return item.nnAssistWeights;
			}
		}
	}
	return null;
}

function loadSeedSave(seedPath) {
	if (!seedPath) {
		return null;
	}
	// 使用 process.cwd() 作为项目根目录，确保路径正确
	var projectRoot = path.resolve(__dirname, "..");
	var resolvedPath = path.isAbsolute(seedPath) ? seedPath : path.join(projectRoot, seedPath);
	if (!fs.existsSync(resolvedPath)) {
		console.warn("[evolve-ai] seed file not found:", resolvedPath);
		return null;
	}
	try {
		var raw = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
		var save = resolveSeedSave(raw);
		if (!save) {
			console.warn("[evolve-ai] seed file has no valid v2 save:", resolvedPath);
			return null;
		}
		console.log("[evolve-ai] seed loaded:", resolvedPath);
		return save;
	} catch (e) {
		console.warn("[evolve-ai] load seed failed:", e.message);
		return null;
	}
}

function mutateSaveFromSeed(seedSave, range) {
	var out = {
		neurons: seedSave.neurons.slice(),
		weights: []
	};
	for (var i = 0; i < seedSave.weights.length; i++) {
		var w = seedSave.weights[i];
		var delta = (Math.random() * 2 - 1) * range;
		out.weights.push(w + delta);
	}
	return out;
}

function main() {
	var seedSave = loadSeedSave(SEED_FILE);
	
	// 自对弈模式下，加载对手权重文件
	var opponentSave = null;
	if (OPPONENT_MODE === "self") {
		opponentSave = loadSeedSave(OPPONENT_FILE);
		if (opponentSave) {
			console.log("[evolve-ai] opponent loaded:", OPPONENT_FILE, 
				PLAY_BLACK_RATIO === 0 ? "(固定黑方)" : "(固定白方)");
		} else {
			console.warn("[evolve-ai] opponent file not found, using seed:", OPPONENT_FILE);
			opponentSave = seedSave;
		}
	}

	// 混合模式需要种子文件
	if (MIXED_MODE && !seedSave) {
		console.error("[evolve-ai] 混合模式要求提供种子：请设置 EVOLVE_SEED_FILE。");
		process.exit(1);
	}
	if (OPPONENT_MODE === "self" && !seedSave && !opponentSave && !ALLOW_SELF_NO_SEED) {
		console.error("[evolve-ai] self 模式要求提供强种子：请设置 EVOLVE_SEED_FILE 或创建对手文件。");
		process.exit(1);
	}
	if (OPPONENT_MODE === "self" && !seedSave && !opponentSave && ALLOW_SELF_NO_SEED) {
		console.warn("[evolve-ai] self 冷启动：未提供种子，将以随机网络开始自对弈。");
	}

	// Neuroevolution 配置：控制遗传算法的核心行为
	var ne = new Neuroevolution({
		// 网络结构：[输入层, 隐藏层, 输出层]
		// v2 结构：[22, [32], 1]：22维局部特征 -> 32隐层 -> 1个候选点评分
		network: [nnFeatures.FEATURE_DIM_V2, nnFeatures.NN_ASSIST_HIDDEN_V2, 1],

		// 每代种群大小：从环境变量读取，默认12
		// 越大搜索范围越广，但每代评估时间线性增加
		population: POPULATION,

		// 精英保留比例：前20%的个体原样复制到下一代
		// 保留优秀基因不丢失，但过高会减少多样性
		elitism: 0.2,

		// 随机注入比例：self/混合模式禁用随机网络，其他模式保留10%
		// 保持种群多样性，防止过早收敛到局部最优
		randomBehaviour: (OPPONENT_MODE === "self" || MIXED_MODE) ? 0 : 0.1,

		// 变异概率：繁殖时每个权重有15%概率发生变异
		// 在继承的基础上引入微小扰动，探索邻近区域
		mutationRate: 0.15,

		// 变异范围：变异时权重变化幅度 [-0.5, 0.5] 之间
		// 越大跳跃越远，过小则探索能力不足
		mutationRange: 0.5,

		// 历史保留代数量：0表示不保留历史代数据
		// 本项目只关心当前代，不需要回溯
		historic: 0,

		// 排序方向：-1表示降序（适应度越大越好）
		// 因为我们的适应度是赢棋得分，越大越好
		scoreSort: -1
	});

	var gen;
	var nets;
	var i;
	var bestEver = -Infinity;
	var bestSave = null;
	var bestCleanAfterGen0 = null;
	var selfOpponentNet = null;
	var selfOpponentPick = null;

	// 初始化自对弈对手（混合模式或self模式都需要）
	if (OPPONENT_MODE === "self" || MIXED_MODE) {
		selfOpponentNet = makeNetworkFromSave(opponentSave || seedSave);
		selfOpponentPick = nnAssistPick.makePicker(selfOpponentNet, LAMBDA);
	}

	console.log("[evolve-ai] POPULATION=%d GENERATIONS=%d GAMES=%d LAMBDA=%s",
		POPULATION, GENERATIONS, GAMES, String(LAMBDA));
	console.log("[evolve-ai] PLAY_BLACK_RATIO=%d%% (按比例随机执黑/执白)", 
		Math.round(PLAY_BLACK_RATIO * 100));
	if (MIXED_MODE) {
		console.log("[evolve-ai] OPPONENT_MODE=mixed (rule:%d%% self:%d%%)", 
			Math.round(MIXED_RATIO * 100), Math.round((1 - MIXED_RATIO) * 100));
	} else {
		console.log("[evolve-ai] OPPONENT_MODE=%s", OPPONENT_MODE);
	}
	console.log("[evolve-ai] DRAW_FITNESS=%s WIN_SPEED_BONUS=%s FITNESS_NOISE=%s",
		String(DRAW_FITNESS), String(WIN_SPEED_BONUS), String(FITNESS_NOISE));
	console.log("[evolve-ai] clean=场均适应度（胜≈1+、负=-1、和=DRAW_FITNESS）；排序用 clean+小幅噪声。");

	for (gen = 0; gen < GENERATIONS; gen++) {
		nets = ne.nextGeneration();
		if (gen === 0 && seedSave) {
			var seedCount = (OPPONENT_MODE === "self" || MIXED_MODE)
				? nets.length
				: Math.max(1, Math.floor(nets.length * SEED_RATIO));
			for (i = 0; i < seedCount; i++) {
				try {
					nets[i].setSave(mutateSaveFromSeed(seedSave, SEED_MUT_RANGE));
				} catch (e) {
					console.warn("[evolve-ai] apply seed failed on net", i, e.message);
				}
			}
			console.log("[evolve-ai] seeded first generation:", seedCount, "/", nets.length,
				"range=", SEED_MUT_RANGE);
		}
		var bestThisNoisy = -Infinity;
		var bestThisClean = -Infinity;
		var cleans = [];
		var evalContext = {
			opponentMode: OPPONENT_MODE,
			selfOpponentPick: selfOpponentPick
		};
		for (i = 0; i < nets.length; i++) {
			var debug = (gen === 0 && i < 5); // 第0代前5个个体启用debug
			if (debug) console.log("[debug] 评估个体#" + i);
			var ev = evaluateNetworkNoisy(nets[i], evalContext, debug);
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
		// 固定黑方对手为种子权重，只让白方（NN AI）进化学习防守
	// 注意：selfOpponentNet 在 main() 中已经用 seedSave 初始化，这里不更新
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
			console.log("[evolve-ai] 提示: bestCleanEver 较第 0 代几乎无提升。可试 GAMES_PER_INDIVIDUAL=6~8、NN_LAMBDA=500/1000/1500、GENERATIONS 增大，或略调 mutationRate。");
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
		nnAssistSchemaVersion: 2,
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
