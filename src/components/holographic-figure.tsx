/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef } from "react";

export function HolographicFigure({ size = "full" }: { size?: "full" | "small" }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  const W = size === "small" ? 200 : 320;
  const H = size === "small" ? 360 : 580;

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    let renderer: any = null;

    // If Three.js already loaded (preloaded in layout), init directly
    const T: any = (window as any).THREE;
    if (T) {
      initThree(T);
      return;
    }

    // Otherwise load dynamically
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.onload = () => {
      const T2: any = (window as any).THREE;
      if (T2) initThree(T2);
    };
    document.head.appendChild(script);

    function initThree(T: any) {

      renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setClearColor(0x020a12, 1);
      renderer.shadowMap.enabled = false;
      container.appendChild(renderer.domElement);

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(40, W / H, 0.01, 100);
      camera.position.set(0, 1.1, size === "small" ? 3.2 : 3.8);
      camera.lookAt(0, 1.0, 0);

      // GLSL Hologram Shader
      const VS = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main(){
          vUv=uv;
          vNormal=normalize(normalMatrix*normal);
          vec4 wp=modelMatrix*vec4(position,1.0);
          vWorldPos=wp.xyz;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        }`;

      const FS = `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uScanlines;
        uniform float uSpeed;
        uniform float uBright;
        uniform float uFresnel;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        float rand(vec2 st){return fract(sin(dot(st,vec2(12.9898,78.233)))*43758.5453);}
        void main(){
          vec3 vd=normalize(cameraPosition-vWorldPos);
          float fr=pow(clamp(1.0-dot(vd,vNormal),0.0,1.0),uFresnel*2.2);
          float scan=step(0.5,fract(vWorldPos.y*uScanlines-uTime*uSpeed));
          float sm=mix(0.28,1.0,scan)*uBright;
          float flick=0.88+0.12*sin(uTime*6.5+vWorldPos.y*8.0);
          float glitch=step(0.975,rand(vec2(floor(vWorldPos.y*25.0),floor(uTime*3.0))))*0.05;
          vec3 col=uColor*(sm+glitch)*flick;
          col+=uColor*fr*1.1;
          float alpha=(sm*0.42+fr*0.75+glitch)*uOpacity;
          gl_FragColor=vec4(col,clamp(alpha,0.0,1.0));
        }`;

      const holoMats: any[] = [];

      function makeHoloMat(hex: string) {
        const m = new T.ShaderMaterial({
          vertexShader: VS,
          fragmentShader: FS,
          uniforms: {
            uTime: { value: 0 },
            uColor: { value: new T.Color(hex) },
            uScanlines: { value: 48 },
            uSpeed: { value: 1.4 },
            uBright: { value: 1.15 },
            uFresnel: { value: 2.0 },
            uOpacity: { value: 0.82 },
            cameraPosition: { value: camera.position.clone() },
          },
          transparent: true,
          side: T.DoubleSide,
          depthWrite: false,
          blending: T.AdditiveBlending,
        });
        holoMats.push(m);
        return m;
      }

      // Stars
      const starPos: number[] = [];
      for (let i = 0; i < 180; i++) {
        starPos.push(
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 6 - 3
        );
      }
      const sg = new T.BufferGeometry();
      sg.setAttribute("position", new T.Float32BufferAttribute(starPos, 3));
      scene.add(new T.Points(sg, new T.PointsMaterial({
        size: 0.018, color: 0xaaccff, transparent: true, opacity: 0.45,
        blending: T.AdditiveBlending, depthWrite: false,
      })));

      // Ground rings
      const ringMats: any[] = [];
      [[0.1, 1.1, 0x003355, 0.22], [1.0, 1.3, 0x002244, 0.12], [1.2, 1.5, 0x001133, 0.07]].forEach(
        ([r0, r1, col, op]) => {
          const m = new T.MeshBasicMaterial({
            color: col, transparent: true, opacity: op,
            side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false,
          });
          ringMats.push(m);
          const ring = new T.Mesh(new T.RingGeometry(r0, r1, 64), m);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = -0.01;
          scene.add(ring);
        }
      );

      // Glow sprite helper
      function glowSprite(col: string, sz: number, x: number, y: number, z: number) {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const ctx = c.getContext("2d")!;
        const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, col.replace(")", ",1)"));
        gr.addColorStop(0.4, col.replace(")", ",0.5)"));
        gr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(32, 32, 32, 0, Math.PI * 2);
        ctx.fill();
        const sp = new T.Sprite(new T.SpriteMaterial({
          map: new T.CanvasTexture(c),
          color: new T.Color(col),
          transparent: true,
          blending: T.AdditiveBlending,
          depthWrite: false,
          opacity: 0.9,
        }));
        sp.scale.set(sz, sz, 1);
        sp.position.set(x, y, z);
        scene.add(sp);
        return sp;
      }

      // Organs
      const heart1 = glowSprite("rgb(255,45,65)", 0.5, 0, 1.35, 0.12);
      const heart2 = glowSprite("rgb(255,160,140)", 0.18, 0, 1.35, 0.15);
      const brain = glowSprite("rgb(180,110,255)", 0.42, 0, 2.18, 0.1);
      const lungL = glowSprite("rgb(0,190,255)", 0.28, -0.18, 1.42, 0.08);
      const lungR = glowSprite("rgb(0,190,255)", 0.28, 0.18, 1.42, 0.08);
      glowSprite("rgb(255,120,35)", 0.26, 0.12, 1.12, 0.06);
      glowSprite("rgb(255,180,45)", 0.2, 0, 1.02, 0.08);

      // Joint nodes
      const joints = [
        glowSprite("rgb(255,180,45)", 0.15, -0.55, 1.72, 0),
        glowSprite("rgb(255,180,45)", 0.15, 0.55, 1.72, 0),
        glowSprite("rgb(255,180,45)", 0.13, -0.95, 1.42, 0),
        glowSprite("rgb(255,180,45)", 0.13, 0.95, 1.42, 0),
        glowSprite("rgb(0,200,255)", 0.11, -1.25, 1.12, 0),
        glowSprite("rgb(0,200,255)", 0.11, 1.25, 1.12, 0),
        glowSprite("rgb(255,180,45)", 0.15, -0.18, 0.82, 0),
        glowSprite("rgb(255,180,45)", 0.15, 0.18, 0.82, 0),
        glowSprite("rgb(255,180,45)", 0.13, -0.18, 0.32, 0),
        glowSprite("rgb(255,180,45)", 0.13, 0.18, 0.32, 0),
        glowSprite("rgb(0,200,255)", 0.1, -0.18, -0.1, 0),
        glowSprite("rgb(0,200,255)", 0.1, 0.18, -0.1, 0),
      ];

      // Build fallback geometric human
      function buildFallback() {
        const grp = new T.Group();
        function add(geo: any, col: string, x: number, y: number, z: number, rz = 0) {
          const m = makeHoloMat(col);
          const mesh = new T.Mesh(geo, m);
          mesh.position.set(x, y, z);
          mesh.rotation.z = rz;
          grp.add(mesh);
        }
        add(new T.SphereGeometry(0.22, 32, 32), "#00d8ff", 0, 1.62, 0);
        add(new T.CylinderGeometry(0.09, 0.11, 0.18, 20), "#00c0e8", 0, 1.28, 0);
        add(new T.CylinderGeometry(0.27, 0.24, 0.52, 32), "#00b8e0", 0, 0.88, -0.02);
        add(new T.CylinderGeometry(0.22, 0.2, 0.36, 28), "#00a8d0", 0, 0.46, 0);
        add(new T.CylinderGeometry(0.22, 0.25, 0.2, 28), "#009ec8", 0, 0.2, 0);
        add(new T.CylinderGeometry(0.075, 0.065, 0.38, 16), "#00b4dc", -0.38, 0.88, 0, 0.42);
        add(new T.CylinderGeometry(0.065, 0.055, 0.36, 16), "#00a8d0", -0.62, 0.66, 0, 0.52);
        add(new T.CylinderGeometry(0.075, 0.065, 0.38, 16), "#00b4dc", 0.38, 0.88, 0, -0.42);
        add(new T.CylinderGeometry(0.065, 0.055, 0.36, 16), "#00a8d0", 0.62, 0.66, 0, -0.52);
        add(new T.CylinderGeometry(0.115, 0.1, 0.5, 20), "#0094bc", -0.13, -0.18, 0);
        add(new T.CylinderGeometry(0.09, 0.08, 0.46, 16), "#0088b0", -0.14, -0.6, 0);
        add(new T.BoxGeometry(0.14, 0.08, 0.25), "#007098", -0.14, -1.0, 0.04);
        add(new T.CylinderGeometry(0.115, 0.1, 0.5, 20), "#0094bc", 0.13, -0.18, 0);
        add(new T.CylinderGeometry(0.09, 0.08, 0.46, 16), "#0088b0", 0.14, -0.6, 0);
        add(new T.BoxGeometry(0.14, 0.08, 0.25), "#007098", 0.14, -1.0, 0.04);
        scene.add(grp);
      }

      // Try loading GLB model
      const loaderScript2 = document.createElement("script");
      loaderScript2.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js";
      loaderScript2.onload = () => {
        const GLTFLoader = (T as any).GLTFLoader;
        if (!GLTFLoader) { buildFallback(); return; }
        const loader = new GLTFLoader();
        loader.load(
          "/xbot.glb",
          (gltf: any) => {
            const model = gltf.scene;
            model.traverse((child: any) => {
              if (child.isMesh) {
                const isSurface = String(child.name || "").toLowerCase().includes("surface");
                child.material = makeHoloMat(isSurface ? "#00ccff" : "#00eeff");
                child.frustumCulled = false;
              }
            });
            const box = new T.Box3().setFromObject(model);
            const s = new T.Vector3();
            box.getSize(s);
            const sc = 2.2 / s.y;
            model.scale.setScalar(sc);
            const center = new T.Vector3();
            box.getCenter(center);
            model.position.set(-center.x * sc, -center.y * sc + 0.1, -center.z * sc);
            scene.add(model);
          },
          undefined,
          () => buildFallback()
        );
      };
      loaderScript2.onerror = () => buildFallback();
      document.head.appendChild(loaderScript2);

      // Animate
      let frame2 = 0, hb = 0;
      function animate() {
        frameRef.current = requestAnimationFrame(animate);
        frame2++;
        const tt = frame2 * 0.016;
        hb += 0.09;

        holoMats.forEach((m) => {
          m.uniforms.uTime.value = tt;
          m.uniforms.cameraPosition.value.copy(camera.position);
        });

        // Heart beat
        const hp = hb % (Math.PI * 2);
        const hs = hp < 0.45
          ? 1 + Math.sin((hp * Math.PI) / 0.45) * 0.55
          : hp < 1.0
          ? 1 + Math.sin(((hp - 0.45) * Math.PI) / 0.55) * 0.25
          : 1;
        heart1.scale.set(0.5 * hs, 0.5 * hs, 1);
        heart2.scale.set(0.18 * hs, 0.18 * hs, 1);
        heart1.material.opacity = 0.7 + 0.3 * hs;

        const bp = 0.6 + 0.4 * Math.sin(tt * 1.05);
        brain.material.opacity = 0.65 * bp;
        brain.scale.set(0.42 * bp, 0.42 * bp, 1);

        const lp = 0.55 + 0.45 * Math.sin(tt * 0.38);
        [lungL, lungR].forEach((l) => {
          l.material.opacity = 0.55 * lp;
          l.scale.set(0.28 * lp, 0.28 * lp, 1);
        });

        joints.forEach((j, i) => {
          const p = 0.5 + 0.5 * Math.sin(tt * 1.2 + i * 0.6);
          j.material.opacity = 0.65 * p;
        });

        ringMats[0].opacity = 0.18 + 0.06 * Math.sin(tt * 0.7);
        ringMats[1].opacity = 0.1 + 0.04 * Math.sin(tt * 0.5);

        renderer.render(scene, camera);
      }
      animate();
    }

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement?.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: W, height: H, position: "relative", overflow: "hidden", borderRadius: 16 }}
    />
  );
}
