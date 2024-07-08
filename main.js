import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { Pathfinding } from 'three-pathfinding';
import * as YUKA from "yuka"

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { Soldier } from './src/Soldier';

class Game {
  constructor() {
    // Create a container for the scene
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Initialize clock for timing
    this.clock = new THREE.Clock();
    this.assetsPath = './src/assets/';

    // Set up the scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 20, 18);

    // Initialize the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Set up environment and controls
    this.setEnvironment();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Add ambient and directional lights
    const ambLight = new THREE.AmbientLight(0xFFFFFF, 1);
    this.scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Raycaster
    this.mousePosition = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();


    // Bind event listeners
    // window.addEventListener("mousemove", this.onMouseMove.bind(this));
    window.addEventListener("click", this.onClick.bind(this));

    // Start loading assets
    this.load();

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  setEnvironment() {
    const loader = new RGBELoader().setPath(this.assetsPath);
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    loader.load(
      'hdr/venice_sunset_1k.hdr',
      (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        pmremGenerator.dispose();
        this.scene.environment = envMap;

        // Now that environment is set, start the animation loop
        this.animate();
      },
      undefined,
      (error) => {
        console.error('An error occurred while loading environment', error.message);
      }
    );
  }

  load() {
    this.loadEnvironment();
    this.soldier = new Soldier(this);
  }

  initPathFinding(navmesh) {
    this.pathfinder = new Pathfinding();
    this.ZONE = "factory"
    this.pathfinder.setZoneData(this.ZONE, Pathfinding.createZone(navmesh.geometry, 0.02));
  }


  loadEnvironment() {
    const loader = new GLTFLoader().setPath(this.assetsPath);
    loader.load(
      'factory2.glb',
      (gltf) => {
        this.scene.add(gltf.scene);
        this.fans = []
        gltf.scene.traverse(child => {
          if(child.isMesh) {
            if(child.name == "NavMesh") {
              child.material.transparent = true;
              child.material.opacity = 0.5;
              this.navMesh = child;
              // Rotate the navmesh geometry if necessary
              const rotationMatrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);
              child.geometry.applyMatrix4(rotationMatrix);
              this.navMesh.quaternion.identity()
            } else if (child.name.includes("fan")) {
              this.fans.push(child)
            }
          }
        });

        this.initPathFinding(this.navMesh);

      },
      undefined,
      (error) => {
        console.error('An error occurred while loading the environment', error);
      }
    );
  }

  newPath(destination) {
    // Clone destination for safety
    destination = destination.clone();
  
    // Ensure soldier and pathfinding are ready
    if (!this.soldier || !this.pathfinder || !this.navMesh) {
      console.error("Soldier, pathfinder, or navMesh not initialized properly");
      return;
    }
  
    // Get the navigation mesh group and closest node to the destination
    const groupID = this.pathfinder.getGroup(this.ZONE, destination);
    const closestNode = this.pathfinder.getClosestNode(destination, this.ZONE, groupID);
  
    console.log("Group ID:", groupID);
    console.log("Closest Node:", closestNode);
  
    // Calculate path to the destination
    this.calculatedPath = this.pathfinder.findPath(
      this.soldier.swatguy.position,
      destination,
      this.ZONE,
      groupID
    );
  
    console.log("Calculated Path:", this.calculatedPath);
  
    // Check if a valid path was found
    if (this.calculatedPath && this.calculatedPath.length) {
      this.soldier.action = "walking";
      this.setTargetDirection(this.calculatedPath[0].clone());
  
    } else {
      console.log("No path found to destination");
      this.soldier.action = "idle";
    }
  }

  setTargetDirection(destination) {
    // Ensure soldier looks towards the destination
    const swatGuy = this.soldier.swatguy;
    destination.y = swatGuy.position.y;
    swatGuy.lookAt(destination);
  }
  

  onClick(event) {
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mousePosition, this.camera);
    const intersects = this.raycaster.intersectObjects([this.navMesh]);

    if (intersects.length > 0) {
      const destination = intersects[0].point;
      console.log('Clicked at:', destination);
      this.newPath(destination);
    }
  }


  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate = () => {
    const deltaTime = this.clock.getDelta();

    if(this.fans && this.fans.length > 0) {
      this.fans.forEach( fan => {
        fan.rotation.x += 0.1
      })
    }

  
    if (this.soldier) {
      this.soldier.update(deltaTime);

  
      if (this.calculatedPath && this.calculatedPath.length > 0) {
        const targetPosition = this.calculatedPath[0].clone();
        const soldierPosition = this.soldier.swatguy.position.clone();
  
        // Calculate direction and distance to the target
        const direction = targetPosition.clone().sub(soldierPosition);
        const distance = direction.length();
  
        if (distance > 0.01) {
          direction.normalize();
  
          // Move soldier towards the target
          const speed = 1.5; // Adjust as needed
          this.soldier.swatguy.position.add(direction.multiplyScalar(deltaTime * speed));
  
          // Check if reached or overshot the target
          if (direction.dot(targetPosition.clone().sub(soldierPosition)) <= 0) {
            this.calculatedPath.shift(); // Remove the current target
            if (this.calculatedPath.length === 0) {
              // If no more targets, go idle or set new path
              this.soldier.action = "idle";
              // Example: this.newPath(this.randomWaypoint);
            } else {
              // Set new direction towards the next target
              this.setTargetDirection(this.calculatedPath[0]);
            }
          }
        } else {
          // If very close to the target, treat as reached
          this.calculatedPath.shift(); // Remove the current target
          if (this.calculatedPath.length === 0) {
            // If no more targets, go idle or set new path
            this.soldier.action = "idle";
            // Example: this.newPath(this.randomWaypoint);
          } else {
            // Set new direction towards the next target
            this.setTargetDirection(this.calculatedPath[0]);
          }
        }
      }
    }
  
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };
  
}

export { Game };
