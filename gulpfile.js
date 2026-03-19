var gulp = require('gulp');
var connect = require('gulp-connect');
var concat = require('gulp-concat');
var browserify = require("browserify");
var babelify = require("babelify");
var source = require('vinyl-source-stream');

gulp.task('webserver', function () {
	connect.server({
		port: 5000,
		livereload: false,
		root: './'
	});
});

gulp.task('brow', function () {
	return browserify({
		entries: "./public/js/main.js",
		debug: true
	})
		.transform(babelify, { presets: ['@babel/preset-env'] })
		.bundle()
		.pipe(source('main.js'))
		.pipe(gulp.dest('./'))
		.pipe(connect.reload());
});

gulp.task('watch', function () {
	gulp.watch("./public/js/*.js", gulp.series('brow'));
});

gulp.task('default', gulp.series('brow', 'webserver', 'watch', function (done) {
	console.log("Server is running now");
	done();
}));
