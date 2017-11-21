var gulp = require('gulp');
var webserver = require('gulp-webserver');
var concat = require('gulp-concat');
var browserify = require("gulp-browserify");
// var rename = require('gulp-rename');
// var uglify = require('gulp-uglify');

gulp.task('webserver', function () {
	return gulp.src('./')
		.pipe(webserver({
			port:5000,
			livereload: true,
			directoryListing: true,
			open: 'http://127.0.0.1:5000/index.html',
		}));
});

/** 整合js */
gulp.task('brow', function() {
	return gulp.src("public/js/main.js")
		.pipe(browserify({
			insertGlobals: true,
			debug: !gulp.env.production
		}))
		.pipe(gulp.dest('./'));
});

// 监听任务
gulp.task('watch', function () {
	// gulp.watch("./public/sass/*.scss", ['sass']);
	// gulp.watch(core_list, ["concat"]);
	gulp.watch("./public/js/*.js",["brow"]);
});

gulp.task('default', ['brow',"webserver","watch"], function() {
	console.log("Server is running now");
});