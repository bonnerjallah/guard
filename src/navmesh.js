import * as THREE from "three";
import * as YUKA from "yuka";

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


class GameMap {
    constructor(game){
        this.game = game;
        this.scene = game.scene;
        this.assetsPath = game.assetsPath;

        this.load()

    }

    
}

export {GameMap}