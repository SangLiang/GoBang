/**
 * 最简训练数据 API：读写 JSON 文件，供日后神经进化/对局记录持久化。
 * 与 gulp 静态服（默认 5000）分离，默认端口 3847，避免冲突。
 *
 * 启动：npm run server
 */

var express = require("express");
var fs = require("fs");
var path = require("path");

var PORT = parseInt(process.env.TRAINING_API_PORT || "3847", 10);
var DATA_DIR = path.join(__dirname, "..", "data");
var TRAINING_FILE = path.join(DATA_DIR, "ai-training.json");

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

var app = express();
app.use(express.json({ limit: "20mb" }));

app.use(function (req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	if (req.method === "OPTIONS") {
		return res.sendStatus(204);
	}
	next();
});

app.get("/api/health", function (req, res) {
	res.json({ ok: true, service: "gobang-training-api" });
});

/**
 * GET /api/training
 * 返回上次保存的完整 JSON；无文件时 data 为 null。
 */
app.get("/api/training", function (req, res) {
	ensureDataDir();
	if (!fs.existsSync(TRAINING_FILE)) {
		return res.json({ ok: true, data: null });
	}
	try {
		var raw = fs.readFileSync(TRAINING_FILE, "utf8");
		res.json({ ok: true, data: JSON.parse(raw) });
	} catch (e) {
		res.status(500).json({ ok: false, error: String(e.message) });
	}
});

/**
 * POST /api/training
 * body 任意 JSON，会写入 data/ai-training.json，并自动加上 savedAt。
 */
app.post("/api/training", function (req, res) {
	ensureDataDir();
	var record = {};
	var k;
	for (k in req.body) {
		if (Object.prototype.hasOwnProperty.call(req.body, k)) {
			record[k] = req.body[k];
		}
	}
	record.savedAt = new Date().toISOString();
	try {
		fs.writeFileSync(TRAINING_FILE, JSON.stringify(record, null, 2), "utf8");
		res.json({ ok: true, savedAt: record.savedAt });
	} catch (e) {
		res.status(500).json({ ok: false, error: String(e.message) });
	}
});

/**
 * PUT /api/training/append
 * body: { entry: {...} } 将 entry 追加到 records 数组（用于多条训练日志）。
 * 若文件不存在或没有 records，会初始化。
 */
app.put("/api/training/append", function (req, res) {
	ensureDataDir();
	var entry = req.body && req.body.entry;
	if (entry === undefined) {
		return res.status(400).json({ ok: false, error: "需要 JSON body: { entry: ... }" });
	}
	var wrap = {
		savedAt: new Date().toISOString(),
		entry: entry
	};
	var store = { records: [] };
	if (fs.existsSync(TRAINING_FILE)) {
		try {
			store = JSON.parse(fs.readFileSync(TRAINING_FILE, "utf8"));
			if (!Array.isArray(store.records)) {
				store = { records: [store] };
			}
		} catch (e) {
			store = { records: [] };
		}
	}
	store.records.push(wrap);
	try {
		fs.writeFileSync(TRAINING_FILE, JSON.stringify(store, null, 2), "utf8");
		res.json({ ok: true, count: store.records.length });
	} catch (e) {
		res.status(500).json({ ok: false, error: String(e.message) });
	}
});

app.listen(PORT, function () {
	console.log("[GoBang training API] http://127.0.0.1:" + PORT);
	console.log("  GET  /api/training        读取 data/ai-training.json");
	console.log("  POST /api/training        覆盖保存（整块 JSON）");
	console.log("  PUT  /api/training/append 追加一条到 records[]");
});
