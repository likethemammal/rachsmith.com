var fs = require('fs');
var posts = [];
var processed = 0;

module.exports = function (gulp, rss, md) {
    return {
        processPosts: function() {
            // process posts
            fs.readdir('site/content/posts', function (err, files) {
                var scripts = fs.readFileSync('site/content/templates/shared/scripts.html', 'utf8');
                var footer = fs.readFileSync('site/content/templates/shared/footer.html', 'utf8');
                var allPosts = [];
                for (var i = 0, l = files.length; i < l; i++) {
                    md.process(files[i], 'posts', function (post) {
                        if (post.settings.published == 'true') posts.push(post);
                        if (post.settings.type != 'link' && post.settings.type != 'codepen') generateHTML(post, 'posts');
                        post.settings.scripts = scripts;
                        post.settings.footer = footer;
                        console.log(post.settings);
                        allPosts.push(post);
                        processed++;
                        if (processed == files.length) {
                            rss.create(allPosts);
                            createBlog(posts);
                        }
                    });
                }
            });
        },
        processPages: function() {
            fs.readdir('site/content/pages', function(err, files) {
                for(var i = 0, l = files.length; i < l; i++) {
                    md.process(files[i], 'pages', function(page) {
                        generateHTML(page, 'pages');
                    });
                }
            });
        }
    }
};

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

function writePost(post, html) {
    if (!fs.existsSync('build/'+post.path)) {
        fs.mkdirSync('build/'+post.path);
    }

    fs.writeFile('build/'+post.path+'/'+post.html, html, 'utf8');
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