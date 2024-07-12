import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as TWEEN from "@tweenjs/tween.js";

class Player {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.assetsPath = game.assetsPath;

        this.load();
    }

    load() {
        const loader = new GLTFLoader().setPath(this.assetsPath);
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("assets/draco/three137/draco/");
        loader.setDRACOLoader(dracoLoader);
        
        loader.load(
            "solder.glb",
            (gltf) => {
                if(!gltf) {
                    console.warn("not gltf")
                }

                this.player = gltf.scene;
                this.player.scale.set(1.9, 1.9, 1.9);
                this.player.position.set(-26.635976182701455, 0.305538911068453,  6.597102003903492);               
                this.scene.add(this.player);
                this.player.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                    }
                });

                this.mixer = new THREE.AnimationMixer(this.player);

                this.animations = {};

                gltf.animations.forEach(animation => {
                    this.animations[animation.name.toLowerCase()] = animation;
                });

                this.newAnim();
            },
            undefined,
            (error) => {
                console.error("An error occurred while loading the soldier model", error);
            }
        );
    }

    newAnim() {
        const keys = Object.keys(this.animations);
        
        let foundIdle = false;
        keys.forEach(elem => {
            if (elem.includes("idle")) {
                this.action = elem;
                foundIdle = true;
            }
        });

        if (!foundIdle) {
            console.warn("Idle animation not found");
        }
    }

    set action(name) {
        if (this.actionName === name.toLowerCase()) return;

        const clip = this.animations[name.toLowerCase()];

        if (!clip) {
            console.error(`Animation clip not found: ${name}`);
            return;
        }

        const action = this.mixer.clipAction(clip);

        if (name === 'death') {
            action.clampWhenFinished = true;
            action.setLoop(THREE.LoopOnce);
        } else {
            action.setLoop(THREE.LoopRepeat);
        }

        action.reset();

        const nofade = this.actionName === 'death';

        this.actionName = name.toLowerCase();

        action.play();

        if (this.curAction) {
            if (nofade) {
                this.curAction.enabled = false;
            } else {
                this.curAction.crossFadeTo(action, 0.5, true);
            }
        }

        this.curAction = action;
    }

    update(deltaTime) {
        TWEEN.update();

        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }
}

export { Player };
