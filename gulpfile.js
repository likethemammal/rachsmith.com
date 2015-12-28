var gulp = require('gulp');
var markdown = require('gulp-markdown');
var fs = require('fs');
var jsdom = require('jsdom');
var sass = require('gulp-sass');
var watch = require('gulp-watch');
var copy = require('gulp-copy');
var minifyCss = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var RSS = require('rss');


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
});

gulp.task('update', function() {
    var posts = [];
    var processed = 0;

  var feed = new RSS({
    title: 'Rachel Smith',
    description: 'The digital home of Rachel Smith, an Aussie Interactive Developer based in sunny California',
    feed_url: 'http://rachsmith.com/rss.xml',
    site_url: 'http://rachsmith.com',
    image_url: 'http://rachsmith.com/icon.png',
    managingEditor: 'Rachel Smith',
    webMaster: 'Rachel Smith',
    copyright: '2015 Rachel Smith',
    language: 'en',
    categories: ['Web Development'],
    pubDate: pubDate(),
    ttl: '60'
  });

    // process posts
    fs.readdir('site/content/posts', function(err, files) {
        var allPosts = [];
        for(var i = 0, l = files.length; i < l; i++) {
          processMarkdown(files[i], 'posts', function (post) {
            if (post.settings.published == 'true') posts.push(post);
            if (post.settings.type != 'link' && post.settings.type != 'codepen') generateHTML(post, 'posts');
            allPosts.push(post);
            processed++;
            if (processed == files.length) {
              createRSS(feed, allPosts);
              createBlog(posts, feed);
            }
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


    gulp.src('site/js/*.js')
        .pipe(uglify())
        .pipe(gulp.dest('build/js', {prefix: 1}));

    gulp.src('site/img/**/*')
        .pipe(copy('build', {prefix: 1}));


});

function createRSS(feed, posts) {

  posts.sort(function(a,b) {
    return b.settings.date.split('-').join('') - a.settings.date.split('-').join('');
  });

  for (var i = 0; i < posts.length; i++) {
    var post = posts[i];
    feed.item({
      title:  post.settings.title,
      description: (post.settings.type == 'link' || post.settings.type == 'codepen') ? "" : post.settings.content,
      url: (post.settings.type == 'link' || post.settings.type == 'codepen') ? post.settings.link : 'http://rachsmith.com/'+post.settings.url, // link to the item
      categories: [post.settings.category], // optional - array of item categories
      date: post.settings.date // any format that js Date can parse.
    });
  }

  var xml = feed.xml();
  fs.writeFile('build/rss.xml', xml, 'utf8');
}

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
    var dateSplit = date.split('-').join('&#8226;');
    return dateSplit;

//    return getOrdinal(parseInt(dateSplit[2]))+' '+getMonthName(parseInt(dateSplit[1]))+' '+dateSplit[0];
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

function createBlog(posts, feed) {
    posts.sort(function(a,b) {
        return b.settings.date.split('-').join('') - a.settings.date.split('-').join('');
    });
    var writingCount = 0, updatesCount = 0, pensCount = 0;
    var allHTML = '';
    var writingHTML = '';
    var updatesHTML = '';
    var pensHTML = '';
    var processed = 0;
    for(var i = 0, l = posts.length; i < l; i++) {
        var post = posts[i];
        createPostHTML(post, function(post) {
            processed++;
            if(processed == posts.length) {
                for(var k = 0, kl = posts.length; k < kl; k++) {
                  if (posts[k].settings.category == 'writing' && writingCount < 10) {
                      writingHTML += posts[k].indexHTML;
                      writingCount++;
                  }
                  if (posts[k].settings.category == 'update' && updatesCount < 5) {
                      updatesHTML += posts[k].indexHTML;
                      updatesCount++;
                  }
                  if (posts[k].settings.category == 'pen' && pensCount < 5) {
                      pensHTML += posts[k].indexHTML;
                      pensCount++;
                  }
                  allHTML += posts[k].indexHTML;
                }

                createIndex(writingHTML, updatesHTML, pensHTML);
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

function createIndex(writingHTML, updatesHTML, pensHTML) {
    fs.readFile('site/content/templates/index/index.html', 'utf8', function(err, indexTemplate) {
        indexTemplate = indexTemplate.replace('{{writing}}', writingHTML);
        indexTemplate = indexTemplate.replace('{{pens}}', pensHTML);
        indexTemplate = indexTemplate.replace('{{updates}}', updatesHTML);
        fs.writeFile('build/index.html', indexTemplate, 'utf8');
    });
}

function createAllPage(allHTML) {
  fs.readFile('site/content/templates/all/all.html', 'utf8', function(err, allTemplate) {
    allTemplate = allTemplate.replace('{{all}}', allHTML);
    fs.writeFile('build/all.html', allTemplate, 'utf8');
  });
}

/**
 * Get an RSS pubDate from a Javascript Date instance.
 * @param Date - optional
 * @return String
 */
function pubDate(date) {

  if (typeof date === 'undefined') {
    date = new Date();
  }

  var pieces     = date.toString().split(' '),
    offsetTime = pieces[5].match(/[-+]\d{4}/),
    offset     = (offsetTime) ? offsetTime : pieces[5],
    parts      = [
        pieces[0] + ',',
      pieces[2],
      pieces[1],
      pieces[3],
      pieces[4],
      offset
    ];

  return parts.join(' ');
}