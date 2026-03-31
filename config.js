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
