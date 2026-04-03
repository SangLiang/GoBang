/**
 * Node 离线进化：NN 辅助网对局，支持对手池防止过拟合（完整版）
 *
 * 本版本增强特性：
 * - 对手池（Opponent Pool）：维护多样化对手，防止钻漏洞
 * - 课程学习（Curriculum Learning）：逐步提升对手难度
 * - 对手采样策略：按强度概率采样，避免过拟合
 * 
 * 底部新增配置（config.js中可配置）：
 *   EVOLVE_USE_OPPONENT_POOL - 是否启用对手池（默认true）
 *   OPPONENT_POOL_SIZE - 池大小（默认8）
 *   OPPONENT_POOL_UPDATE_EVERY - 更新频率（默认5代）
 *   OPPONENT_POOL_SAMPLING_TEMP - 采样温度（默认0.5）
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

// **新增：对手池模块**
var OpponentPool = require("./opponentPool");

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

/** 训练服务端口 */
var POST_PORT = config.EVOLVE_POST_PORT;

/** 对手模式 - 新增：支持"pool"模式 */
var OPPONENT_MODE = (config.EVOLVE_OPPONENT || "rule").toLowerCase();
if (OPPONENT_MODE !== "rule" && OPPONENT_MODE !== "self" && OPPONENT_MODE !== "pool") {
	OPPONENT_MODE = "rule";
}

/** 混合模式 */
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

// **新增：对手池配置**
var USE_OPPONENT_POOL = String(config.EVOLVE_USE_OPPONENT_POOL !== false); // 默认启用

// ===== 适应度计算参数 =====

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

/**
 * **增强版评估函数：支持对手池采样**
 */
function evaluateNetworkClean(net, context, debug) {
	var pickNn = nnAssistPick.makePicker(net, LAMBDA);
	var ruleOpponentPick = ruleAi.pickMove;
	var selfOpponentPick = context && context.selfOpponentPick ? context.selfOpponentPick : null;
	var opponentPool = context && context.opponentPool ? context.opponentPool : null;
	
	var sum = 0;
	var playingBlack;
	var wins = 0;
	var losses = 0;

	for (var g = 0; g < GAMES; g++) {
		var opponentPick;
		
		// **核心逻辑：对手选择**
		if (USE_OPPONENT_POOL && opponentPool) {
			// **策略1：对手池采样** - 多样化对手，防止过拟合
			var opponentInfo = opponentPool.sampleOpponent(context.generation);
			opponentPick = opponentInfo.pickFn;
			if (debug) console.log("[debug] 对手:", opponentInfo.name);
		} else if (MIXED_MODE && selfOpponentPick) {
			// **策略2：混合模式** - RuleAI和Self-play交替
			opponentPick = Math.random() < MIXED_RATIO ? ruleOpponentPick : selfOpponentPick;
		} else if (OPPONENT_MODE === "pool" && opponentPool) {
			// **兼容旧配置：OPPONENT_MODE=pool**
			var poolInfo = opponentPool.sampleOpponent(context.generation);
			opponentPick = poolInfo.pickFn;
		} else if (OPPONENT_MODE === "self") {
			// **策略3：自对弈** - 固定对手
			opponentPick = selfOpponentPick || ruleOpponentPick;
		} else {
			// **策略4：规则AI** - 基础对手
			opponentPick = ruleOpponentPick;
		}
		
		// 确定执黑/执白
		playingBlack = Math.random() < PLAY_BLACK_RATIO;
		
		var r = playingBlack ? 
			playout.playOneGame(pickNn, opponentPick) : 
			playout.playOneGame(opponentPick, pickNn);
		
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
	console.log("=".repeat(60));
	console.log("神经进化训练 - 增强版（对手池防过拟合）");
	console.log("=".repeat(60));
	
	var seedSave = loadSeedSave(SEED_FILE);
	
	// 加载自对弈对手
	var opponentSave = null;
	if (OPPONENT_MODE === "self" || MIXED_MODE) {
		opponentSave = loadSeedSave(OPPONENT_FILE);
		if (opponentSave) {
			console.log("[evolve-ai] 自对弈对手加载成功:", OPPONENT_FILE, 
				PLAY_BLACK_RATIO === 0 ? "(固定黑方)" : "(固定白方)");
		} else {
			console.warn("[evolve-ai] 自对弈对手文件未找到:", OPPONENT_FILE);
			opponentSave = seedSave;
		}
	}

	// **新增：初始化对手池**
	var opponentPool = null;
	if (USE_OPPONENT_POOL || OPPONENT_MODE === "pool") {
		opponentPool = new OpponentPool();
		
		// 从配置初始化种子对手
		// 可以配置历史权重文件作为初始对手
		try {
			var dataDir = path.join(__dirname, "..", "data", "evolved");
			if (fs.existsSync(dataDir)) {
				var files = fs.readdirSync(dataDir)
					.filter(f => f.endsWith(".json"))
					.slice(-5) // 最近5个
					.map(f => ({
						path: path.join(dataDir, f),
						id: f.replace(".json", ""),
						name: "历史权重: " + f,
						description: "来自" + f + "的权重"
					}));
				
				opponentPool.initialize(files);
			} else {
				opponentPool.initialize();
			}
		} catch (e) {
			console.warn("[evolve-ai] 初始化对手池失败:", e.message);
			opponentPool.initialize();
		}
		
		console.log("[evolve-ai] 对手池模式已启用");
	} else {
		console.log("[evolve-ai] 使用传统对手模式:", OPPONENT_MODE);
	}

	var ne = new Neuroevolution({
		network: [nnFeatures.FEATURE_DIM_V2, nnFeatures.NN_ASSIST_HIDDEN_V2, 1],
		population: POPULATION,
		elitism: 0.2,
		randomBehaviour: (OPPONENT_MODE === "self" || MIXED_MODE || USE_OPPONENT_POOL) ? 0 : 0.1,
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
	var selfOpponentNet = null;
	var selfOpponentPick = null;

	if (OPPONENT_MODE === "self" || MIXED_MODE) {
		selfOpponentNet = makeNetworkFromSave(opponentSave || seedSave);
		selfOpponentPick = nnAssistPick.makePicker(selfOpponentNet, LAMBDA);
	}

	// 打印训练配置
	console.log("[evolve-ai] POPULATION=%d GENERATIONS=%d GAMES=%d LAMBDA=%s",
		POPULATION, GENERATIONS, GAMES, String(LAMBDA));
	console.log("[evolve-ai] PLAY_BLACK_RATIO=%d%% (按比例随机执黑/执白)", 
		Math.round(PLAY_BLACK_RATIO * 100));
	if (USE_OPPONENT_POOL || OPPONENT_MODE === "pool") {
		console.log("[evolve-ai] OPPONENT_MODE=pool (对手池)")
	} else if (MIXED_MODE) {
		console.log("[evolve-ai] OPPONENT_MODE=mixed (rule:%d%% self:%d%%)", 
			Math.round(MIXED_RATIO * 100), Math.round((1 - MIXED_RATIO) * 100));
	} else {
		console.log("[evolve-ai] OPPONENT_MODE=%s", OPPONENT_MODE);
	}
	console.log("[evolve-ai] DRAW_FITNESS=%s WIN_SPEED_BONUS=%s FITNESS_NOISE=%s",
		String(DRAW_FITNESS), String(WIN_SPEED_BONUS), String(FITNESS_NOISE));

	// 主训练循环
	for (gen = 0; gen < GENERATIONS; gen++) {
		nets = ne.nextGeneration();
		
		// 首代种子
		if (gen === 0 && seedSave) {
			var seedCount = (OPPONENT_MODE === "self" || MIXED_MODE || USE_OPPONENT_POOL) 
				? nets.length
				: Math.max(1, Math.floor(nets.length * SEED_RATIO));
			for (i = 0; i < seedCount; i++) {
				try {
					nets[i].setSave(mutateSaveFromSeed(seedSave, SEED_MUT_RANGE));
				} catch (e) {
					console.warn("[evolve-ai] 应用种子失败:", i, e.message);
				}
			}
			console.log("[evolve-ai] 首代种子化:", seedCount, "/", nets.length, 
				"扰动幅度=", SEED_MUT_RANGE);
		}
		
		var bestThisNoisy = -Infinity;
		var bestThisClean = -Infinity;
		var cleans = [];
		var evalContext = {
			opponentMode: OPPONENT_MODE,
			selfOpponentPick: selfOpponentPick,
			opponentPool: opponentPool,
			generation: gen
		};
		
		// 评估这一代所有个体
		for (i = 0; i < nets.length; i++) {
			var debug = (gen === 0 && i < 3);
			if (debug) console.log("[debug] 评估个体#" + i);
			
			var ev = evaluateNetworkNoisy(nets[i], evalContext, debug);
			ne.networkScore(nets[i], ev.noisy);
			cleans.push(ev.clean);
			
			if (ev.noisy > bestThisNoisy) bestThisNoisy = ev.noisy;
			if (ev.clean > bestThisClean) bestThisClean = ev.clean;
			if (ev.clean > bestEver) {
				bestEver = ev.clean;
				bestSave = nets[i].getSave();
			}
		}
		
		// 统计信息
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
		}
		
		// **新增：更新对手池**
		if (opponentPool && (gen + 1) % 5 === 0) {
			var currentBestFile = {
				path: path.join(__dirname, "..", "data", "temp-best.json"),
				id: "gen" + gen + "-best",
				name: "第" + gen + "代最优",
				description: "第" + gen + "代训练的最优权重"
			};
			// 临时保存当前最优
			fs.writeFileSync(currentBestFile.path, JSON.stringify({
				nnAssistWeights: bestSave,
				epoch: gen
			}));
			
			opponentPool.updatePool(gen, currentBestFile);
			
			// 打印池状态
			var status = opponentPool.getStatus(gen);
			console.log("[OpponentPool] 状态:", JSON.stringify(status, null, 2));
			
			// 清理临时文件
			try { fs.unlinkSync(currentBestFile.path); } catch (e) {}
		}
	}

	// 检查是否提升
	if (GENERATIONS > 1 && bestCleanAfterGen0 !== null &&
		bestEver - bestCleanAfterGen0 < 1e-5) {
		console.log("[evolve-ai] ⚠️  警告: bestCleanEver 较第0代几乎无提升！");
		console.log("[evolve-ai] 建议: 增加GAMES_PER_INDIVIDUAL、调大NN_LAMBDA、或检查对手池配置");
	}

	if (!bestSave) {
		console.error("[evolve-ai] 错误: 未找到最优权重");
		process.exit(1);
	}

	// 保存结果
	var outDir = path.join(__dirname, "..", "data", "evolved");
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
		bestFitnessNote: "clean mean (无噪声); 胜=1+速度奖励, 负=-1, 和=DRAW_FITNESS",
		generations: GENERATIONS,
		population: POPULATION,
		opponentMode: USE_OPPONENT_POOL ? "pool" : OPPONENT_MODE,
		gamesPerIndividual: GAMES
	};
	
	fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
	console.log("[evolve-ai] ✅ 保存最优权重:", filePath);
	console.log("[evolve-ai]    适应度:", bestEver.toFixed(4));

	// POST到训练服务器
	if (POST_PORT) {
		postTrainingJson(parseInt(POST_PORT, 10), payload, function (err, resBody) {
			if (err) {
				console.warn("[evolve-ai] POST失败:", err.message);
			} else {
				console.log("[evolve-ai] POST /api/training 成功:", resBody);
			}
		});
	}
}

main();
