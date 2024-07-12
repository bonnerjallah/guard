import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { Soldier } from "./Soldier";
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

class SoldierHandler {
    constructor(game) {
        this.game = game;
        this.waypoints = game.waypoints || [];
        this.assetsPath = game.assetsPath;
        this.ready = false;
        this.load();
    }

    initMouseHandler(){
        const raycaster = new THREE.Raycaster();
        this.game.renderer.domElement.addEventListener('click', raycast, false);

        const self = this;
        const mouse = { x: 0, y: 0 };

        function raycast(e){
            mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
            mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

            raycaster.setFromCamera(mouse, self.game.camera);

            const intersects = raycaster.intersectObject(self.game.navMesh);
            if (intersects.length > 0){
                const pt = intersects[0].point;
                console.log(pt);
                self.soldiers[0].newPath(pt, true);
            }
        }
    }

    load() {
        const loader = new GLTFLoader().setPath(this.assetsPath);
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("assets/draco/three137/draco/");
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            "swat-guy-rifle.glb",
            (gltf) => {
                if (this.game.pathfinder && this.game.navMesh && this.game.navMesh.geometry) {
                    this.gltf = gltf;
                    this.initSoldier(gltf);
                } else {
                    console.log("GLTF loaded but prerequisites not met yet.");
                }
            },
            xhr => {
                // Progress callback if needed
            },
            (error) => {
                console.error("An error occurred while loading soldier", error);
            }
        );
    }

    initSoldier(gltf = this.gltf) {
        if (!gltf || !gltf.scene) {
            console.error("GLTF model not loaded properly or scene is undefined.");
            return;
        }

        this.waypoints = this.game.waypoints;

        const gltfsArray = [gltf.scene];

        for (let i = 0; i < 4; i++) {
            const cloneGltf = SkeletonUtils.clone(gltf.scene);
            gltfsArray.push(cloneGltf);
        }

        this.soldiers = [];

        gltfsArray.forEach((object) => {
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });

            const options = {
                object,
                speed: 1,
                animations: gltf.animations,
                waypoints: this.waypoints,
                app: this.game,
                zone: "factory",
                name: "swatguy",
                navMesh: this.game.navMesh.geometry
            };

            if (!options.navMesh) {
                console.error("NavMesh is not defined in options:", options);
                return;
            }

            const soldier = new Soldier(options);

            soldier.object.position.copy(this.randomWayPoint());
            soldier.object.scale.set(1.9, 1.9, 1.9);

            soldier.newPath(this.randomWayPoint());

            this.soldiers.push(soldier);
        });

        this.ready = true;
    }

    randomWayPoint() {
        if (this.waypoints.length === 0) {
            return new THREE.Vector3();
        }
        const index = Math.floor(Math.random() * this.waypoints.length);
        return this.waypoints[index];
    }

    update(deltaTime) {
        if (this.soldiers) this.soldiers.forEach(soldier => soldier.update(deltaTime));
    }
}

export { SoldierHandler };
