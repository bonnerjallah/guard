import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { Pathfinding } from 'three-pathfinding';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SoldierHandler } from './src/SoldierHandler';
import { Player } from './src/user';
import { Controller } from './src/controller';

class Game {
  constructor() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    this.clock = new THREE.Clock();
    this.assetsPath = './src/assets/';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set( 0, 25, 10);
    // this.camera.position.set( -10.6, 1.6, -1.46 );
		this.camera.rotation.y = -Math.PI*0.5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.setEnvironment();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    const ambLight = new THREE.AmbientLight(0xFFFFFF, 1);
    this.scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    this.load();
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
    this.soldierHandler = new SoldierHandler(this);
    this.player = new Player(this, new THREE.Vector3(-25.20, 0.274, 4.55), 0);
  }

  loadEnvironment() {
    const loader = new GLTFLoader().setPath(this.assetsPath);
    
    loader.load(
      'factory2.glb',
      (gltf) => {
        this.scene.add(gltf.scene);
        this.factory = gltf.scene;
        this.fans = [];
        
        gltf.scene.traverse(child => {
          if (child.isMesh) {
            if (child.name === "NavMesh") {
              this.navMesh = child;
              child.material.visible = false;

              this.scene.add(this.navMesh);

              // Adjust the geometry and position if necessary
              child.geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
              child.quaternion.identity()

              this.controller = new Controller(this)

              this.initPathFinding(this.navMesh.geometry); 

            } else if (child.name.includes("fan")) {
              this.fans.push(child);
            }
          }
        });
      },
      undefined,
      (error) => {
        console.error('An error occurred while loading the environment', error);
      }
    );
  }

  initPathFinding(navMeshGeometry) {
    this.waypoints = [
      new THREE.Vector3(-27.81882856537557, 0.29805159497625056, -13.577763443433025),
      new THREE.Vector3(-22.900421897999955, 0.43245118856430054, -28.610566022869367),
      new THREE.Vector3(-9.6039526393299, 0.15212018774085578, -23.661349904821297),
      new THREE.Vector3(11.139411311784096, 0.05447075365474063, -25.34194772470427),
      new THREE.Vector3(22.49270810795621, 0.11702865545139929, -15.644607959332292),
      new THREE.Vector3(17.87991236742986, 0.03516335914545721, 0.1599387825660159),
      new THREE.Vector3(2.111216066142397, 0.599118173122406, -4.51340439470359),
      new THREE.Vector3(-6.43017239446311, 0.0157847404480016, -4.499039174719126)
    ];

    this.ZONE = "factory"; 
    this.pathfinder = new Pathfinding();
    this.pathfinder.setZoneData(this.ZONE, Pathfinding.createZone(navMeshGeometry, 0.02));
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    if (this.fans) {
      this.fans.forEach(fan => {
        fan.rotation.x += 0.05;
      })
    }

    if (this.soldierHandler && this.soldierHandler.soldiers) {
      this.soldierHandler.soldiers.forEach((soldier) => {
        soldier.update(delta);
      });
    }

    if(this.player !== undefined) {
      this.player.update(delta);
      if(this.controller !== undefined) {
        this.controller.update(delta)
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

export { Game };