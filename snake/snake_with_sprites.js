'use strict';

function Snake() {
    this.canvas = null;
    this.context = null;
    this.dimensions = Snake.dimensions;
    this.snake = [];
    this.lastUpdateTime = null;
    this.speed = 8;
    this.gameLevel = 0;
    this.bombTimer = 0;
    this.bombs = 0;
    this.timer = null;
    this.interval = 1000 / this.speed;
    this.directions = Snake.directions;
    this.currentDirection = this.directions.RIGHT;
    this.currentKey = null;
    this.gameStates = Snake.gameStates;
    this.state = this.gameStates.START;
    this.snakeColor = '#000';
    this.reqID = null;
    this.snakeLengthStart = 4;
    this.food = [];
    this.max_food = 6;
    this.score = 0;
    this.lastEatenFoodColor = null;
    this.spriteUrl = 'sprites/Food.png';
    this.sprite = null;
    this.loadSprite();

}
Snake.dimensions = {
    canvas_width: 480,
    canvas_height: 320,
    border_threshold: 0,
    border_gap: 2,
    snake_square: 16,
};

Snake.directions = {
    'LEFT': 1,
    'DOWN': 2,
    'UP': 3,
    'RIGHT': 4,
};

Snake.gameStates = {
    'PLAYING': 1,
    'PAUSE': 2,
    'START': 3,
    'GAMEOVER': 4,
    'COMPLETE': 5,
};

Snake.GameLevels = [
    [6, 2],
    [6, 3],
    [7, 4],
    [8, 5]
];

var bg_sound_props = {
    BI_GAIN: 1,
    Q: 10,
    FREQ_MIN: 4000,
    FREQ_MAX: 20000,
    MAIN_GAIN: 0,
}
var sound_nodes = {
    'source_bg_dream': null,
    'gain_bg_dream': null,
    'main_gain': null,
    'biquadFilter': null,
}

Snake.keyCodes = {
    'LEFT': 37,
    'DOWN': 40,
    'UP': 38,
    'RIGHT': 39,
}

var sounds = {
    'BG_DREAM_RAID': 'sounds/snake.mp3',
    'HISS': 'sounds/hiss.mp3',
    'GAMEOVER': 'sounds/gameover.mp3',
};
var sound_buffer = {};

var SPRITES = {
    healthy: {
        ASSETS: [
            [0, 0],
            [16, 0],
            [32, 0],
            [48, 0],
            [64, 0],
            [80, 0],
            [96, 0],
            [112, 0],
            [0, 16],
            [16, 16],
            [32, 16],
            [48, 16],
            [64, 16],
            [80, 16],
            [96, 16],
            [112, 16],
        ],
        SIZE: 16,
        RENDERSIZE: 16,
        LIFESPAN : 1200,
        HEALTHY: true,
    },
    bomb: {
        ASSETS: [
            [0, 32],
            [40, 32]
        ],
        SIZE: 40,
        RENDERSIZE: 16,
        LIFESPAN : 800,
        HEALTHY: false,
    },
    snake: {
        head: [
            [72, 48],
            [72, 32],
            [72, 0],
            [72, 16]
        ],
        body: {
            size: [16, 8],
            dimen: [
                [16, 124],
                [2, 122]
            ],
            // horizontal , vertical
        }
    }
}

var colors = new Array('#9C27B0', '#8E24AA', '#7B1FA2', '#6A1B9A', '#4A148C', '#AA00FF', '#673AB7', '#5E35B1', '#512DA8', '#4527A0', '#311B92', '#6200EA', '#3F51B5', '#3949AB', '#303F9F', '#283593', '#1A237E', '#304FFE', '#2196F3', '#1976D2', '#1565C0', '#0D47A1', '#009688', '#00897B', '#00796B', '#00695C', '#004D40', '#00BFA5', '#4CAF50', '#F4511E', '#E64A19', '#D84315', '#BF360C', '#795548', '#6D4C41', '#5D4037', '#4E342E', '#3E2723', '#9E9E9E', '#757575', '#616161', '#424242', '#212121', '#607D8B', '#546E7A', '#455A64', '#37474F', '#263238', '#000000');

Snake.prototype = {
    init: function() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.dimensions.canvas_width;
        this.canvas.height = this.dimensions.canvas_height;
        this.context = this.canvas.getContext('2d');
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.initvars();
        this.initInput();
        this.drawSnake();
        this.drawBackground();
        this.drawScreen();

        this.soundManager = new SoundManager(this);

        // for (var i = 0; i < 2; i++) {
        //   this.food.push(new Food(this));
        // }
        // this.update();
    },
    initvars: function() {
        this.snake = [];
        this.food = [];
        this.score = 0;
        this.createSnake();
        this.currentDirection = this.directions.RIGHT;
        this.currentKey = null;
        this.bombs = 0;

    },
    update: function() {
        this.reqID = requestAnimationFrame(this.update.bind(this));
        var delta = Date.now() - (this.lastUpdateTime || Date.now());
        this.render(delta);
        this.lastUpdateTime = Date.now();
    },
    play: function() {
        if (this.state == this.gameStates.START) this.soundManager.startBg();
        this.state = this.gameStates.PLAYING;
        this.soundManager.unmuteSound();
        this.update();
    },
    pause: function() {
        cancelAnimationFrame(this.reqID);
        this.state = this.gameStates.PAUSE;
        this.soundManager.muteSound();
        this.drawScreen();
    },
    stop: function() {
        cancelAnimationFrame(this.reqID);
        this.state = this.gameStates.GAMEOVER;
        // this.score = 0;
        this.initvars();
        this.soundManager.muteSound();
        this.drawScreen();
    },
    restart: function() {
        this.soundManager.unmuteSound();
        this.initvars();
        this.play();
    },
    render: function(delta) {
        this.timer += delta;
        this.checkCollision();
        if (this.timer > this.interval) {
            this.context.clearRect(0, 0, this.dimensions.canvas_width, this.dimensions.canvas_height);
            this.drawBackground();
            this.drawScoreParams();

            var head = this.snake[0];
            this.handleMove();

            /* logic is to remove the tail and push to the front as head
             * |0|1|2|3|4| get the zeroth element as head, last element as tail
             * head  = zeroth element
             * tail = pop()   last element
             * 0 as head and 4 as tail.
             * after pop array = |0|1|2|3|
             * increment the tail coordinate
             * push it to front
             * we are rendering snake from 0, therefore 0 element should have greater coordinates
             */

            var x_ = head.x;
            var y_ = head.y;

            var tail = this.snake.pop();

            tail.x = x_;
            tail.y = y_;

            if (this.currentDirection == this.directions.DOWN) tail.y = y_ + this.dimensions.snake_square;
            if (this.currentDirection == this.directions.UP) tail.y = y_ - this.dimensions.snake_square;
            if (this.currentDirection == this.directions.RIGHT) tail.x = x_ + this.dimensions.snake_square;
            if (this.currentDirection == this.directions.LEFT) tail.x = x_ - this.dimensions.snake_square;

            this.snake.unshift(tail);
            this.drawSnake();
            this.checkFood(delta);

            this.timer = 0;
        }
    },

    loadSprite: function() {
        var image = new Image();
        image.src = this.spriteUrl;
        this.sprite = image;
        var that = this;
        image.onload = function() {
            that.init();
        }
    },
    checkFood: function(delta) {
        var foodCollisionThreshold = 1;
        var food_ = Array();
        var snake_ = this.snake[0];
        for (var i = 0; i < this.food.length; i++) {
            var food_el = this.food[i];
            if (food_el.active) {
                food_el.draw(delta);
                if (snake_.x >= (food_el.x - foodCollisionThreshold) && snake_.x <= (food_el.x + this.dimensions.snake_square - foodCollisionThreshold) &&
                    food_el.y >= (snake_.y - foodCollisionThreshold) && food_el.y <= (snake_.y + this.dimensions.snake_square - foodCollisionThreshold)) {
                    this.food[i].active = false;
                    if (food_el.healthy) {
                        this.snake.push({
                            x: 0,
                            y: 0,
                        })
                    } else {
                        this.stop();
                    }
                    this.soundManager.playSound('HISS');
                    this.lastEatenFoodColor = food_el.color;
                    this.score++;
                } else {
                    food_.push(food_el);
                }
            }
        }
        this.food = food_;

        if (this.food.length < Snake.GameLevels[this.gameLevel][0]) {
          var newFood;
            if (this.bombs < Snake.GameLevels[this.gameLevel][1]) {
                newFood = new Food(this, 'bomb');
                if(!this.checkDuplicationOverlapping(newFood)) {
                this.food.push(newFood);
                this.bombs++;
              }
            } else{
              newFood = new Food(this);
              if(!this.checkDuplicationOverlapping(newFood))
               this.food.push(newFood);
             }
        }
     },
    checkDuplicationOverlapping : function(newFood){
      for (var i = 0; i < this.food.length; i++) {
        var food_ = this.food[i];
        if(food_.x == newFood.x || food_.y == newFood.y) return true;
      }
      return false;
    },
    checkCollision: function() {
        var snake_ = this.snake[0];
        if ((snake_.x >= this.dimensions.canvas_width - this.dimensions.border_threshold) ||
            (snake_.x <= this.dimensions.border_threshold - this.dimensions.border_gap) ||
            (snake_.y >= this.dimensions.canvas_height - this.dimensions.border_threshold) ||
            (snake_.y <= this.dimensions.border_threshold - this.dimensions.border_gap))
             this.stop();
        for (var i = 1; i < this.snake.length; i++) {
            var snake_el = this.snake[i];
            if ((snake_.x == snake_el.x) && (snake_.y == snake_el.y)) {
                this.stop();
                break;
            }
        }

    },
    // checkForFood : function(){
    //   for (var food in this.food) {
    //     for (var snake_ in this.snake) {
    //
    //     }
    //   }
    // },
    initInput: function() {
        var that = this;
        document.addEventListener('keydown', function(e) {
            that.currentKey = e.keyCode;
        });
        document.addEventListener('mousedown', function(e) {
            if (that.state == that.gameStates.PAUSE || that.state == that.gameStates.START) that.play();
            else if (that.state == that.gameStates.PLAYING) that.pause();
            else if (that.state == that.gameStates.GAMEOVER) that.restart();
        });
    },
    handleMove: function() {
        if (this.currentKey != null) {

            if (this.currentKey == Snake.keyCodes.LEFT && this.currentDirection != this.directions.RIGHT) this.currentDirection = this.directions.LEFT;
            if (this.currentKey == Snake.keyCodes.RIGHT && this.currentDirection != this.directions.LEFT) this.currentDirection = this.directions.RIGHT;
            if (this.currentKey == Snake.keyCodes.UP && this.currentDirection != this.directions.DOWN) this.currentDirection = this.directions.UP;
            if (this.currentKey == Snake.keyCodes.DOWN && this.currentDirection != this.directions.UP) this.currentDirection = this.directions.DOWN;
        }
    },
    createSnake: function() {
        for (var i = this.snakeLengthStart; i > 0; i--) {
            this.snake.push({
                x: (i + 2) * this.dimensions.snake_square,
                y: 3 * this.dimensions.snake_square,
            });
        }
    },
    drawBackground: function() {
        this.context.lineWidth = this.dimensions.border_gap;
        this.context.strokeStyle = 'green';
        this.context.strokeRect(this.dimensions.border_threshold / 2, this.dimensions.border_threshold / 2, this.dimensions.canvas_width - this.dimensions.border_threshold, this.dimensions.canvas_height - this.dimensions.border_threshold);
        // this.context.strokeRect(0, 0, this.dimensions.canvas_width - this.dimensions.border_threshold, this.dimensions.canvas_height - this.dimensions.border_threshold);
    },
    drawSnake: function() {
        var snake_ = this.snake[0];
        var x = snake_.x;
        var y = snake_.y;
        var head_ = SPRITES.snake.head[this.currentDirection - 1];
        var cx = head_[1];
        var cy = head_[0];
        this.context.drawImage(this.sprite, cx, cy, this.dimensions.snake_square, this.dimensions.snake_square, x, y - 1, this.dimensions.snake_square, this.dimensions.snake_square);

        for (var i = 1; i < this.snake.length; i++) {
            snake_ = this.snake[i];
            x = snake_.x;
            y = snake_.y;
            // var curr = (this.currentDirection==1 || this.currentDirection==4) ? 0: 1;
            // head_ = SPRITES.snake.body.dimen[curr];
            // cx = head_[0];
            // cy = head_[1];
            // this.context.drawImage(this.sprite, cx,cy,this.dimensions.snake_square ,this.dimensions.snake_square , x,y,this.dimensions.snake_square ,this.dimensions.snake_square );

            this.context.fillStyle = this.lastEatenFoodColor || this.snakeColor;
            this.context.fillRect(x, y, this.dimensions.snake_square - 1, this.dimensions.snake_square - 1);
        }
    },
    drawScoreParams: function() {
        this.context.font = "20px serif";
        this.context.fillStyle = "black";
        this.context.textAlign = "left"
        this.context.fillText("Score : " + this.score, 10, 20);
    },
    drawScreen: function() {
        var ctx = this.context;
        ctx.font = "40px serif";
        ctx.fillStyle = "black";
        var text = "I dont know what to do? ";
        ctx.textAlign = "center";
        switch (this.state) {
            case this.gameStates.START:
                text = "Snake Game Let's Start";
                break;
            case this.gameStates.PAUSE:
                text = "Paused, Click to resume";
                break;
            case this.gameStates.GAMEOVER:
                text = "Gameover, Click to restart";
                break;
            case this.gameStates.COMPLETE:
                text = "Yey! Level- " + this.gameLevel + " completed";
                break;
        }
        ctx.fillText(text, this.dimensions.canvas_width / 2, this.dimensions.canvas_height / 2);
    },
}

function Food(snake_, type = 'healthy') {
    this.snake_ = snake_;
    this.x = snake_.dimensions.snake_square * getRandInt(1, snake_.dimensions.canvas_width / snake_.dimensions.snake_square - 2);
    this.y = snake_.dimensions.snake_square * getRandInt(1, snake_.dimensions.canvas_height / snake_.dimensions.snake_square - 2);

    // this.animtime = 200;
    this.timer = 0;
    var foodObj = SPRITES[type];
    this.healthy = foodObj.HEALTHY;
    this.size = foodObj.SIZE;

    //lifespan in milliseconds to activate
    this.lifespan = foodObj.LIFESPAN;
    this.type = type;


    // console.log(foodRand,foodObj.ASSETS[foodRand]);
    var foodRand = getRandInt(1, foodObj.ASSETS.length) - 1;

    this.cx = foodObj.ASSETS[foodRand][0];
    this.cy = foodObj.ASSETS[foodRand][1];
    this.renderSize = foodObj.RENDERSIZE;

    this.color = colors[getRandInt(0, colors.length)];
    this.active = true;
}
Food.prototype = {
    draw: function(delta) {
        this.snake_.context.fillStyle = this.color;
        // this.snake_.context.fillRect(this.x, this.y, this.snake_.dimensions.snake_square, this.snake_.dimensions.snake_square);
        this.snake_.context.drawImage(this.snake_.sprite, this.cx, this.cy, this.size, this.size, this.x, this.y, this.renderSize, this.renderSize);
        this.checkTimer(delta);
    },
    checkTimer: function(delta) {
        this.timer += delta;
        if (this.timer > this.lifespan) {
            if (this.type == 'bomb') {
              this.snake_.bombs--;
                // this.snake_.bombs  == (this.snake_.bombs-- >0)? this.snake_.bombs : 0;
                console.log('bomb',this.snake_.bombs);
            }
            this.active = false;
            this.timer = 0;
        }
        // if(this.timer<this.animtime){
        //   // this.y *= 0.99;
        //   this.y += ;
        //   // this.y =
        // }
    }
};

function SoundManager(snake_) {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();
    this.soundBuffer = new Array();
    for (var sound_ in sounds) {
        this.loadSound(sound_);
    }
    // this.BackgroundMusic();
};

SoundManager.prototype = {
    loadSound: function(sound_) {
        var manager = this;
        var request = new XMLHttpRequest();
        request.open('GET', sounds[sound_], true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            manager.audioContext.decodeAudioData(
                request.response,
                function(buffer) {
                    manager.soundBuffer[sound_] = buffer;
                    if (Object.keys(manager.soundBuffer).length == Object.keys(sounds).length) manager.RouteSound();
                }
            );
        }
        request.send();
    },
    RouteSound: function() {
        sound_nodes.source_bg_dream = this.audioContext.createBufferSource();
        sound_nodes.source_bg_dream.buffer = this.soundBuffer.BG_DREAM_RAID;
        sound_nodes.source_bg_dream.loop = true;

        sound_nodes.gain_bg_dream = this.audioContext.createGain();
        sound_nodes.gain_bg_dream.gain.value = 1;
        sound_nodes.gain_bg_dream.gain.exponentialRampToValueAtTime(1, this.audioContext.currentTime + 4);


        var biquadFilter = this.audioContext.createBiquadFilter();
        biquadFilter.type = "lowpass";
        biquadFilter.frequency.value = 22000;
        biquadFilter.gain.value = bg_sound_props.BI_GAIN;
        biquadFilter.Q.value = bg_sound_props.Q;


        sound_nodes.source_bg_dream.connect(sound_nodes.gain_bg_dream);
        sound_nodes.gain_bg_dream.connect(biquadFilter);

        sound_nodes.main_gain = this.audioContext.createGain();
        sound_nodes.main_gain.gain.value = 0.01;

        biquadFilter.connect(sound_nodes.main_gain);

        sound_nodes.main_gain.connect(this.audioContext.destination);

    },
    startBg: function() {
        sound_nodes.source_bg_dream.start(0);
        // this.unmuteSound();
    },
    playSound: function(type) {
        // Create two sources and play them both together.
        var source3 = this.audioContext.createBufferSource();
        source3.buffer = this.soundBuffer[type];
        var volume3 = this.audioContext.createGain();
        volume3.gain.value = 0.1;
        source3.connect(volume3);

        // main_gain_ = audioContext.createGain();
        // main_gain_.gain.value = bg_sound_props.MAIN_GAIN;

        source3.connect(sound_nodes.main_gain);

        // main_gain_.connect(audioContext.destination);
        source3.start(0);
    },
    muteSound: function() {
        sound_nodes.main_gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1);
    },
    unmuteSound: function() {
        sound_nodes.main_gain.gain.exponentialRampToValueAtTime(0.6, this.audioContext.currentTime + 1);

    }
}


function getRandInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;;
}
