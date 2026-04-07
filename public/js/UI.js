// 背景

module.exports.background = Hamster.Sprite({
	"name": "background",
	"imageName": "background",
	"x": 33,
	"y": 35
});

module.exports.turnUI = Hamster.UI.Text({
	"name": "turnUI",
	"text": "当前回合：黑棋",
	"fontSize": "20",
	"color": "#fff",
	"x": 230,
	"y": 26
});

module.exports.changedSideText = function(turn) {
	if (turn == 0) {
		this.turnUI.setText("当前回合：黑棋");
	}

	if (turn == 1) {
		this.turnUI.setText("当前回合：白棋");
	}
}

module.exports.overlay = Hamster.Sprite({
	"name": "overlay",
	"imageName": "black_bg",
	"x": 0,
	"y": 0,
	"awake": false
});

module.exports.winnerText = Hamster.UI.Text({
	"name": "winnerText",
	"text": "",
	"fontSize": "32",
	"color": "#ffffff",
	"x": 220,
	"y": 300,
	"awake": false
});

module.exports.showWinner = function(winner, onRestart, onMenu) {
	var self = this;
	var winnerName = winner == 0 ? "黑棋" : "白棋";
	Hamster.add(this.overlay);
	Hamster.add(this.winnerText);
	this.overlay.awake = true;
	this.winnerText.setText(winnerName + "获胜！");
	this.winnerText.awake = true;

	// 重新开始按钮（使用 Sprite + Text 组合）
	if (onRestart) {
		this.restartBtnBg = Hamster.Sprite({
			"name": "restartBtnBg",
			"imageName": "black_bg",
			"x": 180,
			"y": 370,
			"awake": true
		});
		this.restartBtnBg.isTrigger = true;
		this.restartBtnBg.width = 240;
		this.restartBtnBg.height = 50;
		Hamster.add(this.restartBtnBg);

		this.restartBtn = Hamster.UI.Text({
			"name": "restartBtn",
			"text": "[ 重新开始 ]",
			"fontSize": "24",
			"color": "#ffff00",
			"x": 200,
			"y": 380,
			"awake": true
		});
		Hamster.add(this.restartBtn);
		Hamster.addEventListener(this.restartBtnBg, "click", onRestart);
	}

	// 返回菜单按钮
	if (onMenu) {
		this.menuBtnBg = Hamster.Sprite({
			"name": "menuBtnBg",
			"imageName": "black_bg",
			"x": 180,
			"y": 420,
			"awake": true
		});
		this.menuBtnBg.isTrigger = true;
		this.menuBtnBg.width = 240;
		this.menuBtnBg.height = 50;
		Hamster.add(this.menuBtnBg);

		this.menuBtn = Hamster.UI.Text({
			"name": "menuBtn",
			"text": "[ 返回菜单 ]",
			"fontSize": "24",
			"color": "#aaaaaa",
			"x": 200,
			"y": 430,
			"awake": true
		});
		Hamster.add(this.menuBtn);
		Hamster.addEventListener(this.menuBtnBg, "click", onMenu);
	}
};

module.exports.hideWinner = function() {
	this.overlay.awake = false;
	this.winnerText.awake = false;
	if (this.restartBtn) {
		Hamster.remove(this.restartBtn);
		this.restartBtn = null;
	}
	if (this.restartBtnBg) {
		Hamster.remove(this.restartBtnBg);
		this.restartBtnBg = null;
	}
	if (this.menuBtn) {
		Hamster.remove(this.menuBtn);
		this.menuBtn = null;
	}
	if (this.menuBtnBg) {
		Hamster.remove(this.menuBtnBg);
		this.menuBtnBg = null;
	}
};