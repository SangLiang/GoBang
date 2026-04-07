/**
 * 游戏状态管理模块
 * 封装所有游戏相关状态，消除全局变量污染
 * 
 * 使用方式：
 *   var GameState = require("./GameState");
 *   var gameState = new GameState();
 *   gameState.gameList    // 15x15 棋盘
 *   gameState.gameTurn    // 当前回合 (0=黑, 1=白)
 */

var constants = require("./constants");
var BOARD_SIZE = constants.BOARD_SIZE;

function GameState() {
	// 15x15 棋盘，0=空，1=黑，2=白
	this.gameList = this._createEmptyBoard();
	
	// 当前回合：0=黑棋回合，1=白棋回合
	this.gameTurn = 0;
	
	// 是否轮到玩家操作（单人模式使用）
	this.isUserTurn = false;
	
	// 游戏是否已结束
	this.result = false;
	
	// 已落子数量
	this.moveCount = 0;
	
	// 是否已记录本局训练日志（防止重复记录）
	this.hasLoggedResult = false;
	
	// AI 实例引用（单人模式）
	this.ai = null;
	
	// 清理回调函数队列
	this._cleanupFns = [];
}

/**
 * 创建空的 15x15 棋盘
 * @returns {Array<Array<number>>} 二维数组，初始值全为 0
 */
GameState.prototype._createEmptyBoard = function() {
	var board = [];
	for (var i = 0; i < BOARD_SIZE; i++) {
		board[i] = [];
		for (var j = 0; j < BOARD_SIZE; j++) {
			board[i][j] = 0;
		}
	}
	return board;
};

/**
 * 重置游戏状态到初始状态
 * 用于重新开始游戏
 */
GameState.prototype.reset = function() {
	this.gameList = this._createEmptyBoard();
	this.gameTurn = 0;
	this.isUserTurn = false;
	this.result = false;
	this.moveCount = 0;
	this.hasLoggedResult = false;
	this.ai = null;
	this._cleanupFns = [];
};

/**
 * 设置当前回合
 * @param {number} turn - 0=黑棋，1=白棋
 */
GameState.prototype.setTurn = function(turn) {
	this.gameTurn = turn;
};

/**
 * 切换到下一回合
 * 黑棋→白棋 或 白棋→黑棋
 */
GameState.prototype.nextTurn = function() {
	this.gameTurn = this.gameTurn === 0 ? 1 : 0;
};

/**
 * 设置是否轮到玩家
 * @param {boolean} isUserTurn - true=玩家回合
 */
GameState.prototype.setUserTurn = function(isUserTurn) {
	this.isUserTurn = isUserTurn;
};

/**
 * 设置游戏是否结束
 * @param {boolean} isOver - true=游戏结束
 */
GameState.prototype.setGameOver = function(isOver) {
	this.result = isOver;
};

/**
 * 增加落子计数
 */
GameState.prototype.incrementMoveCount = function() {
	this.moveCount++;
};

/**
 * 获取当前回合的进攻方棋子值
 * @returns {number} 1=黑棋进攻，2=白棋进攻
 */
GameState.prototype.getAttackPlayer = function() {
	return this.gameTurn === 0 ? 1 : 2;
};

/**
 * 获取当前回合的防守方棋子值
 * @returns {number} 1=黑棋防守，2=白棋防守
 */
GameState.prototype.getDefensePlayer = function() {
	return this.gameTurn === 0 ? 2 : 1;
};

/**
 * 注册清理回调函数
 * @param {Function} fn - 清理时执行的回调
 */
GameState.prototype.registerCleanup = function(fn) {
	this._cleanupFns.push(fn);
};

/**
 * 执行所有清理回调
 * 用于切换模式或重新开始时清理资源
 */
GameState.prototype.cleanup = function() {
	for (var i = 0; i < this._cleanupFns.length; i++) {
		this._cleanupFns[i]();
	}
	this._cleanupFns = [];
};

module.exports = GameState;