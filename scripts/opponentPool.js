/**
 * 对手池管理 - 防止神经网络过拟合单一对手
 * 
 * 核心思想：
 * 1. 维护多个不同强度的对手（不同代数、不同策略、不同弱点）
 * 2. 每局训练时按概率采样对手
 * 3. 定期更新对手池，淘汰弱对手，加入新对手
 */

"use strict";

var fs = require("fs");
var path = require("path");
var ruleAi = require("./ruleAi");
var nnAssistPick = require("./nnAssistPick");
var makeNetworkFromSave = require("./evolve-ai").makeNetworkFromSave;

/**
 * 对手池配置
 */
var OPPONENT_POOL_CONFIG = {
	// 对手池大小（建议5-10个）
	POOL_SIZE: 8,
	
	// 对手类型比例
	RULE_OPPONENT_RATIO: 0.3,      // 30%概率选规则AI（保持基础能力）
	RANDOM_OPPONENT_RATIO: 0.1,    // 10%概率选完全随机（探索）
	POOL_OPPONENT_RATIO: 0.6,      // 60%概率从池中选
	
	// 更新策略
	UPDATE_EVERY_GENERATIONS: 5,   // 每5代更新一次池
	REPLACE_WEAKEST_COUNT: 2,      // 每次淘汰最弱的2个
	
	// 采样策略：温度系数（越低越倾向于选强对手）
	SAMPLING_TEMPERATURE: 0.5      // 0.1=几乎总选最强，1.0=均匀采样
};

/**
 * 对手信息结构
 */
function OpponentInfo(id, name, pickFn, strength, description) {
	this.id = id;                    // 唯一ID
	this.name = name;                // 显示名称
	this.pickFn = pickFn;            // 走子函数
	this.strength = strength;        // 强度评分（0-1）
	this.description = description;  // 描述
	this.wins = 0;                   // 对战胜利次数
	this.losses = 0;                 // 对战失败次数
	this.lastUsed = 0;               // 最后使用时间（代数）
}

/**
 * 计算对手的实战强度
 */
OpponentInfo.prototype.getEffectiveStrength = function(currentGeneration) {
	// 基础强度 + 最近使用奖励 + 胜率加成
	var recencyBonus = Math.exp(-(currentGeneration - this.lastUsed) * 0.1);
	var games = this.wins + this.losses;
	var winRateBonus = games > 0 ? (this.wins - this.losses) / games * 0.1 : 0;
	return this.strength + recencyBonus * 0.1 + winRateBonus;
};

/**
 * 对手池管理器
 */
function OpponentPool(config) {
	this.config = Object.assign({}, OPPONENT_POOL_CONFIG, config || {});
	this.pool = [];                  // 对手池
	this.ruleOpponent = {           // 规则AI对手
		id: "rule-ai",
		name: "RuleAI",
		pickFn: ruleAi.pickMove,
		strength: 0.5,
		description: "基于规则的模式匹配AI"
	};
	this.randomOpponent = {         // 随机对手
		id: "random",
		name: "Random",
		pickFn: this.makeRandomPicker(),
		strength: 0.1,
		description: "完全随机走子（用于探索）"
	};
}

/**
 * 创建随机走子函数
 */
OpponentPool.prototype.makeRandomPicker = function() {
	return function(board) {
		var available = [];
		for (var x = 0; x < board.length; x++) {
			for (var y = 0; y < board[x].length; y++) {
				if (board[x][y] === 0) {
					available.push({x: x, y: y});
				}
			}
		}
		if (available.length === 0) return null;
		var idx = Math.floor(Math.random() * available.length);
		return available[idx];
	};
};

/**
 * 从权重文件创建NN对手
 */
OpponentPool.prototype.createNnOpponent = function(filePath, id, name, description) {
	try {
		var saveData = JSON.parse(fs.readFileSync(filePath, "utf8"));
		var weights = saveData.nnAssistWeights || saveData.weights;
		var net = makeNetworkFromSave(weights);
		var pickFn = nnAssistPick.makePicker(net, 1000); // 使用标准lambda
		
		// 从文件名解析强度（例如：gen5-xxx.json => 强度0.5）
		var strength = 0.3;
		var match = id.match(/gen(\d+)/);
		if (match) {
			var gen = parseInt(match[1], 10);
			strength = Math.min(0.95, 0.3 + gen * 0.02); // 每代增加0.02
		}
		
		return new OpponentInfo(id, name, pickFn, strength, description);
	} catch (e) {
		console.warn("[OpponentPool] 创建对手失败:", filePath, e.message);
		return null;
	}
};

/**
 * 初始化对手池
 */
OpponentPool.prototype.initialize = function(seedFiles) {
	this.pool = [];
	
	// 加入基础对手
	this.pool.push(this.ruleOpponent);
	this.pool.push(this.randomOpponent);
	
	// 从种子文件初始化
	if (seedFiles && Array.isArray(seedFiles)) {
		seedFiles.forEach(function(file, idx) {
			var opp = this.createNnOpponent(file.path, file.id, file.name, file.description);
			if (opp) this.pool.push(opp);
		}, this);
	}
	
	// 如果池子太小，复制规则AI填充
	while (this.pool.length < this.config.POOL_SIZE) {
		var copy = Object.assign({}, this.ruleOpponent);
		copy.id = "rule-ai-" + (this.pool.length - 1);
		this.pool.push(copy);
	}
	
	console.log("[OpponentPool] 初始化完成，池大小:", this.pool.length);
};

/**
 * 按强度采样对手（温度采样）
 */
OpponentPool.prototype.sampleOpponent = function(currentGeneration) {
	var rand = Math.random();
	
	// 按配置比例选择对手类型
	if (rand < this.config.RULE_OPPONENT_RATIO) {
		// 规则AI
		return this.ruleOpponent;
	} else if (rand < this.config.RULE_OPPONENT_RATIO + this.config.RANDOM_OPPONENT_RATIO) {
		// 随机对手
		return this.randomOpponent;
	} else {
		// 从池中采样
		return this.sampleFromPool(currentGeneration);
	}
};

/**
 * 从池中按强度采样（温度采样）
 */
OpponentPool.prototype.sampleFromPool = function(currentGeneration) {
	// 计算每个对手的权重（带温度）
	var weights = this.pool.map(function(opp) {
		var strength = opp.getEffectiveStrength ? 
			opp.getEffectiveStrength(currentGeneration) : opp.strength;
		// 温度采样：强度^(1/T)
		return Math.pow(Math.max(strength, 0.01), 1.0 / this.config.SAMPLING_TEMPERATURE);
	}, this);
	
	// 归一化
	var sum = weights.reduce(function(a, b) { return a + b; }, 0);
	var probs = weights.map(function(w) { return w / sum; });
	
	// 按概率采样
	var r = Math.random();
	var cum = 0;
	for (var i = 0; i < probs.length; i++) {
		cum += probs[i];
		if (r <= cum) {
			var selected = this.pool[i];
			if (selected.lastUsed !== undefined) {
				selected.lastUsed = currentGeneration;
			}
			return selected;
		}
	}
	
	return this.pool[0]; // 保底
};

/**
 * 更新对手池（每代结束后调用）
 */
OpponentPool.prototype.updatePool = function(generation, newCandidateFile) {
	if (generation % this.config.UPDATE_EVERY_GENERATIONS !== 0) {
		return;
	}
	
	console.log("[OpponentPool] 更新对手池，代数:", generation);
	
	// 如果有新的候选权重，加入池子
	if (newCandidateFile) {
		var newOpp = this.createNnOpponent(
			newCandidateFile.path,
			newCandidateFile.id || ("gen" + generation),
			newCandidateFile.name || ("Gen " + generation),
			newCandidateFile.description || ("第" + generation + "代进化结果")
		);
		if (newOpp) {
			this.pool.push(newOpp);
			console.log("[OpponentPool] 加入新对手:", newOpp.name);
		}
	}
	
	// 如果超出池大小，淘汰最弱的
	if (this.pool.length > this.config.POOL_SIZE) {
		// 按强度排序（保留前POOL_SIZE个）
		this.pool.sort(function(a, b) {
			return b.strength - a.strength;
		});
		
		var removed = this.pool.splice(this.config.POOL_SIZE);
		removed.forEach(function(opp) {
			console.log("[OpponentPool] 淘汰对手:", opp.name);
		});
	}
	
	console.log("[OpponentPool] 更新后池大小:", this.pool.length);
};

/**
 * 获取池状态报告
 */
OpponentPool.prototype.getStatus = function(currentGeneration) {
	return {
		size: this.pool.length,
		opponents: this.pool.map(function(opp) {
			return {
				id: opp.id,
				name: opp.name,
				strength: opp.strength,
				effectiveStrength: opp.getEffectiveStrength ? 
					opp.getEffectiveStrength(currentGeneration) : opp.strength,
				wins: opp.wins || 0,
				losses: opp.losses || 0,
				description: opp.description
			};
		})
	};
};

module.exports = OpponentPool;
