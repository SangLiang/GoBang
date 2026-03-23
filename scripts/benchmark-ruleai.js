"use strict";

/**
 * M3-T2-b：双规则 AI 对弈统计（平均手数、是否死循环由步数上限隐含）。
 */

var ruleAi = require("./ruleAi");
var playout = require("./playout");

var N = parseInt(process.env.BENCHMARK_GAMES || "100", 10);
var totalMoves = 0;
var i;
var r;

for (i = 0; i < N; i++) {
	r = playout.playOneGame(ruleAi.pickMove, ruleAi.pickMove);
	totalMoves += r.moves;
}

console.log("[benchmark-ruleai] games=%d avgMoves=%s", N, (totalMoves / N).toFixed(1));
