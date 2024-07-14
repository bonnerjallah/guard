import * as THREE from "three";

class Controller {
    constructor(game) {
        this.game = game;
        this.camera = game.camera;
        this.player = game.player;
        this.target = game.player.root;
        this.navMesh = game.navMesh;
        this.clock = game.clock;

        this.raycaster = new THREE.Raycaster();

        this.move = { up: 0, right: 0 };
        this.look = { up: 0, right: 0 };
        this.speed = 5;

        this.tmpVec3 = new THREE.Vector3();
        this.tmpQuat = new THREE.Quaternion();

        this.cameraBase = new THREE.Object3D();
        this.cameraBase.position.copy(this.camera.position);
        this.cameraBase.quaternion.copy(this.camera.quaternion);
        this.target.attach(this.cameraBase);

        this.cameraHigh = new THREE.Camera();
        this.cameraHigh.position.copy(this.camera.position);
        this.cameraHigh.position.y += 10;
        this.cameraHigh.lookAt(this.target.position);
        this.target.attach(this.cameraHigh);

        this.xAxis = new THREE.Vector3(1, 0, 0);
        this.yAxis = new THREE.Vector3(0, 1, 0);
        this.forward = new THREE.Vector3(0, 0, 1); // Initialize forward direction
        this.down = new THREE.Vector3(0, -1, 0);

        this.checkForGamepad();

        // Check for mobile for screen control initiation
        if ("ontouchstart" in document.documentElement) {
            this.initOnscreenController();
        } else {
            this.initKeyboardControl();
        }
    }

    initKeyboardControl() {
        document.addEventListener('keydown', this.keyDown.bind(this));
        document.addEventListener('keyup', this.keyUp.bind(this));
        document.addEventListener('mousedown', this.mouseDown.bind(this));
        document.addEventListener('mouseup', this.mouseUp.bind(this));
        document.addEventListener('mousemove', this.mouseMove.bind(this));

        this.keys = {
            w: false,
            a: false,
            d: false,
            s: false,
            mousedown: false,
            mouseorigin: { x: 0, y: 0 }
        };
    }


    /**
    * ! KEY CONTROLS
    */
    keyDown(e) {
        switch (e.keyCode) {
            case 87: // W
                this.keys.w = true;
                break;
            case 65: // A
                this.keys.a = true;
                break;
            case 83: // S
                this.keys.s = true;
                break;
            case 68: // D
                this.keys.d = true;
                break;
            case 32: // Space
                this.fire();
                break;
        }
    }

    keyHandler() {
        if (this.keys.w) this.move.up = 1;
        if (this.keys.s) this.move.up = -1;
        if (this.keys.a) this.move.right = -1;
        if (this.keys.d) this.move.right = 1;

        if (!this.keys.w && !this.keys.s) this.move.up = 0;
        if (!this.keys.a && !this.keys.d) this.move.right = 0;
    }

    keyUp(e) {
        switch (e.keyCode) {
            case 87: // W
                this.keys.w = false;
                if (!this.keys.s) this.move.up = 0;
                break;
            case 65: // A
                this.keys.a = false;
                if (!this.keys.d) this.move.right = 0;
                break;
            case 83: // S
                this.keys.s = false;
                if (!this.keys.w) this.move.up = 0;
                break;
            case 68: // D
                this.keys.d = false;
                if (!this.keys.a) this.move.right = 0;
                break;
        }
    }

    /**
    * ! MOUSE CAMERA LOOK AROUND CONTROLS
    */
    mouseDown(e) {
        this.keys.mousedown = true;
        this.keys.mouseorigin.x = e.offsetX;
        this.keys.mouseorigin.y = e.offsetY;
    }

    mouseUp() {
        this.keys.mousedown = false;
        this.look.up = 0;
        this.look.right = 0;
    }

    mouseMove(e) {
        if (!this.keys.mousedown) return;

        let offsetX = e.offsetX - this.keys.mouseorigin.x;
        let offsetY = e.offsetY - this.keys.mouseorigin.y;

        if (offsetX<-100) offsetX = -100;
        if (offsetX>100) offsetX = 100;
        offsetX /= 100;

        if (offsetY<-100) offsetY = -100;
        if (offsetY>100) offsetY = 100;
        offsetY /= 100;

        this.onLook(-offsetY, offsetX);
    }


    fire() {
        console.log("fire");
    }

    moveUp(up, right) {
        this.move.up = up;
        this.move.right = right;
    }

    onLook( up, right ){
        this.look.up = up*0.25;
        this.look.right = -right;
    }

    checkForGamepad() {
        // Implement gamepad check if needed
    }

    initOnscreenController() {
        // Implement onscreen controller if needed
    }

    update(dt = 0.0167) {
        let playerMoved = false;
        let speed;

        if (this.gamepad) {
            this.gamepadHandler();
        } else if (this.keys) {
            this.keyHandler();
        }

        if (this.move.up !== 0) {
            const forward = this.forward.clone().applyQuaternion(this.target.quaternion);
            speed = this.move.up > 0 ? this.speed * dt : this.speed * dt * 0.3;
            speed *= this.move.up;
            const pos = this.target.position.clone().add(forward.multiplyScalar(speed));
            pos.y += 2;
            //console.log(`Moving>> target rotation:${this.target.rotation} forward:${forward} pos:${pos}`);

            this.raycaster.set(pos, this.down);

            const intersects = this.raycaster.intersectObject(this.navMesh);

            if (intersects.length > 0) {
                this.target.position.copy(intersects[0].point);
                playerMoved = true;
            }
        }

        if (Math.abs(this.move.right) > 0.1) {
            const theta = dt * (this.move.right - 0.1) * 1;
            this.target.rotateY(theta);
            playerMoved = true;
        }

        if (playerMoved) {
            this.cameraBase.getWorldPosition(this.tmpVec3);
            this.camera.position.lerp(this.tmpVec3, 0.7);

            let run = false;
            if (speed > 0.03) {
                if (this.overRunSpeedTime) {
                    const elapsedTime = this.clock.elapsedTime - this.overRunSpeedTime;
                    run = elapsedTime > 0.1;
                } else {
                    this.overRunSpeedTime = this.clock.elapsedTime;
                }
            } else {
                delete this.overRunSpeedTime;
            }
            if (run) {
                this.player.action = 'run';
            } else {
                this.player.action = 'walk';
            }
        } else {
            if (this.player !== undefined) this.player.action = 'idle';
        }

        if (this.look.up == 0 && this.look.right == 0) {
            let lerpSpeed = 0.7;
            this.cameraBase.getWorldPosition(this.tmpVec3);
            this.cameraBase.getWorldQuaternion(this.tmpQuat);
            this.camera.position.lerp(this.tmpVec3, lerpSpeed);
            this.camera.quaternion.slerp(this.tmpQuat, lerpSpeed);
        } else {
            const delta = 1 * dt;
            this.camera.rotateOnWorldAxis(this.yAxis, this.look.right * delta);
            const cameraXAxis = this.xAxis.clone().applyQuaternion(this.camera.quaternion);
            this.camera.rotateOnWorldAxis(cameraXAxis, this.look.up * delta);
        }
    }
}

export { Controller };