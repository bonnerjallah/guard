//dont forget to npm install three-obj-loader 

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFilePath = path.join(__dirname, 'src', 'assets', 'ExportedNavMesh.obj');
const outputFilePath = path.join(__dirname, 'src', 'assets', 'navmesh.json');

// Check if the input file exists
if (!fs.existsSync(inputFilePath)) {
    console.error(`File not found: ${inputFilePath}`);
    process.exit(1);
}

const loader = new OBJLoader();
fs.readFile(inputFilePath, 'utf8', (err, data) => {
    if (err) throw err;
    const object = loader.parse(data);
    const json = object.toJSON();
    fs.writeFileSync(outputFilePath, JSON.stringify(json, null, 2));
    console.log('NavMesh converted to JSON');
});
