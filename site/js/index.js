document.addEventListener('DOMContentLoaded', function(event) {
    var container = document.querySelector('#posts');
    var msnry = new Masonry( container, {
        // options...
        itemSelector: '.home-post',
        columnWidth: 330
    });
});