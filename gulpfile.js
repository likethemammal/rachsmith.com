var gulp = require('gulp');
var fs = require('fs');
var sass = require('gulp-sass');
var watch = require('gulp-watch');
var copy = require('gulp-copy');
var minifyCss = require('gulp-cssnano');
var uglify = require('gulp-uglify');
var livereload = require('gulp-livereload');

var EXPRESS_PORT = 4000;
var EXPRESS_ROOT = __dirname+'/build';
var LIVERELOAD_PORT = 35729;
var lr;

var md = require('./gulp-tasks/markdown')(gulp);
var rss = require('./gulp-tasks/rss')(gulp);
var blog = require('./gulp-tasks/blog')(gulp, rss, md);

function startExpress() {
    var express = require('express');
    var app = express();
    app.use(require('connect-livereload')());
    app.use(express.static(EXPRESS_ROOT));
    app.listen(EXPRESS_PORT);
}

function startLivereload() {
    lr = require('tiny-lr')();
    lr.listen(LIVERELOAD_PORT);
}

function notifyLivereload(event) {
    gulp.src(event.path, {read: false})
        .pipe(livereload(lr));
}

// default task
gulp.task('default', ['start-servers', 'watch']);

gulp.task('start-servers', function () {
    startExpress();
    startLivereload();
});

gulp.task('styles', function() {
    gulp.src('site/scss/*.scss')
        .pipe(sass())
        .pipe(minifyCss())
        .pipe(gulp.dest('build/css'))
        .on('end', function() {
            console.log('styles updated');
        });
});

gulp.task('watch', function() {
    gulp.watch('site/scss/*.scss', ['styles']);
    gulp.watch('site/**/*.html', ['update']);
    gulp.watch('build/*.html', notifyLivereload);
});

gulp.task('update', function() {
    // init feed
    rss.initiate();

    // process posts
    blog.processPosts();

    // process pages
    blog.processPages();

    // javascript
    gulp.src('site/js/*.js')
        .pipe(uglify())
        .pipe(gulp.dest('build/js', {prefix: 1}))
        .pipe(livereload());

    // copy images
    gulp.src('site/img/**/*')
        .pipe(copy('build', {prefix: 1}));
});






