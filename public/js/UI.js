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

module.exports.showWinner = function(winner) {
	var winnerName = winner == 0 ? "黑棋" : "白棋";
	Hamster.add(this.overlay);
	Hamster.add(this.winnerText);
	this.overlay.awake = true;
	this.winnerText.setText(winnerName + "获胜！");
	this.winnerText.awake = true;
}