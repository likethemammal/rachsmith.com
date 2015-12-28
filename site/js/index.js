//document.addEventListener('DOMContentLoaded', function(event) {
window.onload = function() {
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var textPixels;
  var stars = [];
  var rendererOptions = {
    transparent:true,
  };
  var stage = new PIXI.Stage(0x66FF99);
  var renderer = PIXI.autoDetectRenderer(900, 200, rendererOptions);
  var header = document.getElementById('home-header');
  header.appendChild(renderer.view);
  renderer.view.className = 'pixi-canvas';


  var img = new Image();
  img.src = './img/name.png';
  img.onload = function() {
    ctx.drawImage(img, 0, 62, 608, 142);

    var pix = ctx.getImageData(0,0,700,200).data;
    textPixels = [];
    for (var i = pix.length; i >= 0; i -= 4) {
      if (pix[i-1] == 255) {
        var x = (i / 4) % 700;
        var y = Math.floor(Math.floor(i/700)/4);

        if((x && x%8 == 0) && (y && y%8 == 0)) textPixels.push({x: x, y: y});
      }
    }

    createStars();
    animate();
  };

  function createStars() {
    for (var i = 0; i < 500; i++) {
      var pix = textPixels[Math.floor(Math.random()*textPixels.length)];
      createStar(pix.x, pix.y, i);
    }
  }


  function createStar(x, y, i) {
    setTimeout(function() {
      var bitmap = './img/stars/'+(i%5)+'.png';
      var texture = PIXI.Texture.fromImage(bitmap);
      // create a new Sprite using the texture
      var star = new PIXI.Sprite(texture);

      // center the sprites anchor point
      star.anchor.x = 0.5;
      star.anchor.y = 0.5;
      var size = 0.2;
      star.sizeV = Math.random()*0.2;
      star.width = size;
      star.height = size;

      // move the sprite t the center of the screen
      star.position.x = x;
      star.position.y = y;
      star.v = 0.6 + Math.random()*0.5;
      star.vx = star.v + (-0.2 + Math.random()*0.4);
      star.vy = star.v + (-0.2 + Math.random()*0.4);
      star.rotationV = -0.04 + Math.random()*0.08;

      stage.addChild(star);
      stars.push(star);
    }, i * 10);
  }

  function animate() {
    var l = stars.length;
    for(var i = 0; i < l; i++) {
      stars[i].position.x += stars[i].vx;
      stars[i].position.y -= stars[i].vy;
      stars[i].rotation += stars[i].rotationV;
      if (stars[i].width < 30) stars[i].width += stars[i].sizeV;
      if (stars[i].height < 30) stars[i].height += stars[i].sizeV;


      if (stars[i].y < 0 - stars[i].width) {
        var pix = textPixels[Math.floor(Math.random()*textPixels.length)];
        stars[i].x = pix.x;
        stars[i].y = pix.y;
        stars[i].width = 0.2;
        stars[i].height = 0.2;
      }
    }



    renderer.render(stage);
    requestAnimationFrame(animate);
  }




}