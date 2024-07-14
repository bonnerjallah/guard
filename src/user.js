import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { Quaternion } from "three";

class Player {
    constructor(game, pos, heading ) {
        this.root = new THREE.Group();
        this.root.position.copy(pos);
        this.root.rotation.set(0, heading, 0, "XYZ")


        this.game = game;
        this.camera = game.camera;

        this.scene = game;
        this.assetsPath = game.assetsPath;

        this.raycaster = new THREE.Raycaster();
        this.mousePosition = new THREE.Vector2();

        game.scene.add(this.root)

        this.load();

        this.initMouseHandler()

        this.initRifleDirection()
    }

    set position(pos){
        this.root.position.copy( pos );
    }

    initRifleDirection(){
        this.rifleDirection = {};

        this.rifleDirection.idle = new Quaternion(-0.178, -0.694, 0.667, 0.203);
		this.rifleDirection.walk = new Quaternion( 0.044, -0.772, 0.626, -0.102);
		this.rifleDirection.firingwalk = new Quaternion(-0.025, -0.816, 0.559, -0.147);
		this.rifleDirection.firing = new Quaternion( 0.037, -0.780, 0.6, -0.175);
		this.rifleDirection.run = new Quaternion( 0.015, -0.793, 0.595, -0.131);
		this.rifleDirection.shot = new Quaternion(-0.082, -0.789, 0.594, -0.138);
    }

    initMouseHandler() {
        const mousePosition = { x: 0, y: 0 };

        const raycast = (e) => {
            mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
            mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;


            this.raycaster.setFromCamera(mousePosition, this.camera);

            const intersects = this.raycaster.intersectObject(this.game.navMesh, true);

            if (intersects.length > 0) {
                const point = intersects[0].point;
                this.root.position.copy(point);
            } else {
                console.log("No intersections detected");
            }
        };

        this.game.renderer.domElement.addEventListener("click", raycast, false);
    }

    load() {
        const loader = new GLTFLoader().setPath(this.assetsPath);
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("assets/draco/three137/draco/");
        loader.setDRACOLoader(dracoLoader);
        
        loader.load(
            "myeve.glb",
            (gltf) => {
                if (!gltf) {
                    console.warn("player gltf not loaded properly");
                    return;
                }
    
                this.root.add(gltf.scene);
                this.object = gltf.scene;
        
                this.object.scale.set(1.8, 1.8, 1.8);
                
                // Set the look vector to where you want the character to face
                const look = new THREE.Vector3(23.61,  0.220, 2.94);
                this.object.lookAt(look);
        
                // Traversing meshes
                this.object.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        if (child.name.includes("Rifle")) {
                            this.rifle = child;
                        }
                    }
                });
    
                this.animations = {};
    
                gltf.animations.forEach( animation => {
                    this.animations[animation.name.toLowerCase()] = animation;
                })
    
                this.mixer = new THREE.AnimationMixer(gltf.scene);
    
                // Set initial action
                this.action = "idle";

                this.ready = true;
            },
            undefined,
            (error) => {
                console.error("An error occurred while loading the soldier model", error);
            }
        );
    }
    
    set action(name) {

        // Check if the action is already set
        if (this.actionName == name.toLowerCase()) return 

        // Fetch the animation clip for the given action name
        const clip = this.animations[name.toLowerCase()];

        // If the clip is found, proceed with the action change
        if (clip !== undefined) {
            const action = this.mixer.clipAction(clip);

            // Special handling for "shot" action
            if (name.toLowerCase() === 'shot') {
                action.clampWhenFinished = true;
                action.setLoop(LoopOnce);
            }

            action.reset();

            const nofade = this.actionName === 'shot';
            this.actionName = name.toLowerCase();

            action.play();

            // Handle the transition from the current action to the new action
            if (this.curAction) {
                if (nofade) {
                    this.curAction.enabled = false;
                } else {
                    this.curAction.crossFadeTo(action, 0.5);
                }
            }

            this.curAction = action;

            // Adjust the rifle's quaternion if the direction is defined
            if (this.rifle && this.rifleDirection) {
                const qua = this.rifleDirection[name.toLowerCase()];
                if (qua !== undefined) {
                    this.rifle.quaternion.copy(qua);
                    this.rifle.rotateX(Math.PI / 2);
                }
            }
        } else {
            console.warn(`No animation clip found for action: ${name}`);
        }
    }

    update(dt){
		if (this.mixer) this.mixer.update(dt);
        if (this.rotateRifle !== undefined){
			this.rotateRifle.time += dt;
			if (this.rotateRifle.time > 0.5){
				this.rifle.quaternion.copy( this.rotateRifle.end );
				delete this.rotateRifle;
			}else{
				this.rifle.quaternion.slerpQuaternions(this.rotateRifle.start, this.rotateRifle.end, this.rotateRifle.time * 2);
			}
		}
    }
    
}

export { Player };
