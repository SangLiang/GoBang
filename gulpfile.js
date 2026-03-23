var gulp = require("gulp");
var connect = require("gulp-connect");
var browserify = require("browserify");
var babelify = require("babelify");
var source = require("vinyl-source-stream");
var path = require("path");
var fancyLog = require("fancy-log");
var chokidar = require("chokidar");
var streamFinished = require("util").promisify(require("stream").finished);

// 开发监听引用，避免 watcher 被 GC
var devFileWatcher = null;
var debounceTimers = {};

function debounce(key, ms, fn) {
	clearTimeout(debounceTimers[key]);
	debounceTimers[key] = setTimeout(fn, ms);
}

function normalizeWatchPath(filePath) {
	if (!filePath) {
		return "";
	}
	var abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
	return path.normalize(abs);
}

function relFromProject(absPath) {
	return path.relative(__dirname, absPath).split(path.sep).join("/");
}

function copyHtmlStream() {
	return gulp.src("./index.html")
		.pipe(gulp.dest("./dist"))
		.pipe(connect.reload());
}

function copyConfigStream() {
	return gulp.src("./config.js")
		.pipe(gulp.dest("./dist"))
		.pipe(connect.reload());
}

function copyCssStream() {
	return gulp.src("./public/css/style.css")
		.pipe(gulp.dest("./dist/css"))
		.pipe(connect.reload());
}

/** Browserify 打包；watch 与 gulp brow 共用，须在本进程执行以便 connect.reload 生效 */
function buildMainJsStream() {
	fancyLog("正在打包 public/js → dist/js/main.js …");
	return browserify({
		entries: path.join(__dirname, "public/js/main.js"),
		debug: true,
		cache: {},
		packageCache: {}
	})
		.transform(babelify, { presets: ["@babel/preset-env"] })
		.bundle()
		.on("error", function (err) {
			fancyLog.error(err.message);
			this.emit("end");
		})
		.pipe(source("main.js"))
		.pipe(gulp.dest("./dist/js"))
		.pipe(connect.reload());
}

var jsBuildRunning = false;
var jsBuildPending = false;

function scheduleJsRebuild() {
	if (jsBuildRunning) {
		jsBuildPending = true;
		return;
	}
	jsBuildRunning = true;
	streamFinished(buildMainJsStream())
		.catch(function (err) {
			if (err) {
				fancyLog.error("打包异常: " + (err.message || err));
			}
		})
		.then(function () {
			jsBuildRunning = false;
			if (jsBuildPending) {
				jsBuildPending = false;
				scheduleJsRebuild();
			}
		});
}

function runCopyStream(streamFactory, label) {
	streamFinished(streamFactory())
		.then(function () {
			fancyLog(label + " 完成");
		})
		.catch(function (err) {
			fancyLog.error(label + " 失败: " + (err && err.message));
		});
}

gulp.task("copy:html", function () {
	return copyHtmlStream();
});

gulp.task("copy:config", function () {
	return copyConfigStream();
});

gulp.task("copy:hamster", function () {
	return gulp.src("./public/js/hamster.min.js")
		.pipe(gulp.dest("./dist/js"));
});

gulp.task("copy:css", function () {
	return copyCssStream();
});

gulp.task("copy:resource", function (done) {
	require("child_process").exec("xcopy /E /I /Y .\\public\\resource .\\dist\\resource", done);
});

gulp.task("copy", gulp.parallel("copy:html", "copy:config", "copy:hamster", "copy:css", "copy:resource"));

gulp.task("webserver", function (done) {
	// connect.server 须在就绪时调用回调，否则 series 会卡住，watch 不会注册
	connect.server({
		port: 5000,
		livereload: true,
		root: path.resolve(__dirname, "dist")
	}, done);
});

gulp.task("brow", function () {
	return buildMainJsStream();
});

gulp.task("watch", function () {
	var paths = [
		path.join(__dirname, "public", "js"),
		path.join(__dirname, "index.html"),
		path.join(__dirname, "public", "css"),
		path.join(__dirname, "config.js")
	];
	fancyLog("监听: " + paths.map(function (p) { return path.relative(__dirname, p); }).join(", "));

	devFileWatcher = chokidar.watch(paths, {
		usePolling: true,
		interval: 300,
		binaryInterval: 600,
		ignoreInitial: true,
		awaitWriteFinish: {
			stabilityThreshold: 200,
			pollInterval: 100
		}
	});

	devFileWatcher.on("ready", function () {
		fancyLog("chokidar 就绪");
	});

	devFileWatcher.on("all", function (event, filePath) {
		var rel = relFromProject(normalizeWatchPath(filePath));
		var isJs = rel.indexOf("public/js/") === 0 && rel.slice(-3) === ".js";
		// Windows 下保存可能是 unlink/add，不只 change
		if (isJs && event !== "addDir" && event !== "unlinkDir") {
			debounce("brow", 150, function () {
				fancyLog("[watch] " + rel);
				scheduleJsRebuild();
			});
			return;
		}
		if (rel === "index.html" && (event === "change" || event === "add" || event === "unlink")) {
			debounce("html", 150, function () {
				fancyLog("[watch] " + rel);
				runCopyStream(copyHtmlStream, "copy:html");
			});
			return;
		}
		if (rel.indexOf("public/css/") === 0 && rel.slice(-4) === ".css" && event !== "addDir" && event !== "unlinkDir") {
			debounce("css", 150, function () {
				fancyLog("[watch] " + rel);
				runCopyStream(copyCssStream, "copy:css");
			});
			return;
		}
		if (rel === "config.js" && event !== "addDir" && event !== "unlinkDir") {
			debounce("config", 150, function () {
				fancyLog("[watch] " + rel);
				runCopyStream(copyConfigStream, "copy:config");
			});
		}
	});

	devFileWatcher.on("error", function (err) {
		fancyLog.error("监听错误: " + err);
	});
});

gulp.task("default", gulp.series("copy", "brow", "webserver", "watch", function (done) {
	fancyLog("开发服务: http://localhost:5000 （Ctrl+C 结束）");
	done();
}));
