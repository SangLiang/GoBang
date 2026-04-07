/**
 * 游戏常量配置
 * 集中管理所有魔法数字，提高可维护性
 */

module.exports = {
    // 棋盘相关
    "BOARD_SIZE": 15,
    "WIN_LENGTH": 5,
    "BOARD_CENTER": 7,  // 棋盘中心点（15/2 向下取整）

    // 棋盘偏移量
    "OFFSET_X": 55,
    "OFFSET_Y": 55,
    "OFFSET_PIECE": 35,

    // 画布尺寸
    "CANVAS_WIDTH": 600,
    "CANVAS_HEIGHT": 600,

    // AI 延迟（毫秒）
    "AI_DELAY": 500,
    
    // 游戏延迟（毫秒）
    "WINNER_DELAY": 1000,  // 显示获胜界面前的延迟

    // 棋形评分
    "SCORES": {
        "FIVE": 1000000,          // 成五 / 长连
        "OPEN4": 120000,           // 活四
        "RUSH4": 15000,            // 冲四
        "OPEN3": 10000,            // 活三
        "SLEEP3": 800,             // 眠三
        "OPEN2": 180,              // 活二
        "SLEEP2": 55,              // 眠二
        "OPEN1": 35,               // 活一
        "SLEEP1": 10,              // 眠一
        "DEAD4": 220,              // 死四
        "DEAD3": 120,              // 死三
        "DEAD2": 15,               // 死二
        "LOW": 3,                  // 低分

        // 组合加成
        "DOUBLE_OPEN3_BONUS": 12000,
        "DOUBLE_RUSH4_BONUS": 80000,

        // AI 阈值
        "OPEN3_THRESHOLD": 10000,   // AI 活三阈值
        "OPEN3_UPPER_BOUND": 60000  // 活三上限（用于区分活三和更高价值棋形）
    }
};
