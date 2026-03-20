var gulp = require('gulp');
var connect = require('gulp-connect');
var browserify = require("browserify");
var babelify = require("babelify");
var source = require('vinyl-source-stream');
var path = require('path');

gulp.task('copy:html', function () {
	return gulp.src('./index.html')
		.pipe(gulp.dest('./dist'))
		.pipe(connect.reload());
});

gulp.task('copy:config', function () {
	return gulp.src('./config.js')
		.pipe(gulp.dest('./dist'))
		.pipe(connect.reload());
});

gulp.task('copy:hamster', function () {
	return gulp.src('./public/js/hamster.min.js')
		.pipe(gulp.dest('./dist/js'));
});

gulp.task('copy:css', function () {
	return gulp.src('./public/css/style.css')
		.pipe(gulp.dest('./dist/css'));
});

gulp.task('copy:resource', function (done) {
	require('child_process').exec('xcopy /E /I /Y .\\public\\resource .\\dist\\resource', done);
});

gulp.task('copy', gulp.parallel('copy:html', 'copy:config', 'copy:hamster', 'copy:css', 'copy:resource'));

gulp.task('webserver', function () {
	connect.server({
		port: 5000,
		livereload: false,
		root: path.resolve(__dirname, 'dist')
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
		.pipe(gulp.dest('./dist/js'))
		.pipe(connect.reload());
});

gulp.task('watch', function () {
	gulp.watch("./public/js/*.js", gulp.series('brow'));
	gulp.watch("./index.html", gulp.series('copy:html'));
});

gulp.task('default', gulp.series('copy', 'brow', 'webserver', 'watch', function (done) {
	console.log("Server is running now");
	done();
}));
