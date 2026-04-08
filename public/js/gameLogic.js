/*
 * 游戏核心逻辑
 */

var constants = require("./constants");
var BOARD_SIZE = constants.BOARD_SIZE;
var WIN_LENGTH = constants.WIN_LENGTH;
var SCORES = constants.SCORES;
var BOARD_SIZE_MINUS_WIN_LENGTH = BOARD_SIZE - WIN_LENGTH; // 10
var WIN_LENGTH_MINUS_ONE = WIN_LENGTH - 1; // 4

/* ---------- 棋形评分：假设在 (mx,my) 为 player 落子，沿一线分析 ---------- */

function virtualCell(gameList, cx, cy, mx, my, player) {
	if (cx === mx && cy === my) {
		return player;
	}
	if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) {
		return -1;
	}
	return gameList[cx][cy];
}

// 沿 (dx,dy) 方向统计与落子点相连的同色子数，并得到左右外侧第一格是否为空
function scanConnectedLine(gameList, mx, my, dx, dy, player) {
	var left = 0;
	var cx = mx - dx;
	var cy = my - dy;
	while (cx >= 0 && cy >= 0 && cx < BOARD_SIZE && cy < BOARD_SIZE) {
		if (virtualCell(gameList, cx, cy, mx, my, player) !== player) {
			break;
		}
		left++;
		cx -= dx;
		cy -= dy;
	}
	var lx = cx;
	var ly = cy;

	var right = 0;
	cx = mx + dx;
	cy = my + dy;
	while (cx >= 0 && cy >= 0 && cx < BOARD_SIZE && cy < BOARD_SIZE) {
		if (virtualCell(gameList, cx, cy, mx, my, player) !== player) {
			break;
		}
		right++;
		cx += dx;
		cy += dy;
	}
	var rx = cx;
	var ry = cy;

	var total = 1 + left + right;
	var leftOpen = (lx >= 0 && ly >= 0 && lx < BOARD_SIZE && ly < BOARD_SIZE && gameList[lx][ly] === 0);
	var rightOpen = (rx >= 0 && ry >= 0 && rx < BOARD_SIZE && ry < BOARD_SIZE && gameList[rx][ry] === 0);

	return {
		"total": total,
		"leftOpen": leftOpen,
		"rightOpen": rightOpen
	};
}

// 单线棋形 → 分数与类型（用于组合加成）
function linePatternScore(total, leftOpen, rightOpen) {
	// 成五 / 长连
	if (total >= WIN_LENGTH) {
		return { "score": SCORES.FIVE, "kind": "FIVE" };
	}
	if (total === 4) {
		if (leftOpen && rightOpen) {
			return { "score": SCORES.OPEN4, "kind": "OPEN4" };
		}
		if (leftOpen || rightOpen) {
			return { "score": SCORES.RUSH4, "kind": "RUSH4" };
		}
		return { "score": SCORES.DEAD4, "kind": "DEAD4" };
	}
	if (total === 3) {
		if (leftOpen && rightOpen) {
			return { "score": SCORES.OPEN3, "kind": "OPEN3" };
		}
		if (leftOpen || rightOpen) {
			return { "score": SCORES.SLEEP3, "kind": "SLEEP3" };
		}
		return { "score": SCORES.DEAD3, "kind": "DEAD3" };
	}
	if (total === 2) {
		if (leftOpen && rightOpen) {
			return { "score": SCORES.OPEN2, "kind": "OPEN2" };
		}
		if (leftOpen || rightOpen) {
			return { "score": SCORES.SLEEP2, "kind": "SLEEP2" };
		}
		return { "score": SCORES.DEAD2, "kind": "DEAD2" };
	}
	if (leftOpen && rightOpen) {
		return { "score": SCORES.OPEN1, "kind": "OPEN1" };
	}
	if (leftOpen || rightOpen) {
		return { "score": SCORES.SLEEP1, "kind": "SLEEP1" };
	}
	return { "score": SCORES.LOW, "kind": "LOW" };
}

// 四方向（横、竖、两斜）累计 + 双活三 / 双冲四 加成
function computePatternScoreAt(gameList, mx, my, player) {
	if (gameList[mx][my] !== 0) {
		return 0;
	}
	var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
	var sum = 0;
	var open3Count = 0;
	var rush4Count = 0;
	var i;
	var d;
	var scan;
	var r;

	for (i = 0; i < dirs.length; i++) {
		d = dirs[i];
		scan = scanConnectedLine(gameList, mx, my, d[0], d[1], player);
		r = linePatternScore(scan.total, scan.leftOpen, scan.rightOpen);
		sum += r.score;
		if (r.kind === "OPEN3") {
			open3Count++;
		}
		if (r.kind === "RUSH4") {
			rush4Count++;
		}
	}
	if (open3Count >= 2) {
		sum += SCORES.DOUBLE_OPEN3_BONUS;
	}
	if (rush4Count >= 2) {
		sum += SCORES.DOUBLE_RUSH4_BONUS;
	}
	return sum;
}

module.exports = {
    // 放棋子
    "shotPiece": function (side, position) {
        if (side == 0) {
            var blackPiece = Hamster.Sprite({
                "name": "blackPiece",
                "imageName": "black",
                "x": position.x,
                "y": position.y
            });
            return blackPiece;
        } else if (side == 1) {
            var whitePiece = Hamster.Sprite({
                "name": "whitePiece",
                "imageName": "white",
                "x": position.x,
                "y": position.y
            });
            return whitePiece;
        }
    },
    // 设置棋子的位置
    "setPieceInGameList": function (gameTurn, gameList, position) {
        if (gameList[position.x][position.y] != 0) {
            return false;
        }

        if (gameTurn == 0) {
            gameList[position.x][position.y] = 1;
            return true;
        } else if (gameTurn == 1) {
            gameList[position.x][position.y] = 2;
            return true;
        }
    },

    // 获取游戏结果
    "getResult": function (gameList, x, y) {
        if (gameList[x][y] === 0) return false;
        
        var player = gameList[x][y];
        var directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        for (var i = 0; i < directions.length; i++) {
            var dx = directions[i][0];
            var dy = directions[i][1];
            if (this.checkDirection(gameList, x, y, dx, dy, player)) {
                return true;
            }
        }
        return false;
    },

    "checkDirection": function (gameList, x, y, dx, dy, player) {
        var count = 1;
        
        // 正方向
        var cx = x + dx, cy = y + dy;
        while (cx >= 0 && cy >= 0 && cx < BOARD_SIZE && cy < BOARD_SIZE && gameList[cx][cy] === player) {
            count++;
            cx += dx;
            cy += dy;
        }
        
        // 反方向
        cx = x - dx; cy = y - dy;
        while (cx >= 0 && cy >= 0 && cx < BOARD_SIZE && cy < BOARD_SIZE && gameList[cx][cy] === player) {
            count++;
            cx -= dx;
            cy -= dy;
        }
        
        return count >= WIN_LENGTH;
    },

    // 横排检测
    "checkHorizontal": function (gameList, x, y) {
        if (gameList[x][y] == gameList[x + 1][y] && gameList[x][y] == gameList[x + 2][y] && gameList[x][y] == gameList[x + 3][y] && gameList[x][y] == gameList[x + 4][y]) {
            console.log("横排五连");
            return true;
        } else {
            return false;
        }

    },
    // 竖排检测
    "checkVertica": function (gameList, x, y) {
        if (gameList[x][y] == gameList[x][y + 1] && gameList[x][y] == gameList[x][y + 2] && gameList[x][y] == gameList[x][y + 3] && gameList[x][y] == gameList[x][y + 4]) {
            console.log("竖排五连");
            return true;
        } else {
            return false;
        }
    },
    // 副对角线检测
    "checkViceDiagonal": function (gameList, x, y) {
        if (gameList[x][y] == gameList[x + 1][y + 1] && gameList[x][y] == gameList[x + 2][y + 2] && gameList[x][y] == gameList[x + 3][y + 3] && gameList[x][y] == gameList[x + 4][y + 4]) {
            console.log("附对角线五连");
            return true;
        } else {
            return false;
        }
    },
    // 主对角线检测
    "checkMainDiagonal": function (gameList, x, y) {
        if (gameList[x][y] == gameList[x + 1][y - 1] && gameList[x][y] == gameList[x + 2][y - 2] && gameList[x][y] == gameList[x + 3][y - 3] && gameList[x][y] == gameList[x + 4][y - 4]) {
            console.log("主对角线五连");
            return true;
        } else {
            return false;
        }
    },

    // 棋形评分：假设 turn(1黑/2白) 落在空位 (x,y)，四向连成段 + 活三/冲四组合加成
    "getTheGameWeight": function (gameList, x, y, turn) {
        return computePatternScoreAt(gameList, parseInt(x, 10), parseInt(y, 10), turn);
    },

    // 检测威胁点
    "checkDanger": function(gameList) {
        var needComputePlace = [];
        var visited = {};
        var i, k, di, dj, ni, nj, key;

        for (i = 0; i < gameList.length; i++) {
            for (k = 0; k < gameList[i].length; k++) {
                if (gameList[i][k] === 0) {
                    var hasNeighbor = false;
                    for (di = -1; di <= 1 && !hasNeighbor; di++) {
                        for (dj = -1; dj <= 1 && !hasNeighbor; dj++) {
                            if (di === 0 && dj === 0) continue;
                            ni = i + di;
                            nj = k + dj;
                            if (ni >= 0 && ni < BOARD_SIZE && nj >= 0 && nj < BOARD_SIZE) {
                                if (gameList[ni][nj] !== 0) {
                                    hasNeighbor = true;
                                }
                            }
                        }
                    }

                    if (hasNeighbor) {
                        key = i + "," + k;
                        if (!visited[key]) {
                            visited[key] = true;
                            needComputePlace.push({"x": i, "y": k});
                        }
                    }
                }
            }
        }

        return needComputePlace;
    }
}
