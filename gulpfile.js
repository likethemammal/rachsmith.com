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
    gulp.watch('site/**/*', ['update']);
    gulp.watch('*.html', notifyLivereload);
});

gulp.task('update', function() {
    var posts = [];
    var processed = 0;

    // init feed
    rss.initiate();

    // process posts
    fs.readdir('site/content/posts', function(err, files) {
        var allPosts = [];
        for(var i = 0, l = files.length; i < l; i++) {
          md.process(files[i], 'posts', function (post) {
            if (post.settings.published == 'true') posts.push(post);
            if (post.settings.type != 'link' && post.settings.type != 'codepen') generateHTML(post, 'posts');
            allPosts.push(post);
            processed++;
            if (processed == files.length) {
              rss.create(allPosts);
              createBlog(posts);
            }
          });
        }
    });

    // process pages
    fs.readdir('site/content/pages', function(err, files) {
        for(var i = 0, l = files.length; i < l; i++) {
            md.process(files[i], 'pages', function(page) {
                generateHTML(page, 'pages');
            });
        }
    });

    gulp.src('site/js/*.js')
        .pipe(uglify())
        .pipe(gulp.dest('build/js', {prefix: 1}))
        .pipe(livereload());

    gulp.src('site/img/**/*')
        .pipe(copy('build', {prefix: 1}));
});



function generateHTML(post, contentType) {
    fs.readFile('site/content/templates/'+contentType+'/'+post.settings.type+'.html', 'utf8', function(err, template) {
        var toReplace = template.match(new RegExp('\{{(.*?)\}}', 'g'));
        for(var i = 0, l = toReplace.length; i < l; i++) {
            template = template.replace(toReplace[i], post.settings[toReplace[i]
                .replace(new RegExp('\{{|\}}', 'g'), '')] || '');
        }
        writePost(post, template);
    });
}

function writePost(post, template) {
    if (!fs.existsSync('build/'+post.path)) {
        fs.mkdirSync('build/'+post.path);
    }

    fs.writeFile('build/'+post.path+'/'+post.html, template, 'utf8');
}

function createBlog(posts) {
    posts.sort(function(a,b) {
        return b.settings.date.split('-').join('') - a.settings.date.split('-').join('');
    });
    var allHTML = '';
    var processed = 0;
    for(var i = 0, l = posts.length; i < l; i++) {
        var post = posts[i];
        createPostHTML(post, function(post) {
            processed++;
            if(processed == posts.length) {
                for(var k = 0, kl = posts.length; k < kl; k++) {
                  allHTML += posts[k].indexHTML;
                }
                createIndex(allHTML);
                createAllPage(allHTML);
            }
        })
    }
}

function createPostHTML(post, callback) {
    fs.readFile('site/content/templates/index/'+post.settings.type+'.html', 'utf8', function(err, template) {
        var toReplace = template.match(new RegExp('\{{(.*?)\}}', 'g'));
        for(var i = 0, l = toReplace.length; i < l; i++) {
            template = template.replace(toReplace[i], post.settings[toReplace[i]
                .replace(new RegExp('\{{|\}}', 'g'), '')] || '');
        }
        post.indexHTML = template;
        callback(post);
    });
}

function createIndex(allHTML) {
    fs.readFile('site/content/templates/index/index.html', 'utf8', function(err, indexTemplate) {
        indexTemplate = indexTemplate.replace('{{posts}}', allHTML);
        fs.writeFile('build/index.html', indexTemplate, 'utf8');
    });
}

function createAllPage(allHTML) {
  fs.readFile('site/content/templates/all/all.html', 'utf8', function(err, allTemplate) {
    allTemplate = allTemplate.replace('{{all}}', allHTML);
    fs.writeFile('build/all.html', allTemplate, 'utf8');
  });
}

