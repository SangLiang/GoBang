/**
 * Node 离线进化：NN 辅助网对局 ruleAi，适应度为胜/负/平均值。
 *
 * 环境变量：
 *   POPULATION（默认 12）
 *   GENERATIONS（默认 5）
 *   GAMES_PER_INDIVIDUAL（默认 4）局数越多，均值越稳定、排序越不靠运气
 *   NN_LAMBDA（默认 80）评估时混合系数；应与 config.js 中 NN_LAMBDA 保持一致
 *   DRAW_FITNESS（默认 -0.1）满盘和棋时的适应度
 *   WIN_SPEED_BONUS（默认 0.04）胜局越早结束额外奖励（上限）
 *   FITNESS_NOISE（默认 0.015）加在「场均 clean」上的噪声；宜明显小于常见胜-负差距，否则会淹没真实差异
 *   EVOLVE_POST_PORT 若设置（如 3847）则向 http://127.0.0.1:PORT/api/training POST 最优权重（会覆盖整文件，慎用）
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

// ===== 进化算法核心参数 =====

/** 每代种群大小：同时评估多少个不同权重组合
 *  越大搜索范围越广，但每代时间线性增加 */
var POPULATION = parseInt(process.env.POPULATION || "50", 10);

/** 进化代数：总共迭代多少代
 *  代数越多进化越充分，但收益递减 */
var GENERATIONS = parseInt(process.env.GENERATIONS || "30", 10);

/** 每个个体评估时的对局数：每套权重下多少盘棋
 *  越多均值越稳定、排序越不靠运气，但评估时间增加 */
var GAMES = parseInt(process.env.GAMES_PER_INDIVIDUAL || "5", 10);

/** NN混合系数 lambda：assist分乘以此系数后与规则分相加
 *  lambda * assist 构成最终混合分；越大NN影响越强
 *  注意：应与 config.js 中的 NN_LAMBDA 保持一致，确保进化评估与实际使用场景匹配 */
var LAMBDA = parseFloat(process.env.NN_LAMBDA || "80");
if (isNaN(LAMBDA)) {
	LAMBDA = 80;
}

/** 训练服务端口：若设置则自动POST最优权重到该端口
 *  例如 3847 会 POST 到 http://127.0.0.1:3847/api/training */
var POST_PORT = process.env.EVOLVE_POST_PORT;

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
	// Neuroevolution 配置：控制遗传算法的核心行为
	var ne = new Neuroevolution({
		// 网络结构：[输入层, 隐藏层, 输出层]
		// 本项目固定为 [6, [4], 1]：6维特征 -> 4个隐神经元 -> 1个assist输出
		network: [nnFeatures.FEATURE_DIM, nnFeatures.NN_ASSIST_HIDDEN, 1],

		// 每代种群大小：从环境变量读取，默认12
		// 越大搜索范围越广，但每代评估时间线性增加
		population: POPULATION,

		// 精英保留比例：前20%的个体原样复制到下一代
		// 保留优秀基因不丢失，但过高会减少多样性
		elitism: 0.2,

		// 随机注入比例：10%的个体使用最优结构但权重完全随机
		// 保持种群多样性，防止过早收敛到局部最优
		randomBehaviour: 0.1,

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
