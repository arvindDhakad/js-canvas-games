var context;
var bricks = [];
var padel, smileBall;
var no_of_bricks;
var audioContext;
var bg_sound_props = {
    BI_GAIN: 1,
    Q: 10,
    FREQ_MIN: 4000,
    FREQ_MAX: 20000,
    MAIN_GAIN: 1,
}
var sound_freq = bg_sound_props.FREQ_MIN;
var sound_nodes = {
    'source_drum': null,
    'source_guitar': null,
    'gain_drum': null,
    'gain_guitar': null,
    'main_gain': null,
    'biquadFilter': null,

}

var controls = {
    MOUSE: 1,
    KEYBOARD: 2,
}
var config = {
    canvas_width: 600,
    canvas_height: 400,
    padel_width: 70,
    padel_height: 10,
    ballRadius: 14,
    slideThreshold: 10,
    ballSpeedx: 5,
    ballSpeedy: -5,
    brick_width: 40,
    brick_height: 20,
    Y_THRESHOLD_ROW: 25,
    SCORE_ROW: 20,
    NO_ROWS: 5,
    control: controls.MOUSE,
    LIVES: 1,
    SCORE: 0,
    interval: 20,
}

var sounds = {
    'DRUMS': 'sounds/drums.ogg',
    'GUITAR': 'sounds/guitar.ogg',
    'COLLISION': 'sounds/bounce.mp3',
    'LEVEL_DOWN': 'sounds/level_down.mp3',
};
var sound_buffer = {};

var states = {
    'PLAY': 1,
    'PAUSE': 2,
    'START': 3,
    'GAMEOVER': 4,
}

function initgame() {
    smileBall = new createBall(30, 30, 'red', config.canvas_width / 2, config.canvas_height - 100);
    padel = new createPadel(config.padel_width, config.padel_height, 'green', config.canvas_width / 2, config.canvas_height - config.padel_height);
    gameArea.draw_init();
    // console.log(bricks);
}
var gameArea = {
    container: document.getElementById('game-container'),
    canvas: document.createElement('canvas'),
    state: states.START,
    draw_init: function() {
        this.canvas.width = config.canvas_width;
        this.canvas.height = config.canvas_height;
        context = this.canvas.getContext('2d');
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        // gameArea.interval = setInterval(updateGameArea, 20);
        initBricks();
        gameArea.score = config.SCORE;
        gameArea.lives = config.LIVES;

        if (config.control == controls.MOUSE) {
            document.addEventListener('mousemove', function(e) {
                gameArea.mouseX = e.clientX;
            });
        } else if (config.control == control.KEYBOARD) {
            window.addEventListener('keydown', function(e) {
                gameArea.key = e.keyCode;
                // console.log(e.keyCode);
            });
        }

        document.addEventListener('mousedown', function(e) {
            // if(gameArea.state){
            if (gameArea.state == states.PAUSE || gameArea.state == states.START) gameArea.play();
            else if (gameArea.state == states.PLAYING) gameArea.pause();
            else if (gameArea.state == states.GAMEOVER) gameArea.restart();
            // }``
        });
        // console.log(gameArea.state);

        initSound();
        drawBricks();
        drawScreen();
        //requestAnimationFrame(updateGameArea);
        // updateGameArea();
    },
    clear: function() {
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    pause: function() {
        // clearInterval(gameArea.interval);
        cancelAnimationFrame(gameArea.reqID);
        gameArea.state = states.PAUSE;
        drawScreen();
        muteSound();
    },
    restart: function() {
        initBricks();
        gameArea.score = config.SCORE;
        gameArea.lives = config.LIVES;
        gameArea.play();

    },
    play: function() {
        // gameArea.interval = setInterval(updateGameArea,config.interval);
        // setTimeout(function() {
        // Drawing code goes here
        //  }, 1000 / 30);
        gameArea.state = states.PLAYING;
        // console.log('PLAYING',gameArea.state);
        unmuteSound();
        gameArea.reqID = requestAnimationFrame(updateGameArea);

    },
    stop: function() {
        cancelAnimationFrame(gameArea.reqID);
        muteSound();
        gameArea.state = states.GAMEOVER;
        drawScreen();
        // gameArea.reqID = 0;
    },
}




function initBricks() {
    no_of_bricks = config.canvas_width / config.brick_width;
    // console.log(no_of_bricks);
    for (var j = 0; j < config.NO_ROWS; j++) {
        bricks[j] = new Array();
        for (var i = 0; i < no_of_bricks; i++) {
            bricks[j][i] = new createBrick(config.brick_width, config.brick_height, 'green', i * config.brick_width, config.Y_THRESHOLD_ROW + j * config.brick_height, false);
            // bricks[j][i].start();
        }
    }
}

function createBall(width, height, color_, x, y) {
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    this.color = color_;

    this.speedx = config.ballSpeedx;
    this.speedy = config.ballSpeedy;
    this.update = function() {
        ctx = context;
        ctx.beginPath();
        ctx.arc(this.x, this.y, config.ballRadius, 0, Math.PI * 2, true); // Outer circle
        ctx.fillStyle = "green";
        ctx.strokeStyle = "green";
        ctx.fill();
        // ctx.moveTo(this.x + 20, this.y);
        // ctx.arc(this.x, this.y, config.ballRadius - 10, 0, Math.PI, false); // Mouth (clockwise)
        // ctx.moveTo(this.x - 10, this.y - 10);
        // ctx.arc(this.x - 15, this.y - 10, config.ballRadius / 6, 0, Math.PI * 2, false); // Left eye
        // ctx.moveTo(this.x + 20, this.y - 10);
        // ctx.arc(this.x + 15, this.y - 10, config.ballRadius / 6, 0, Math.PI * 2, false); // Right eye
        ctx.stroke();

    }
    this.newPos = function() {
        if (this.y >= (config.canvas_height - config.padel_height - config.ballRadius)) {
            this.speedy = -this.speedy;
            // console.log('x ' + this.x, ' y ' + this.y, ' px ' + padel.x, ' py ' + padel.y);
        }
        if (this.x >= (config.canvas_width - config.ballRadius)) this.speedx = -this.speedx;
        if (this.y <= config.ballRadius) this.speedy = -this.speedy; //upper wall
        if (this.x < config.ballRadius) {
            this.speedx = -this.speedx;
        }; //left side

        this.x += this.speedx;
        this.y += this.speedy;
        //  console.log(this.x,this.y,config.ballRadius);
        // if(this.y >= (config.canvas_height-config.padel_height)) this.speedy = -this.speedy;
    }
}

function createBrick(width, height, color_, x, y, hidden) {
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    this.hidden = false;
    this.color = color_;

    this.start = function() {
        ctx = context;
        // ctx.fillStyle = color_;
        // ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.lineWidth = "2";
        ctx.strokeStyle = "red";
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();
        // if (this.x >= config.canvas_width - config.padel_width) this.x = config.canvas_width - config.padel_width;
        // if (this.x < 0) this.x = 0;
    }
}

function createPadel(width, height, color_, x, y) {
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    this.color = color_;
    this.posx = 3;


    this.update = function() {
        ctx = context;
        ctx.fillStyle = color_;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        if (this.x >= config.canvas_width - config.padel_width) this.x = config.canvas_width - config.padel_width;
        if (this.x < 0) this.x = 0;
    }
    this.slide = function(side, x) {
        if (config.control == controls.MOUSE) {
            if (x > 0 && x < config.canvas_width) {
                pos = x - config.padel_width / 2;
                if (pos < 0) pos = 0;
                else if (pos > config.canvas_width) pos = config.canvas_width - config.padel_width;
                this.x = pos;
            }
        } else if (config.control == controls.MOUSE) {
            switch (side) {
                case 'LEFT':
                    this.x -= config.slideThreshold;
                    break;
                case 'RIGHT':
                    this.x += config.slideThreshold;
                    break;
            }
        }
        // this.x += config.speedThreshold;
        // console.log(this.posx);
        // this.x = this.posx;
    }
}


function drawScoreParams() {
    ctx = context;
    ctx.font = "20px serif";
    ctx.fillStyle = "black";
    ctx.textAlign = "left"
    ctx.fillText("Score : " + gameArea.score, 10, 20);
    ctx.fillText("Breakout Game Let's Start ", config.canvas_width / 3, 20);
    ctx.fillText("Lives : " + gameArea.lives, config.canvas_width - 100, 20);
}

function checkGameOver() {
    if (gameArea.lives <= 0) {
        // gameArea.pause();
        gameArea.state = states.GAMEOVER;
        gameArea.stop();
    }
}

function drawScreen() {
    ctx = context;
    ctx.font = "40px serif";
    ctx.fillStyle = "black";
    var text = "I dont know what to do? ";
    ctx.textAlign="center";
    switch (gameArea.state) {
      case states.START:
          text = "Breakout Game Let's Start";
          break;
      case states.PAUSE:
          text = "Paused, Click to resume";
          break;
        case states.GAMEOVER:
            text = "Gameover, Click to restart";
            break;
    }
    console.log('ctx_fill',text);
    ctx.fillText(text, config.canvas_width/2 , config.canvas_height / 2);
}

function drawBricks(bricks_ = bricks) {
    // console.log(bricks.length);
    for (var j = 0; j < config.NO_ROWS; j++) {
        for (var i = 0; i < no_of_bricks; i++) {
            brick = bricks[j][i];
            if (brick.hidden != true) bricks[j][i].start();
            // if(!bricks[j]);
            // console.log(j,bricks[j]);
        }
    }
}

function detectCollisionWithPanel() {
    if (((padel.x > smileBall.x + config.ballRadius) || ((padel.x + config.padel_width) < smileBall.x - config.ballRadius)) && (smileBall.y >= (padel.y - config.ballRadius))) {
        gameArea.lives--;
        playSound(3);
    }
}

function detectCollisionWithBrick() {
    for (var j = 0; j < config.NO_ROWS; j++) {
        for (var i = 0; i < no_of_bricks; i++) {
            brick = bricks[j][i];
            if (brick.hidden != true) {
                x = smileBall.x;
                y = smileBall.y;
                if ((x >= brick.x && x <= (brick.x + config.brick_width)) && ((y - config.ballRadius) > 0) && (y - config.ballRadius) <= brick.y) {
                    bricks[j][i].hidden = true;
                    // bricks[j][i].color = 'black';
                    // if(smileBall.speedy>0)
                    gameArea.score++;
                    smileBall.speedy = -smileBall.speedy;
                    playSound(2);
                    // console.log(j,i,' collided ');
                }
            }

        }
    }
}

//sound

function initSound() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();

    bufferLoader = new BufferLoader(
        audioContext, [
            sounds.DRUMS, sounds.GUITAR, sounds.COLLISION, sounds.LEVEL_DOWN
        ],
        initBackground
    );
    bufferLoader.load();
}

function initBackground(bufferList) {

    // Create two sources and play them both together
    sound_buffer = bufferList;
    sound_nodes.source_drum = audioContext.createBufferSource();
    sound_nodes.source_drum.buffer = sound_buffer[0];
    sound_nodes.source_drum.loop = true;
    sound_nodes.gain_drum = audioContext.createGain();
    sound_nodes.gain_drum.gain.value = 5;

    sound_nodes.source_guitar = audioContext.createBufferSource();
    sound_nodes.source_guitar.buffer = sound_buffer[1];
    sound_nodes.source_guitar.loop = true;
    sound_nodes.gain_guitar = audioContext.createGain();
    sound_nodes.gain_guitar.gain.value = 0.1;


    sound_nodes.biquadFilter = audioContext.createBiquadFilter();
    sound_nodes.biquadFilter.type = "low";
    sound_nodes.biquadFilter.frequency.value = sound_freq;
    sound_nodes.biquadFilter.gain.value = bg_sound_props.BI_GAIN;
    sound_nodes.biquadFilter.Q.value = bg_sound_props.Q;

    sound_nodes.source_drum.connect(sound_nodes.gain_drum);
    sound_nodes.source_guitar.connect(sound_nodes.gain_guitar);

    sound_nodes.gain_guitar.connect(sound_nodes.biquadFilter);
    sound_nodes.gain_drum.connect(sound_nodes.biquadFilter);

    sound_nodes.main_gain = audioContext.createGain();
    sound_nodes.main_gain.gain.value = bg_sound_props.MAIN_GAIN;

    sound_nodes.biquadFilter.connect(sound_nodes.main_gain);

    sound_nodes.main_gain.connect(audioContext.destination);
    sound_nodes.source_drum.start();
    sound_nodes.source_guitar.start();
    muteSound();
}

function muteSound() {
    sound_nodes.main_gain.gain.value = 0;

}

function unmuteSound() {
    sound_nodes.main_gain.gain.value = 1;
}

function playSound(type) {
    // Create two sources and play them both together.
    var source3 = audioContext.createBufferSource();
    source3.buffer = sound_buffer[type];
    volume3 = audioContext.createGain();
    volume3.gain.value = 0.1;
    source3.connect(volume3);

    main_gain_ = audioContext.createGain();
    main_gain_.gain.value = bg_sound_props.MAIN_GAIN;

    source3.connect(main_gain_);

    main_gain_.connect(audioContext.destination);
    source3.start(0);
}

function changeSound() {
    if (sound_freq > bg_sound_props.FREQ_MAX) sound_freq = bg_sound_props.FREQ_MIN;
    sound_freq += 10;
    sound_nodes.biquadFilter.frequency.value = sound_freq;
}

function updateGameArea() {
    gameArea.clear();
    smileBall.newPos();
    drawBricks();
    smileBall.update();
    if (config.control == controls.KEYBOARD) {
        if (gameArea.key && gameArea.key == 37) {
            padel.slide('LEFT');
            gameArea.key = null;
        } //left
        if (gameArea.key && gameArea.key == 39) {
            padel.slide('RIGHT');
            gameArea.key = null;
        }
    } else if (config.control == controls.MOUSE) {
        // console.log('mouse',gameArea.mouseX);
        padel.slide('WHATEVER', gameArea.mouseX);
    }
    //right
    padel.slide();
    padel.update();
    detectCollisionWithPanel();
    detectCollisionWithBrick();
    drawScoreParams();
    gameArea.reqID = requestAnimationFrame(updateGameArea);
    checkGameOver();
}
