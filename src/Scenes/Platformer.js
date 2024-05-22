const tilesize = 18;

class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 20*tilesize;
        this.DRAG = 15*tilesize;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 600;
        this.JUMP_VELOCITY = -tilesize*18;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.MAX_SPEED = 6*tilesize;
        this.gameOver = false;
        this.score = 0;
        this.displayed = false;
        this.airborne = false;
        this.timer = 2;
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", tilesize, tilesize, 90, 30);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });
        
        this.physics.world.TILE_BIAS = 36;

        // Find coins in the "Objects" layer in Phaser
        // Look for them by finding objects with the name "coin"
        // Assign the coin texture from the tilemap_sheet sprite sheet
        // Phaser docs:
        // https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Tilemaps.Tilemap-createFromObjects

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "collectable_sheet",
            frame: 0
        });

        this.spawn = this.map.createFromObjects("Objects", {
            name: "spawn",
            key: "tilemap_sheet",
            frame: 145
        });

        this.flag = this.map.createFromObjects("Objects", {
            name: "flag",
            key: "tilemap_sheet",
            frame: 131
        })

        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        this.physics.world.enable(this.flag, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        this.flagGroup = this.add.group(this.flag);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(this.spawn[0].x, this.spawn[0].y, "platformer_characters", "tile_0000.png");
        this.physics.world.setBounds(0,0,tilesize*90,tilesize*32);
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // Handle collision detection with coins
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            this.score += 100;
            this.sound.play("pickup", {
                volume: 1
            });
        });

        this.physics.add.overlap(my.sprite.player, this.flagGroup, () => {
            this.gameOver = true;
        })

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // Add movement vfx here
        my.vfx.walking = this.add.particles(0, 6, "kenny-particles", {
            // Try: add random: true
            scale: {start: 0.1, end: 0.1, random: true},
            // Try: maxAliveParticles: 8,
            lifespan: 350,
            maxAliveParticles: 8,
            // Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
            gravityY: -400
        });

        my.vfx.walking.stop();

        // camera code here
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(0, 5);
        this.cameras.main.setZoom(this.SCALE);
        this.physics.world.drawDebug = false;
    }

    update() {
        if(!this.gameOver && cursors.left.isDown) {
            if (my.sprite.player.body.velocity.x > -this.MAX_SPEED) {
                my.sprite.player.setAccelerationX(-this.ACCELERATION);
            } else {
                my.sprite.player.setAccelerationX(0);
            }
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 1);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            } else {
                my.vfx.walking.stop();
            }

        } else if(!this.gameOver && cursors.right.isDown) {
            if (my.sprite.player.body.velocity.x < this.MAX_SPEED) {
                my.sprite.player.setAccelerationX(this.ACCELERATION);
            } else {
                my.sprite.player.setAccelerationX(0);
            }
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, -1);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            } else {
                my.vfx.walking.stop();
            }
        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // have the vfx stop playing
            my.vfx.walking.stop();

        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!this.gameOver && my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.sound.play("jump", {
                volume: 0.5
            });
            this.airborne = true;
        }
        
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
            this.airborne = true;
            this.timer--;
        } else if (this.airborne == true && this.timer <= 0) {
            this.sound.play("land");
            this.airborne = false;
            this.timer = 2;
        }
        
        if (!this.displayed && this.gameOver) {
            my.text = this.add.text(this.cameras.main.worldView.centerX,this.cameras.main.worldView.centerY+50, "You win!\nScore: "+this.score)
            this.displayed = true;
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }
}