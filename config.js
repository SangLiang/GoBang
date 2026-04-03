/**
 * Res is a resource manager ,you can define images,fonts ,sound's name and path
 * When game init , the resource which define in Res will load first
 */

/**
 * 神经辅助（单人 AI，见 public/js/AI.js、nnAssist.js）
 *
 * NN_ASSIST_ENABLED — 总开关。为 false 时不走 NN 分支，与纯规则 AI 一致。
 *
 * NN_ASSIST_SCHEMA_VERSION — 推理版本：
 *   1 = v1（规则分 + assist 混合）
 *   2 = v2（22维特征，NN 独立评分）
 *
 * NN_LAMBDA — 分数放大系数 λ（标量）。
 *   v1: 总分 = pattern 分 + λ * assist
 *   v2: 总分 = λ * score（NN 直接评分）
 *
 * 真正的网络权重：由 nnAssist 内随机初始化，或训练服务 data/ai-training.json 根级的
 * nnAssistWeights + nnAssistSchemaVersion（GET /api/training 加载，见 server/README.md）。
 */
var NN_ASSIST_ENABLED = true;
var NN_ASSIST_SCHEMA_VERSION = 2;
var NN_LAMBDA = 1000;

/**
 * 进化训练配置（见 scripts/evolve-ai.js）
 *
 * EVOLVE_POPULATION — 每代种群大小
 * EVOLVE_GENERATIONS — 进化代数
 * EVOLVE_GAMES_PER_INDIVIDUAL — 每个个体评估局数（黑白各占一半）
 * EVOLVE_PLAY_BLACK_RATIO — NN AI 执黑的比例（0~1，默认 0.5，即黑白各一半）
 * EVOLVE_MIXED — 混合模式：1=每局随机选择对手（需设置种子文件）
 * EVOLVE_MIXED_RATIO — 混合模式下选择 Rule AI 的概率（0~1）
 * EVOLVE_SEED_FILE — 种子权重文件路径（从已有权重继续训练）
 * EVOLVE_SEED_RATIO — 首代中使用种子初始化的占比（0~1）
 * EVOLVE_SEED_MUTATION_RANGE — 种子扰动幅度
 * 
 * EVOLVE_USE_OPPONENT_POOL — 是否启用对手池（默认true，防止过拟合）
 * OPPONENT_POOL_SIZE — 对手池大小（默认8）
 * OPPONENT_POOL_UPDATE_EVERY — 每N代更新一次池（默认5）
 * OPPONENT_POOL_SAMPLING_TEMP — 采样温度（0.1~2.0，越小越倾向于选强对手）
 * OPPONENT_POOL_RULE_RATIO — 池中规则AI比例（默认0.3）
 * OPPONENT_POOL_RANDOM_RATIO — 池中随机对手比例（默认0.1）
 */
var EVOLVE_POPULATION = 50;
var EVOLVE_GENERATIONS = 30;
var EVOLVE_GAMES_PER_INDIVIDUAL = 7;
var EVOLVE_PLAY_BLACK_RATIO = 0;
var EVOLVE_MIXED = 0;
var EVOLVE_MIXED_RATIO = 0.5;
var EVOLVE_OPPONENT = "self";  // "self"=自对弈, "rule"=Rule AI, "pool"=对手池
var EVOLVE_SEED_FILE = "data/ai-training.json";
var EVOLVE_SEED_RATIO = 0.8;
var EVOLVE_SEED_MUTATION_RANGE = 0.3;

// 对手池配置（防过拟合）
var EVOLVE_USE_OPPONENT_POOL = true;  // 启用对手池（推荐！）
var OPPONENT_POOL_SIZE = 8;           // 池大小
var OPPONENT_POOL_UPDATE_EVERY = 5;   // 更新频率
var OPPONENT_POOL_SAMPLING_TEMP = 0.5; // 采样温度（0.1=几乎总选最强，2.0=均匀随机）
var OPPONENT_POOL_RULE_RATIO = 0.3;   // 规则AI比例
var OPPONENT_POOL_RANDOM_RATIO = 0.1; // 随机对手比例

/** 对手权重文件（用于自对弈训练）
 * 训练白棋时（PLAY_BLACK_RATIO=0）：读取 opponent-black.json 作为固定黑方
 * 训练黑棋时（PLAY_BLACK_RATIO=1）：读取 opponent-white.json 作为固定白方
 * 训练完成后，可将最佳权重复制到对应文件，实现交替训练 */
var EVOLVE_OPPONENT_BLACK_FILE = "data/opponent-black.json";
var EVOLVE_OPPONENT_WHITE_FILE = "data/opponent-white.json";

var Res = {
    "images": [
        //---UI
        { "src": "./resource/background.png", "name": "background" },
        { "src": "./resource/black.png", "name": "black" },
        { "src": "./resource/white.png", "name": "white" },
        { "src": "./resource/black_bg.png", "name": "black_bg" },
    ],
    "fonts": [],
    "sound": []
};

// 导出配置（供 Node 脚本使用）
module.exports = {
    // NN 配置
    NN_ASSIST_ENABLED: NN_ASSIST_ENABLED,
    NN_ASSIST_SCHEMA_VERSION: NN_ASSIST_SCHEMA_VERSION,
    NN_LAMBDA: NN_LAMBDA,
    // 进化训练配置
    EVOLVE_POPULATION: EVOLVE_POPULATION,
    EVOLVE_GENERATIONS: EVOLVE_GENERATIONS,
    EVOLVE_GAMES_PER_INDIVIDUAL: EVOLVE_GAMES_PER_INDIVIDUAL,
    EVOLVE_PLAY_BLACK_RATIO: EVOLVE_PLAY_BLACK_RATIO,
    EVOLVE_MIXED: EVOLVE_MIXED,
    EVOLVE_MIXED_RATIO: EVOLVE_MIXED_RATIO,
    EVOLVE_OPPONENT: EVOLVE_OPPONENT,
    EVOLVE_SEED_FILE: EVOLVE_SEED_FILE,
    EVOLVE_SEED_RATIO: EVOLVE_SEED_RATIO,
    EVOLVE_SEED_MUTATION_RANGE: EVOLVE_SEED_MUTATION_RANGE,
    // 对手权重文件配置
    EVOLVE_OPPONENT_BLACK_FILE: EVOLVE_OPPONENT_BLACK_FILE,
    EVOLVE_OPPONENT_WHITE_FILE: EVOLVE_OPPONENT_WHITE_FILE,
    // 对手池配置（防过拟合）
    EVOLVE_USE_OPPONENT_POOL: EVOLVE_USE_OPPONENT_POOL,
    OPPONENT_POOL_SIZE: OPPONENT_POOL_SIZE,
    OPPONENT_POOL_UPDATE_EVERY: OPPONENT_POOL_UPDATE_EVERY,
    OPPONENT_POOL_SAMPLING_TEMP: OPPONENT_POOL_SAMPLING_TEMP,
    OPPONENT_POOL_RULE_RATIO: OPPONENT_POOL_RULE_RATIO,
    OPPONENT_POOL_RANDOM_RATIO: OPPONENT_POOL_RANDOM_RATIO,
    // 资源配置
    Res: Res
};
