var fs = require('fs');
var posts = [];
var patterns = 4;
var colors = ['#3d3b7d', '#0d0630', '#f03a47', '#40a189', '#8c1a6a'];

module.exports = function (gulp, rss, md) {
    return {
        processPosts: function() {
            // process posts
            var indexPattern = 1;
            var postPattern = 1;
            var color = 0;
            fs.readdir('site/content/posts', function (err, files) {
                var scripts = fs.readFileSync('site/content/templates/shared/scripts.html', 'utf8');
                var footer = fs.readFileSync('site/content/templates/shared/footer.html', 'utf8');
                var allPosts = [], writtenPosts = [];
                processPosts(files, function(posts) {
                    posts.sort(function(a,b) {
                        return b.settings.date.split('-').join('') - a.settings.date.split('-').join('');
                    });

                    for (var i = 0; i < posts.length; i++) {
                        var post = posts[i];
                        post.settings.scripts = scripts;
                        post.settings.footer = footer;
                        if (post.settings.published != 'true') continue;
                        if (post.settings.type == 'post') {
                            post.settings.cssClass = 'pattern-'+postPattern;
                            post.settings.backgroundColor = colors[color];
                            color++;
                            postPattern++;
                            if (color >= colors.length) color = 0;
                            if (postPattern > patterns) postPattern = 1;
                            writtenPosts.push(post);
                        } else {
                            post.settings.cssClass = 'pattern-'+indexPattern;
                            indexPattern++;
                            if (indexPattern > patterns) indexPattern = 1;
                        }
                        allPosts.push(post);
                    }

                    createHTML();
                    rss.create(allPosts);
                    createBlog(allPosts);
                })

                function processPosts(files, callback) {
                    var processed = 0;
                    var posts = [];
                    for (var i = 0, l = files.length; i < l; i++) {
                        md.process(files[i], 'posts', function (post) {
                            processed++;
                            posts.push(post);
                            if (posts.length == files.length) {
                                callback(posts);
                            }
                        });
                    }
                }

                function createHTML() {
                    for (var i = 0; i < writtenPosts.length; i++) {
                        if (writtenPosts[i-1] && writtenPosts[i-1].settings.url && writtenPosts[i-1].settings.title) {
                            writtenPosts[i].settings['prev-link'] = '<section class="post-link prev"><p>Previous thought: <a href="'+writtenPosts[i-1].settings.url+'">'+writtenPosts[i-1].settings.title+'</a></p></section>';
                        }
                        if (writtenPosts[i+1] && writtenPosts[i+1].settings.url && writtenPosts[i+1].settings.title) {
                            writtenPosts[i].settings['next-link'] = '<section class="post-link next"><p>Next thought: <a href="'+writtenPosts[i+1].settings.url+'">'+writtenPosts[i+1].settings.title+'</a></p></section>';
                        }
                        generateHTML(writtenPosts[i], 'posts');
                    }
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
    var processed = 0;
    var pages = Math.floor(posts.length/9);

    for(var i = 0, l = posts.length; i < l; i++) {
        var post = posts[i];
        createPostHTML(post, function(post) {
            processed++;
            if(processed == posts.length) {
                for(var p = 0; p < pages; p++) {
                    createPage(p, posts, pages);
                }
            }
        })
    }
}

function createPage(page, posts, pages) {
    var html = '';
    for (var i = page*9; i < (page*9)+9; i++) {
        if (posts[i]) html += posts[i].indexHTML;
    }

    createIndexPageHTML(page, html, pages);
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

function createIndexPageHTML(page, allHTML, pages) {
    var pageName = 'index.html';
    if (page) pageName = (page+1)+'.html';
    var scripts = fs.readFileSync('site/content/templates/shared/scripts.html', 'utf8');
    var footer = fs.readFileSync('site/content/templates/shared/footer.html', 'utf8');
    fs.readFile('site/content/templates/index/index.html', 'utf8', function(err, indexTemplate) {
        var previousLink = page == pages ? '' : '<a href="'+(page+2)+'.html">< Earlier Posts</a>';
        var nextLink = page == 0 ? '' : page == 1 ? '<a href="index.html">Later Posts ></a>'
            : '<a href="'+(page)+'.html">Later Posts ></a>';
        indexTemplate = indexTemplate.replace('{{posts}}', allHTML);
        indexTemplate = indexTemplate.replace('{{scripts}}', scripts);
        indexTemplate = indexTemplate.replace('{{footer}}', footer);
        indexTemplate = indexTemplate.replace('{{prev-page-link}}', previousLink);
        indexTemplate = indexTemplate.replace('{{next-page-link}}', nextLink);
        fs.writeFile('build/'+pageName, indexTemplate, 'utf8');
    });
}

function createAllPage(allHTML) {
    fs.readFile('site/content/templates/all/all.html', 'utf8', function(err, allTemplate) {
        allTemplate = allTemplate.replace('{{all}}', allHTML);
        fs.writeFile('build/all.html', allTemplate, 'utf8');
    });
}