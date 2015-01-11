var gulp = require('gulp');
var markdown = require('gulp-markdown');
var fs = require('fs');
var jsdom = require('jsdom');
var sass = require('gulp-sass');
var watch = require('gulp-watch');


gulp.task('styles', function() {
    gulp.src('site/scss/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('build/css'))
        .on('end', function() {
            console.log('styles updated');
        });
});

gulp.task('watch', function() {
    gulp.watch('site/scss/*.scss', ['styles']);
});

gulp.task('update', function() {
    var posts = [];
    var processed = 0;
    // process posts
    fs.readdir('site/content/posts', function(err, files) {
        for(var i = 0, l = files.length; i < l; i++) {
            processMarkdown(files[i], 'posts', function(post) {
                if(post.settings.published == 'true') posts.push(post);
                generateHTML(post, 'posts');
                processed++;
                if(processed == files.length) createBlog(posts);
            });
        }
    });

    // process pages
    fs.readdir('site/content/pages', function(err, files) {
        for(var i = 0, l = files.length; i < l; i++) {
            processMarkdown(files[i], 'pages', function(page) {
                generateHTML(page, 'pages');
            });
        }
    });
});

function processMarkdown(filename, contentType, callback) {
    var post = {
        md: filename,
        html: filename.replace('md', 'html'),
        settings: {}
    }

    fs.readFile('site/content/'+contentType+'/'+post.md, 'utf8', function(err, data) {
        var lines = data.split('\n');
        var postContent = '';
        for(var i = 0, l = lines.length; i < l; i++) {
            var setting = lines[i].match('(.*)\::');
            if (setting) {
                post.settings[setting[1]] = lines[i].split(setting[0] + ' ')[1];
            }
            else postContent += lines[i] + '\n';
        }

        post.path = post.settings.type == 'post' ? post.settings.date.split('-')[0] : '';

        fs.writeFile(post.md, postContent, 'utf8', function() {
            gulp.src(post.md)
                .pipe(markdown())
                .pipe(gulp.dest(''))
                .on('end', function() {
                    fs.readFile(post.html, 'utf8', function(err, content) {
                        post.settings.content = content;
                        jsdom.env(content, function (errors, window) {
                            post.settings.extract = window.document.getElementsByTagName('p')[0].innerHTML;
                            post.settings.url = post.path+'/'+post.html;
                            window.close();
                            callback(post);
                            fs.unlink(post.md);
                            fs.unlink(post.html);
                        });
                    });
                });
        });

    });
}

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
    var postsHTML = '';
    for(var i = 0, l = posts.length; i < l; i++) {
        var post = posts[i];
        fs.readFile('site/content/templates/index/'+post.settings.type+'.html', 'utf8', function(err, template) {
            var toReplace = template.match(new RegExp('\{{(.*?)\}}', 'g'));
            for(var i = 0, l = toReplace.length; i < l; i++) {
                template = template.replace(toReplace[i], post.settings[toReplace[i]
                    .replace(new RegExp('\{{|\}}', 'g'), '')] || '');
            }

            postsHTML += template;

            fs.readFile('site/content/templates/index/index.html', 'utf8', function(err, indexTemplate) {
                indexTemplate = indexTemplate.replace('{{posts}}', postsHTML);
                fs.writeFile('build/index.html', indexTemplate, 'utf8');
            });
        });
    }
}