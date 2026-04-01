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
 * EVOLVE_GAMES_PER_INDIVIDUAL — 每个个体评估局数
 * EVOLVE_MIXED — 混合模式：1=每局随机选择对手（需设置种子文件）
 * EVOLVE_MIXED_RATIO — 混合模式下选择 Rule AI 的概率（0~1）
 * EVOLVE_SEED_FILE — 种子权重文件路径（从已有权重继续训练）
 * EVOLVE_SEED_RATIO — 首代中使用种子初始化的占比（0~1）
 * EVOLVE_SEED_MUTATION_RANGE — 种子扰动幅度
 */
var EVOLVE_POPULATION = 50;
var EVOLVE_GENERATIONS = 50;
var EVOLVE_GAMES_PER_INDIVIDUAL = 8;
var EVOLVE_MIXED = 1;
var EVOLVE_MIXED_RATIO = 0.5;
var EVOLVE_SEED_FILE = "data/ai-training.json";
var EVOLVE_SEED_RATIO = 0.8;
var EVOLVE_SEED_MUTATION_RANGE = 0.3;

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
    EVOLVE_MIXED: EVOLVE_MIXED,
    EVOLVE_MIXED_RATIO: EVOLVE_MIXED_RATIO,
    EVOLVE_SEED_FILE: EVOLVE_SEED_FILE,
    EVOLVE_SEED_RATIO: EVOLVE_SEED_RATIO,
    EVOLVE_SEED_MUTATION_RANGE: EVOLVE_SEED_MUTATION_RANGE,
    // 资源配置
    Res: Res
};
