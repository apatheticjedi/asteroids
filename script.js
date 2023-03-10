const FPS = 30; // frames per second
        const FRICTION = 0.7; // friction coefficienet of space (0=no friction, 1 = max friction)
        const GAME_LIVES = 3; // starting number of lives
        const LASER_DIST = 0.6; // max distance laser can travel as fraction of screen width
        const LASER_EXPLODE_DUR = 0.1; // duration of laser explosion
        const LASER_MAX = 10; // maximum number of lasers onscreen at once
        const LASER_SPD = 500; // speed of lasers in pixels per second
        const ROIDS_NUM = 1; // starting number of asteroids
        const ROIDS_SIZE = 100; // starting size of asteroids in pixels
        const ROIDS_SPD = 50; // max starting speed of asteroids in pixels per second
        const ROIDS_VERT = 10; // average number of vertices on each asteroid
        const ROIDS_JAG = 0.4; // shape of asteroids
        const ROIDS_PTS_LG = 20; // points for a large asteroid
        const ROIDS_PTS_MD = 50; // points for a medium asteroid
        const ROIDS_PTS_SM = 100; // points for a small asteroid
        const SAVE_KEY_SCORE = "highscroe"; // save key for localStorage
        const SHIP_SIZE = 30; //ship height in pixels
        const SHIP_EXPLODE_DUR = 1; // duration of ship explosion
        const SHIP_INV_DUR = 3; // duration of ship invisibility
        const SHIP_BLINK_DUR = 0.1; // duration of ship blink invisibility after explosion
        const SHIP_THRUST = 5; // acceleration of ship in pixels per second
        const TURN_SPEED = 360; // turn speed in degrees per second
        const SHOW_BOUNDING = false; // show or hide collision boxes
        const SHOW_CENTER_DOT = false; // show or hide ship's center dot
        const SOUND_ON = true;
        const MUSIC_ON = true;
        const TEXT_FADE_TIME = 2.5; // text fade time in seconds
        const TEXT_SIZE = 50; // font height in pixels

        /** @type {HTMLCanvasElement} */
        var canv = document.getElementById("gameCanvas");
        var ctx = canv.getContext("2d");

        // set up sound effects
        var fxExplode = new Sound("assets/sounds/explode.m4a", 1, 0.4);
        var fxHit = new Sound("assets/sounds/hit.m4a", 5, 0.3);
        var fxLaser = new Sound("assets/sounds/laser.m4a", 5, 0.1);
        var fxThrust = new Sound("assets/sounds/thrust.m4a", 1, 0.2);

        // set up bg music
        var music = new Music("assets/sounds/music-low.m4a", "assets/sounds/music-high.m4a", 0.5);
        var roidsLeft, roidsTotal;

        // set up game parameters
        var level, lives, roids, score, scoreHigh, ship, text, textAlpha;
        newGame();

        // set up spaceship object
        var ship = newShip();

        // set up asteroids
        var roids = [];
        createAsteroidBelt();

        // set up event handlers
        document.addEventListener("keydown", keyDown);
        document.addEventListener("keyup", keyUp);

        // set up game loop
        setInterval(update, 1000 / FPS);

        function createAsteroidBelt() {
            roids = [];
            roidsTotal = (ROIDS_NUM + level) * 7;
            roidsLeft = roidsTotal
            var x, y;
            for (var i = 0; i < ROIDS_NUM + level; i++) {
                do {
                    x = Math.floor(Math.random() * canv.width);
                    y = Math.floor(Math.random() * canv.height);
                } while (distBetweenPoints(ship.x, ship.y, x, y) < ROIDS_SIZE * 2 + ship.r);
                roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 2)));
            }
        }

        function destroyAsteroid(index) {
            var x = roids[index].x;
            var y = roids[index].y;
            var r = roids[index].r;

            // split asteroid in 2 if necessary
            if (r == Math.ceil(ROIDS_SIZE / 2)) {
                roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 4)));
                roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 4)));
                score += ROIDS_PTS_LG;
            } else if (r == Math.ceil(ROIDS_SIZE / 4)) {
                roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 8)));
                roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 8)));
                score += ROIDS_PTS_MD;
            } else {
                score += ROIDS_PTS_SM;
            }

            // check if high score
            if (score > scoreHigh) {
                scoreHigh = score;
                localStorage.setItem(SAVE_KEY_SCORE, scoreHigh);
            }

            // destroy asteroid
            roids.splice(index, 1);
            fxHit.play();

            // calculate ratio of remaining asteroids
            roidsLeft--;
            music.setAsteroidRatio(roidsLeft == 0 ? 1 : roidsLeft / roidsTotal);

            // new level when no more asteroids
            if (roids.length == 0) {
                level++;
                newLevel();
            }
        }

        function distBetweenPoints(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
        }

        function drawShip(x, y, a, color = "aqua") {
            ctx.strokeStyle = "white";
            ctx.fillStyle = color;
            ctx.lineWidth = SHIP_SIZE / 20;
            ctx.beginPath();
            ctx.moveTo( // nose of ship
                x + 4 / 3 * ship.r * Math.cos(a),
                y - 4 / 3 * ship.r * Math.sin(a)
            );
            ctx.lineTo( // rear left
                x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
                y + ship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
            );
            ctx.lineTo( // rear right
                x - ship.r * (2 / 3 * Math.cos(a) - Math.sin(a)),
                y + ship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
            );
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
        }

        function explodeShip() {
            ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS);
            fxExplode.play();
        }

        function gameOver() {
            ship.dead = true;
            text = "GAME OVER";
            textAlpha = 1.0;
        }

        function keyDown(/** @type {keyboardEvent} */ ev) {

            if (ship.dead) {
                return;
            }

            switch (ev.keyCode) {
                case 32: // space bar (shoot laser)
                    shootLaser();
                    break;
                case 37: // left arrow (rotate left)
                    ship.rot = TURN_SPEED / 180 * Math.PI / FPS;
                    break;
                case 38: // up arrow (thrust)
                    ship.thrusting = true;
                    break;
                case 39: // right arrow (rotate right)
                    ship.rot = -TURN_SPEED / 180 * Math.PI / FPS;
                    break;
            }
        }

        function keyUp(/** @type {keyboardEvent} */ ev) {

            if (ship.dead) {
                return;
            }

            switch (ev.keyCode) {
                case 32: // space bar (allow shooting again)
                    ship.canShoot = true;
                    break;
                case 37: //left arrow (stop rotating left)
                    ship.rot = 0;
                    break;
                case 38: // up arrow (stop thrust)
                    ship.thrusting = false;
                    break;
                case 39: //right arrow (stop rotating right)
                    ship.rot = 0;
                    break;
            }
        }

        function newAsteroid(x, y, r) {
            var lvlMult = 1 + 0.1 * level;
            var roid = {
                x: x,
                y: y,
                xv: Math.random() * ROIDS_SPD * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
                yv: Math.random() * ROIDS_SPD * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
                r: r,
                a: Math.random() * Math.PI * 2, // in radians
                vert: Math.floor(Math.random() * (ROIDS_VERT + 1) + ROIDS_VERT / 2),
                offs: []
            };

            // create the vertex offsets array
            for (var i = 0; i < roid.vert; i++) {
                roid.offs.push(Math.random() * ROIDS_JAG * 2 + 1 - ROIDS_JAG)
            }

            return roid;
        }

        function newGame() {
            level = 0;
            lives = GAME_LIVES;
            score = 0;
            ship = newShip();

            // get high score from localStorage
            var scoreStr = localStorage.getItem(SAVE_KEY_SCORE);
            if (scoreStr == null) {
                scoreHigh = 0;
            } else {
                scoreHigh = parseInt(scoreStr);
            }

            newLevel();
        }

        function newLevel() {
            text = "LEVEL " + (level + 1);
            textAlpha = 1.0;
            createAsteroidBelt();
        }

        function newShip() {
            return {
                x: canv.width / 2,
                y: canv.height / 2,
                r: SHIP_SIZE / 2,
                a: 90 / 180 * Math.PI, //convert to radians
                blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS),
                blinkNum: Math.ceil(SHIP_INV_DUR / SHIP_BLINK_DUR),
                canShoot: true,
                lasers: [],
                dead: false,
                explodeTime: 0,
                rot: 0,
                thrusting: false,
                thrust: {
                    x: 0,
                    y: 0
                }
            }
        }

        function shootLaser() {
            // create laser object
            if (ship.canShoot && ship.lasers.length < LASER_MAX) {
                ship.lasers.push({ // from nose of ship
                    x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
                    y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
                    xv: LASER_SPD * Math.cos(ship.a) / FPS,
                    yv: -LASER_SPD * Math.sin(ship.a) / FPS,
                    dist: 0,
                    explodeTime: 0
                });
                fxLaser.play();
            };

            // prevent further shooting
            ship.canShoot = false;
        }

        function Music(srcLow, srcHigh, vol) {
            this.soundLow = new Audio(srcLow);
            this.soundHigh = new Audio(srcHigh);
            this.low = true;
            this.tempo = 1.0;  // beats per second
            this.beatTime = 0; // frames left until next beat

            this.play = function () {
                if (MUSIC_ON) {
                    if (this.low) {
                        this.soundLow.play();
                    } else {
                        this.soundHigh.play();
                    }
                    this.soundLow.volume = vol;
                    this.soundHigh.volume = vol;
                    this.low = !this.low;
                }
            }

            this.setAsteroidRatio = function(ratio) {
                this.tempo = 1.0 - 0.75 * (1.0 - ratio);
            }

            this.tick = function () {
                if (this.beatTime == 0) {
                    this.play();
                    this.beatTime = Math.ceil(this.tempo * FPS);
                } else {
                    this.beatTime--;
                }
            }
        }

        function Sound(src, maxStreams = 1, vol = 1.0) {
            this.streamNum = 0;
            this.streams = [];
            for (var i = 0; i < maxStreams; i++) {
                this.streams.push(new Audio(src));
                this.streams[i].volume = vol;
            }

            this.play = function () {
                if (SOUND_ON) {
                    this.streamNum = (this.streamNum + 1) % maxStreams;
                    this.streams[this.streamNum].play();
                }
            }

            this.stop = function () {
                this.streams[this.streamNum].pause();
                this.streams[this.streamNum].currentTime = 0;
            }
        }

        function update() {
            var blinkOn = ship.blinkNum % 2 == 0;
            var exploding = ship.explodeTime > 0;

            // tick the music
            music.tick();

            // draw space
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canv.width, canv.height);

            // draw asteroids
            var x, y, r, a, vert, offs;
            for (var i = 0; i < roids.length; i++) {
                ctx.strokeStyle = "lightgray";
                ctx.fillStyle = "slategray"
                ctx.lineWidth = SHIP_SIZE / 20;
                // get asteroid properties
                x = roids[i].x;
                y = roids[i].y;
                r = roids[i].r;
                a = roids[i].a;
                vert = roids[i].vert;
                offs = roids[i].offs;

                // draw path
                ctx.beginPath();
                ctx.moveTo(
                    x + r * offs[0] * Math.cos(a),
                    y + r * offs[0] * Math.sin(a)
                );

                // draw polygon
                for (var j = 1; j < vert; j++) {
                    ctx.lineTo(
                        x + r * offs[j] * Math.cos(a + j * Math.PI * 2 / vert),
                        y + r * offs[j] * Math.sin(a + j * Math.PI * 2 / vert)
                    )
                }
                ctx.closePath();
                ctx.stroke();
                ctx.fill();

                if (SHOW_BOUNDING) {
                    ctx.strokeStyle = "lime";
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2, false);
                    ctx.stroke();
                }
            }

            // thrust ship
            if (ship.thrusting && !ship.dead) {
                ship.thrust.x += SHIP_THRUST * Math.cos(ship.a) / FPS;
                ship.thrust.y -= SHIP_THRUST * Math.sin(ship.a) / FPS;
                fxThrust.play();

                // draw thruster
                if (!exploding && blinkOn) {
                    ctx.fillStyle = "red";
                    ctx.strokeStyle = "yellow";
                    ctx.lineWidth = SHIP_SIZE / 10;
                    ctx.beginPath();
                    ctx.moveTo( // rear left
                        ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
                        ship.y + ship.r * (2 / 3 * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
                    );
                    ctx.lineTo( // rear center behind ship
                        ship.x - ship.r * 6 / 3 * Math.cos(ship.a),
                        ship.y + ship.r * 6 / 3 * Math.sin(ship.a)
                    );
                    ctx.lineTo( // rear right
                        ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
                        ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
                    );
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            } else {
                ship.thrust.x -= FRICTION * ship.thrust.x / FPS;
                ship.thrust.y -= FRICTION * ship.thrust.y / FPS;
                fxThrust.stop();
            }

            // draw triangular ship
            if (!exploding) {
                if (blinkOn && !ship.dead) {
                    drawShip(ship.x, ship.y, ship.a);
                }
                // handle blink
                if (ship.blinkNum > 0) {
                    // reduce blink time
                    ship.blinkTime--;

                    // reduce blink num
                    if (ship.blinkTime == 0) {
                        ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
                        ship.blinkNum--;
                    }
                }
            } else {
                // draw explosion
                ctx.fillStyle = "darkred"
                ctx.beginPath();
                ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.fillStyle = "red"
                ctx.beginPath();
                ctx.arc(ship.x, ship.y, ship.r * 1.4, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.fillStyle = "orange"
                ctx.beginPath();
                ctx.arc(ship.x, ship.y, ship.r * 1.1, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.fillStyle = "yellow"
                ctx.beginPath();
                ctx.arc(ship.x, ship.y, ship.r * 0.8, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.fillStyle = "white"
                ctx.beginPath();
                ctx.arc(ship.x, ship.y, ship.r * 0.5, 0, Math.PI * 2, false);
                ctx.fill();
            }

            // show ship's collision circle
            if (SHOW_BOUNDING) {
                ctx.strokeStyle = "lime";
                ctx.beginPath();
                ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2, false);
                ctx.stroke();
            }

            // center dot
            if (SHOW_CENTER_DOT) {
                ctx.fillStyle = "red";
                ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
            }

            // draw laser
            for (var i = 0; i < ship.lasers.length; i++) {
                if (ship.lasers[i].explodeTime == 0) {
                    ctx.fillStyle = "salmon";
                    ctx.beginPath();
                    ctx.arc(ship.lasers[i].x, ship.lasers[i].y, SHIP_SIZE / 15, Math.PI * 2, false);
                    ctx.fill();
                } else {
                    // draw explosion
                    ctx.fillStyle = "orangered";
                    ctx.beginPath();
                    ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.75, Math.PI * 2, false);
                    ctx.fill();
                    ctx.fillStyle = "salmon";
                    ctx.beginPath();
                    ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.5, Math.PI * 2, false);
                    ctx.fill();
                    ctx.fillStyle = "pink";
                    ctx.beginPath();
                    ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.25, Math.PI * 2, false);
                    ctx.fill();
                }
            }

            // draw game text
            if (textAlpha >= 0) {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")";
                ctx.font = "normal " + TEXT_SIZE + "px VT323, monospace";
                ctx.fillText(text, canv.width / 2, canv.height * 0.75);
                textAlpha -= (1.0 / TEXT_FADE_TIME / FPS);
            } else if (ship.dead) {
                newGame();
            }

            // draw the number of lives
            var lifeColor;
            for (var i = 0; i < lives; i++) {
                lifeColor = exploding && i == lives - 1 ? "red" : "aqua";
                drawShip(SHIP_SIZE + i * SHIP_SIZE * 1.2, SHIP_SIZE, 0.5 * Math.PI, lifeColor);
            }

            // draw score
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "white";
            ctx.font = "normal " + (TEXT_SIZE * 0.75) + "px VT323, monospace";
            ctx.fillText(score, canv.width - SHIP_SIZE / 2, SHIP_SIZE);

            // draw high score
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "white";
            ctx.font = "normal " + (TEXT_SIZE * 0.75) + "px VT323, monospace";
            ctx.fillText("TOP SCORE " + scoreHigh, canv.width / 2, SHIP_SIZE);

            // detect laser hits on asteroids
            var ax, ay, ar, lx, ly;
            for (var i = roids.length - 1; i >= 0; i--) {

                // grab asteroid properties
                ax = roids[i].x;
                ay = roids[i].y;
                ar = roids[i].r;

                // loop over lasers
                for (var j = ship.lasers.length - 1; j >= 0; j--) {
                    lx = ship.lasers[j].x;
                    ly = ship.lasers[j].y;

                    // detect hits
                    if (ship.lasers[j].explodeTime == 0 && distBetweenPoints(ax, ay, lx, ly) < ar) {

                        // destroy asteroid and activate laser explosion
                        destroyAsteroid(i);
                        ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLODE_DUR * FPS)
                        break;
                    }
                }

            }

            // check for asteroid collisions
            if (!exploding) {
                if (ship.blinkNum == 0 && !ship.dead) {
                    for (var i = 0; i < roids.length; i++) {
                        if (distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) < ship.r + roids[i].r) {
                            explodeShip();
                            destroyAsteroid(i);
                            break;
                        }
                    }
                }

                // rotate ship
                ship.a += ship.rot;

                // move ship
                ship.x += ship.thrust.x;
                ship.y += ship.thrust.y;
            } else {
                ship.explodeTime--;

                // reset ship after explosion
                if (ship.explodeTime == 0) {
                    lives--;
                    if (lives == 0) {
                        gameOver();
                    } else {
                        ship = newShip();
                    }
                }
            }

            // edge of screen
            if (ship.x < 0 - ship.r) {
                ship.x = canv.width + ship.r;
            } else if (ship.x > canv.width + ship.r) {
                ship.x = 0 - ship.r;
            }
            if (ship.y < 0 - ship.r) {
                ship.y = canv.height + ship.r;
            } else if (ship.y > canv.height + ship.r) {
                ship.y = 0 - ship.r;
            }

            // move lasers
            for (i = ship.lasers.length - 1; i >= 0; i--) {
                // check distance traveled
                if (ship.lasers[i].dist > LASER_DIST * canv.width) {
                    ship.lasers.splice(i, 1);
                    continue;
                }

                // handle explosion
                if (ship.lasers[i].explodeTime > 0) {
                    ship.lasers[i].explodeTime--;

                    // destroy laser after duration
                    if (ship.lasers[i].explodeTime == 0) {
                        ship.lasers.splice(i, 1);
                        continue;
                    }
                } else {
                    // move the laser
                    ship.lasers[i].x += ship.lasers[i].xv;
                    ship.lasers[i].y += ship.lasers[i].yv;

                    // calculate distance traveled
                    ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xv, 2) + Math.pow(ship.lasers[i].yv, 2));
                }

                // handle edge of screen
                if (ship.lasers[i].x < 0) {
                    ship.lasers[i].x = canv.width;
                } else if (ship.lasers[i].x > canv.width) {
                    ship.lasers[i].x = 0;
                }
                if (ship.lasers[i].y < 0) {
                    ship.lasers[i].y = canv.height;
                } else if (ship.lasers[i].y > canv.height) {
                    ship.lasers[i].y = 0;
                }
            }

            // move asteroids
            for (var i = 0; i < roids.length; i++) {
                roids[i].x += roids[i].xv;
                roids[i].y += roids[i].yv;

                // handle edge of screen
                if (roids[i].x < 0 - roids[i].r) {
                    roids[i].x = canv.width + roids[i].r;
                } else if (roids[i].x > canv.width + roids[i].r) {
                    roids[i].x = 0 - roids[i].r
                }
                if (roids[i].y < 0 - roids[i].r) {
                    roids[i].y = canv.height + roids[i].r;
                } else if (roids[i].y > canv.height + roids[i].r) {
                    roids[i].y = 0 - roids[i].r
                }
            }
        }