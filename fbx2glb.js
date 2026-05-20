// Simpler FBX to GLB - uses fflate + manual parsing
// Actually use a working approach with assimp-wasm

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const INPUT = 'C:\\Users\\ysv89\\OneDrive\\Masaüstü\\X Bot.fbx';
const OUTPUT = 'C:\\Users\\ysv89\\OneDrive\\Masaüstü\\glucolens\\public\\xbot.glb';

// Try multiple conversion methods
async function convert() {
  
  // Method 1: assimp-wasm
  try {
    console.log('Trying assimp-wasm...');
    execSync('npm install assimp-wasm', { stdio: 'inherit' });
    const AssimpWasm = require('assimp-wasm');
    const assimp = await AssimpWasm();
    const data = fs.readFileSync(INPUT);
    const result = assimp.convert(data, 'fbx', 'glb');
    fs.writeFileSync(OUTPUT, Buffer.from(result));
    console.log('✅ Done! GLB saved.');
    return;
  } catch(e) {
    console.log('assimp-wasm failed:', e.message);
  }

  // Method 2: node-three-fbx
  try {
    console.log('Trying three + jsdom...');
    execSync('npm install jsdom canvas three', { stdio: 'inherit' });
    
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.DOMParser = dom.window.DOMParser;
    global.self = global.window;
    global.TextDecoder = require('util').TextDecoder;
    global.TextEncoder = require('util').TextEncoder;

    const THREE = require('three');
    
    console.log('Three.js loaded, version:', THREE.REVISION);
    console.log('✅ Three.js available. Manual GLB generation starting...');
    
    // Read FBX and extract basic geometry
    // Since full FBX parsing is complex, we'll create a T-pose from scratch
    // and save it as GLB
    
    // Create a simple human figure scene
    const scene = new THREE.Scene();
    
    // This is a fallback - create geometric human
    const geo = new THREE.BufferGeometry();
    // ... geometry data
    
    console.log('Scene created');
    
  } catch(e2) {
    console.log('three failed:', e2.message);
  }
  
  console.log('All methods failed. Please use online converter at:');
  console.log('https://www.greentoken.de/onlineconv/');
  console.log('Or: https://products.aspose.app/3d/conversion/fbx-to-glb');
}

convert();
