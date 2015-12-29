var fs = require('fs');
var jsdom = require('jsdom');
var markdown = require('gulp-markdown');

module.exports = function (gulp) {
    return {
        process: function(filename, contentType, callback) {
            var post = {
                md: filename,
                html: filename.replace('md', 'html'),
                settings: {}
            }
            fs.readFile('site/content/'+contentType+'/'+post.md, 'utf8', function(err, data) {
                var lines = data.split('\n');
                var postContent = '';
                for (var i = 0, l = lines.length; i < l; i++) {
                    var setting = lines[i].match('(.*)\::');
                    if (setting) {
                        post.settings[setting[1]] = lines[i].split(setting[0] + ' ')[1];
                        if (setting[1] == 'date') post.settings.formattedDate = formatDate(post.settings.date);
                    }
                    else postContent += lines[i] + '\n';
                }

                post.path = post.settings.type == 'post' ? post.settings.date.split('-')[0] : '';

                fs.writeFile('processing/'+post.md, postContent, 'utf8', function () {
                    gulp.src('processing/'+post.md)
                        .pipe(markdown())
                        .pipe(gulp.dest('processing'))
                        .on('end', function () {
                            fs.readFile('processing/'+post.html, 'utf8', function (err, content) {
                                post.settings.content = content;
                                //console.log(content);
                                jsdom.env(content, function (errors, window) {
                                    post.settings.extract = window.document.getElementsByTagName('p')[0].innerHTML;
                                    post.settings.url = post.path + '/' + post.html;
                                    window.close();
                                    callback(post);
                                    //fs.unlink(post.md);
                                    //fs.unlink(post.html);
                                });
                            });
                        });
                });
            });
        }
    }
};

function formatDate(date) {
    var dateSplit = date.split('-').join('&#8226;');
    return dateSplit;

//    return getOrdinal(parseInt(dateSplit[2]))+' '+getMonthName(parseInt(dateSplit[1]))+' '+dateSplit[0];
}
