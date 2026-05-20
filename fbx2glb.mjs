// FBX to GLB converter using Three.js in Node.js
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);

// Install required packages first
import { execSync } from 'child_process';

console.log('Installing dependencies...');
try {
  execSync('npm install three node-canvas jsdom --save', { stdio: 'inherit' });
} catch(e) {}

// Setup DOM environment for Three.js
const { JSDOM } = await import('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.self = dom.window;

const THREE = await import('three');
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');

const INPUT = 'C:/Users/ysv89/OneDrive/Masaüstü/X Bot.fbx';
const OUTPUT = 'C:/Users/ysv89/OneDrive/Masaüstü/glucolens/public/xbot.glb';

console.log('Loading FBX...');
const fbxData = readFileSync(INPUT);
const loader = new FBXLoader();
const object = loader.parse(fbxData.buffer);

console.log('Exporting GLB...');
const exporter = new GLTFExporter();
exporter.parse(
  object,
  (result) => {
    const output = Buffer.from(result);
    writeFileSync(OUTPUT, output);
    console.log('✅ GLB saved to:', OUTPUT);
    process.exit(0);
  },
  (error) => {
    console.error('Export error:', error);
    process.exit(1);
  },
  { binary: true }
);
