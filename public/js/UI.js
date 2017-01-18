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

module.exports.blackPiece = Hamster.Sprite({
	"name": "blackPiece",
	"imageName": "black",
	"x": 0,
	"y": 0
});

module.exports.whitePiece = Hamster.Sprite({
	"name": "whitePiece",
	"imageName": "white",
	"x": 0,
	"y": 0
});