var gulp = require('gulp');
var markdown = require('gulp-markdown');
var fs = require('fs');
var jsdom = require('jsdom');
var sass = require('gulp-sass');
var watch = require('gulp-watch');
var copy = require('gulp-copy');


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
    gulp.watch('site/**/*', ['update']);
});

gulp.task('update', function() {
    var posts = [];
    var processed = 0;
    // process posts
    fs.readdir('site/content/posts', function(err, files) {
        for(var i = 0, l = files.length; i < l; i++) {
            processMarkdown(files[i], 'posts', function(post) {
                if(post.settings.published == 'true') posts.push(post);
                if(post.settings.type != 'link' && post.settings.type != 'codepen') generateHTML(post, 'posts');
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

    gulp.src('site/js/**/*.js')
        .pipe(copy('build', {prefix: 1}));

    gulp.src('site/img/**/*')
        .pipe(copy('build', {prefix: 1}));
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
                if(setting[1] == 'date') post.settings.formattedDate = formatDate(post.settings.date);
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

function formatDate(date) {
    var dateSplit = date.split('-');

    return getOrdinal(parseInt(dateSplit[2]))+' '+getMonthName(parseInt(dateSplit[1]))+' '+dateSplit[0];
}

function getOrdinal(n) {
    var s=["th","st","nd","rd"],
        v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
}

function getMonthName(n) {
    switch(n) {
        case 1: return 'Jan'; break;
        case 2: return 'Feb'; break;
        case 3: return 'Mar'; break;
        case 4: return 'Apr'; break;
        case 5: return 'May'; break;
        case 6: return 'Jun'; break;
        case 7: return 'Jul'; break;
        case 8: return 'Aug'; break;
        case 9: return 'Sep'; break;
        case 10: return 'Oct'; break;
        case 11: return 'Nov'; break;
        case 12: return 'Dec'; break;
    }
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
    posts.sort(function(a,b) {
        return b.settings.date.split('-').join('') - a.settings.date.split('-').join('');
    });
    var postsHTML = '';
    var processed = 0;
    for(var i = 0, l = posts.length; i < l; i++) {
        var post = posts[i];
        createPostHTML(post, function(post) {
            processed++;
            if(processed == posts.length) {
                for(var k = 0, kl = posts.length; k < kl; k++) {
                    postsHTML += posts[k].indexHTML;
                }
                createIndex(postsHTML);
            }
        })
    }
}

function createPostHTML(post, callback) {
    fs.readFile('site/content/templates/index/'+post.settings.type+'.html', 'utf8', function(err, template) {
        console.log(err);
        var toReplace = template.match(new RegExp('\{{(.*?)\}}', 'g'));
        for(var i = 0, l = toReplace.length; i < l; i++) {
            template = template.replace(toReplace[i], post.settings[toReplace[i]
                .replace(new RegExp('\{{|\}}', 'g'), '')] || '');
        }
        post.indexHTML = template;
        callback(post);
    });
}

function createIndex(postsHTML) {
    fs.readFile('site/content/templates/index/index.html', 'utf8', function(err, indexTemplate) {
        indexTemplate = indexTemplate.replace('{{posts}}', postsHTML);
        fs.writeFile('build/index.html', indexTemplate, 'utf8');
    });
}