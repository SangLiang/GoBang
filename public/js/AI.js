// AI部分

function AI() {
    var self = this;
    self.horizontalList = [];
    self.verticaList = [];
    self.viceDiagonalList = [];
    self.mainDiagonalList = [];
    self.init();
}

AI.prototype = {
    "init": function () {
        console.log("AI ready");
    },

    "checkGameList": function (gameList) {
        for (var i = 0; i < gameList.length; i++) {
            for (var j = 0; j < gameList[i].length; j++) {
                // 横向检测条件
                if (x <= 10 && gameList[i][j] != 0) {
                    this.checkHorizontal(gameList, i, j);
                }
            }
        }
    },
    // 横排检测
    "checkHorizontal": function (gameList, i, j) {
        var _obj = {};
        if (gameList[i][j] == gameList[i + 1][j]) {
            _obj.x = i;
            _obj.y = j;
            this.horizontalList.push(_obj);
        }
    },
    // 竖排检测
    "checkVertica": function () {

    },
    // 副对角线
    "checkViceDiagonal": function () {

    },
    // 主对角线
    "checkMainDiagonal": function () {

    },
    "shotPiece": function () {
        console.log(1);
    }
}

module.exports = AI;