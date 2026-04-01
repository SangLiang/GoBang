/**
 * 纯规则选点器：只用棋形分做进攻/防守比较，不使用 NN 辅助。
 * 规则与浏览器端“关闭 NN”时保持一致。
 * 主要用于 Node 侧对局与进化评估，作为基线对手（baseline）。
 */

"use strict";

var boardCore = require("./boardCore");

function getMostDangerPlace(objlist) {
	var big = objlist[0];
	var i;
	for (i = 0; i < objlist.length; i++) {
		if (objlist[i].weight > big.weight) {
			big = objlist[i];
		}
	}
	return big;
}

/**
 * @param {number[][]} gameList
 * @param {number} gameTurn 当前行棋方 0 黑 / 1 白
 * @returns {{x:number,y:number}}
 */
function pickMove(gameList, gameTurn) {
	// 候选点：与已有棋子相邻的空位（8 邻域），由 boardCore 去重并排序。
	var candidates = boardCore.getLegalCandidates(gameList);
	var position;

	// 将“当前行棋方”映射为棋盘落子值：
	// gameTurn: 0/1（黑/白） -> stone: 1/2
	var turnAttack = gameTurn === 0 ? 1 : 2;
	var turnDefense = gameTurn === 0 ? 2 : 1;

	if (candidates.length > 0) {
		// winList：站在“我方进攻”角度给每个候选点打分
		// dangerList：站在“对手威胁”角度给每个候选点打分
		var winList = [];
		var dangerList = [];
		var i;
		var cx;
		var cy;
		var attackScore;
		var defenseScore;

		for (i = 0; i < candidates.length; i++) {
			cx = candidates[i].x;
			cy = candidates[i].y;
			// 我方若下在 (cx, cy) 的棋形收益（进攻分）
			attackScore = boardCore.getPatternScoreAt(gameList, cx, cy, turnAttack);
			winList.push({ x: cx, y: cy, weight: attackScore });
		}
		for (i = 0; i < candidates.length; i++) {
			cx = candidates[i].x;
			cy = candidates[i].y;
			// 对手若下在 (cx, cy) 的棋形收益（防守参考分）
			defenseScore = boardCore.getPatternScoreAt(gameList, cx, cy, turnDefense);
			dangerList.push({ x: cx, y: cy, weight: defenseScore });
		}

		// 分别取进攻分最高点、对手威胁最高点
		var winPoint = getMostDangerPlace(winList);
		var dangerPoint = getMostDangerPlace(dangerList);

		// 活三阈值
		var OPEN3_THRESHOLD = 10000;  // 活三及以上
		
		// 检查自己是否有活三
		var myOpen3List = [];
		for (i = 0; i < winList.length; i++) {
			if (winList[i].weight >= OPEN3_THRESHOLD && winList[i].weight < 60000) {
				myOpen3List.push(winList[i]);
			}
		}
		var hasMyOpen3 = myOpen3List.length > 0;
		
		// 检查对手是否有活三
		var opponentOpen3List = [];
		for (i = 0; i < dangerList.length; i++) {
			if (dangerList[i].weight >= OPEN3_THRESHOLD && dangerList[i].weight < 60000) {
				opponentOpen3List.push(dangerList[i]);
			}
		}
		var hasOpponentOpen3 = opponentOpen3List.length > 0;

		// 决策策略：
		// 1. 自己有活三 + 对手没有 → 优先进攻活三
		// 2. 对手有活三 → 优先防守
		// 3. 双方都有活三 → 先成四（进攻优先）
		// 4. 都没有活三 → 正常比较
		
		if (hasMyOpen3 && !hasOpponentOpen3) {
			// 策略1: 自己有活三，对手没有，优先进攻
			var bestAttack = myOpen3List[0];
			for (i = 0; i < myOpen3List.length; i++) {
				if (myOpen3List[i].weight > bestAttack.weight) {
					bestAttack = myOpen3List[i];
				}
			}
			position = { x: bestAttack.x, y: bestAttack.y };
		} else if (hasOpponentOpen3 && !hasMyOpen3) {
			// 策略2: 对手有活三，自己没有，必须防守
			var bestDefend = opponentOpen3List[0];
			for (i = 0; i < opponentOpen3List.length; i++) {
				if (opponentOpen3List[i].weight > bestDefend.weight) {
					bestDefend = opponentOpen3List[i];
				}
			}
			position = { x: bestDefend.x, y: bestDefend.y };
		} else if (hasMyOpen3 && hasOpponentOpen3) {
			// 策略3: 双方都有活三，先成四（进攻优先）
			// 因为成四后有两个成五点，比防守更有利
			var bestAttack = myOpen3List[0];
			for (i = 0; i < myOpen3List.length; i++) {
				if (myOpen3List[i].weight > bestAttack.weight) {
					bestAttack = myOpen3List[i];
				}
			}
			position = { x: bestAttack.x, y: bestAttack.y };
		} else {
			// 策略4: 都没有活三，正常比较
			if (winPoint.weight > dangerPoint.weight) {
				position = { x: winPoint.x, y: winPoint.y };
			} else {
				position = { x: dangerPoint.x, y: dangerPoint.y };
			}
		}
	} else {
		// 无候选时（例如开局空盘）默认走中心点
		position = { x: 7, y: 7 };
	}

	return position;
}

module.exports = {
	getMostDangerPlace: getMostDangerPlace,
	pickMove: pickMove
};
