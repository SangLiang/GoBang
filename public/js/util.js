// 一些常用的转换函数

var OFFSET_X = 55; // 棋盘的边框偏移量
var OFFSET_Y = 55;
var OFFSET_PIECE = 35; // 棋子的偏移量

module.exports = {
    /*
     * getBoardPosition :转换坐标为格子位置
     * @param x: x坐标
     * @param y: y坐标
     * @return obj 转换后的格子坐标
     */
    "getBoardPosition": function (x, y) {
        if ((x - OFFSET_X) % OFFSET_PIECE > (OFFSET_PIECE / 2)) {
            var resultX = parseInt((x - OFFSET_X) / OFFSET_PIECE) + 1;
        } else {
            var resultX = parseInt((x - OFFSET_X) / OFFSET_PIECE);
        }

        if ((y - OFFSET_Y) % OFFSET_PIECE > (OFFSET_PIECE / 2)) {
            var resultY = parseInt((y - OFFSET_Y) / OFFSET_PIECE) + 1;
        } else {
            var resultY = parseInt((y - OFFSET_Y) / OFFSET_PIECE);

        }
        var obj = {
            "x": resultX,
            "y": resultY
        };
        return obj;
    },

    // 
    "setPositionByBoardPosition": function (x, y) {
        var resultX = x * OFFSET_PIECE + OFFSET_X - OFFSET_PIECE / 2;
        var resultY = y * OFFSET_PIECE + OFFSET_Y - OFFSET_PIECE / 2;
        var obj = {
            "x": resultX,
            "y": resultY
        };
        return obj;
    },

    /* getRandomNumber:取随机数
     * @param Min 最小值
     * @param Max 最大值
     * @return 介于最小最大值之间的随机值
     */
    "getRandomNumber": function (Min, Max) {
        var Range = Max - Min;
        var Rand = Math.random();
        return (Min + Math.round(Rand * Range));
    },

    "AIDelayShot": function (delayTime, callback, target) {

        if (target != null) {
            setTimeout(function () {
                callback.bind(target)();
            }, delayTime);
        } else {
            setTimeout(function () {
                callback();
            }, delayTime);
        }

    },
    
    "getMostDangerPlace": function (objlist) {
        var _big = objlist[0];
        for (var i = 0; i < objlist.length; i++) {
            if (objlist[i].weight > _big.weight) {
                _big = objlist[i];
            }
        }
        return _big;
    }

}