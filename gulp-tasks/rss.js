var RSS = require('rss');
var fs = require('fs');
var feed;

module.exports = function (gulp) {
    return {
        initiate: function() {
            feed = new RSS({
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
        },
        create: function(posts) {
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
    }
};

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