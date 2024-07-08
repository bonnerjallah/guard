import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

class Soldier {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.assetsPath = game.assetsPath;
        this.clock = game.clock;
        this.curAction = null;
        this.load();
    }

    load() {
        const loader = new GLTFLoader().setPath(this.assetsPath);
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('.assets/draco/three137/draco/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            "swat-guy-rifle.glb",
            (gltf) => {
                this.scene.add(gltf.scene);
                this.swatguy = gltf.scene;
                this.swatguy.scale.set(1.5, 1.5, 1.5);
                this.swatguy.position.set(-6.607, 0.017, -3.713);
                this.swatguy.traverse(child => {
                    if(child.isMesh) {
                        child.castShadow = true;
                    }
                })

                this.mixer = new THREE.AnimationMixer(gltf.scene);

                this.animations = {};

                // Store animations in a map by name
                gltf.animations.forEach(animation => {
                    this.animations[animation.name.toLowerCase()] = animation;
                });

                this.newAnim();
                
            },
            undefined,
            (error) => {
                console.error("An error occurred while loading soldier", error);
            }
        );
    }

    newAnim() {
        const keys = Object.keys(this.animations);
        // let index;

        // do {
        //     index = Math.floor(Math.random() * keys.length);
        // } while (keys[index] === this.actionName);

        // this.action = keys[index];

        keys.forEach(elem => {
            if(elem.includes("idle")) {
                this.action = elem
            }
        })

        // setTimeout(this.newAnim.bind(this), 3000);
    }

    set action(name) {
        if(this.actionName === name.toLowerCase()) return;

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
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }
}

export { Soldier };
