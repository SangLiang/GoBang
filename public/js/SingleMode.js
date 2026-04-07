// 单人模式选择逻辑
var UI = require("./UI");
var util = require("./util.js");
var gameLogic = require('./gameLogic.js');
var AI = require("./AI");
var trainingApi = require("./trainingApi");
var nnAssist = require("./nnAssist");
var GameState = require("./GameState");
var constants = require("./constants");

var gameState = null;

module.exports.start = function () {
	// 清理旧状态
	if (gameState) {
		gameState.cleanup();
	}

	gameState = new GameState();
	// 暴露到 window 供调试工具使用
	window.gameState = gameState;

	// 每次进入单人模式都重置训练日志相关状态
	gameState.hasLoggedResult = false;
	gameState.moveCount = 0;

	var nnLoadOn =
		typeof NN_ASSIST_ENABLED !== "undefined" && NN_ASSIST_ENABLED &&
		typeof NN_LAMBDA === "number" && NN_LAMBDA !== 0;
	if (nnLoadOn) {
		nnAssist.preloadWeightsFromTrainingApi();
	}

	Hamster.removeAll();
	Hamster.add(UI.background);
	Hamster.add(UI.turnUI);

	var ai = new AI();
	gameState.ai = ai;

	// 设置电脑的先后手
	var random = util.getRandomNumber(0, 1);

	UI.changedSideText(gameState.gameTurn);
	if (random === 0) {
		// 电脑先放子
		ai.shotPiece(gameState);
		gameState.setUserTurn(false);
	} else {
		// 玩家先放子
		gameState.setUserTurn(true);
	}

	UI.background.isTrigger = true;
	var clickHandler = function (e) {
		// 判断游戏的结果
		if (!gameState.isUserTurn) {
			return;
		}

		if (gameState.result) {
			console.log("game over");
			return;
		}

		var position = util.getBoardPosition(e.x, e.y);
		if (!position || position.x < 0 || position.x >= constants.BOARD_SIZE || position.y < 0 || position.y >= constants.BOARD_SIZE) {
			return;
		}

		var _pos = util.setPositionByBoardPosition(position.x, position.y);

		var rightPlace = gameLogic.setPieceInGameList(gameState.gameTurn, gameState.gameList, position);
		if (!rightPlace) {
			return;
		}

		gameState.incrementMoveCount();

		// 生成棋子 
		var piece = gameLogic.shotPiece(gameState.gameTurn, _pos);
		Hamster.add(piece);

		// 检测游戏结果
		gameState.result = gameLogic.getResult(gameState.gameList, position.x, position.y);
		
		// 如果游戏结束，显示获胜方
		if (gameState.result) {
			var winner = gameState.gameTurn;
			var nnSchemaVersion = typeof NN_ASSIST_SCHEMA_VERSION === "number" ? NN_ASSIST_SCHEMA_VERSION : 1;
			if (!gameState.hasLoggedResult) {
				gameState.hasLoggedResult = true;
				trainingApi.appendTrainingLog({
					"mode": "single",
					"result": "win-user",
					"winnerSide": gameState.gameTurn === 0 ? "black" : "white",
					"moves": trainingApi.countStones(gameState.gameList),
					"schemaVersion": nnSchemaVersion,
					"ts": new Date().toISOString()
				});
			}
			setTimeout(function() {
				UI.showWinner(winner, restartGame, backToMenu);
			}, constants.WINNER_DELAY);
			return;
		}

		// 转换回合
		gameState.nextTurn();

		UI.changedSideText(gameState.gameTurn);

		gameState.setUserTurn(false);

		ai.shotPiece(gameState);
	};

	Hamster.addEventListener(UI.background, "click", clickHandler);

	gameState.registerCleanup(function() {
		Hamster.removeAll();
	});

	function restartGame() {
		UI.hideWinner();
		module.exports.start();
	}

	function backToMenu() {
		UI.hideWinner();
		Hamster.removeAll();
		var notice = Hamster.UI.Text({
			"name": "notice",
			"fontSize": 20,
			"text": "请输入游戏模式，s为单人模式，d为双人对战模式",
			"x": 10,
			"y": 30,
			"color": "#fff"
		});
		Hamster.add(notice);
	}
};
