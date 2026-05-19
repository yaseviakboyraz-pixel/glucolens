"use client";
import { useEffect, useRef } from "react";

export function HolographicFigure({ size = "full" }: { size?: "full" | "small" }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<unknown>(null);
  const frameRef = useRef<number>(0);

  const W = size === "small" ? 200 : 320;
  const H = size === "small" ? 360 : 580;

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // Dynamically load Three.js
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.onload = () => {
      const THREE = (window as Record<string, unknown>).THREE as {
        WebGLRenderer: new (opts: object) => {
          setSize: (w: number, h: number) => void;
          setPixelRatio: (r: number) => void;
          setClearColor: (c: number, a: number) => void;
          render: (s: unknown, c: unknown) => void;
          domElement: HTMLCanvasElement;
          dispose: () => void;
          shadowMap: { enabled: boolean };
        };
        Scene: new () => {
          add: (o: unknown) => void;
          traverse: (cb: (o: unknown) => void) => void;
        };
        PerspectiveCamera: new (fov: number, aspect: number, near: number, far: number) => {
          position: { set: (x: number, y: number, z: number) => void; copy: (v: unknown) => void };
          lookAt: (x: number, y: number, z: number) => void;
        };
        ShaderMaterial: new (opts: object) => {
          uniforms: Record<string, { value: unknown }>;
          dispose: () => void;
        };
        Color: new (c: string) => unknown;
        AdditiveBlending: number;
        DoubleSide: number;
        SphereGeometry: new (r: number, a: number, b: number) => unknown;
        CylinderGeometry: new (rt: number, rb: number, h: number, s: number) => unknown;
        BoxGeometry: new (w: number, h: number, d: number) => unknown;
        RingGeometry: new (ri: number, ro: number, s: number) => unknown;
        BufferGeometry: new () => { setAttribute: (n: string, a: unknown) => void; setFromPoints: (pts: unknown[]) => unknown };
        Float32BufferAttribute: new (arr: number[], size: number) => unknown;
        Mesh: new (g: unknown, m: unknown) => {
          position: { set: (x: number, y: number, z: number) => void; y: number };
          rotation: { x: number; y: number; z: number };
          scale: { setScalar: (s: number) => void };
          traverse: (cb: (o: unknown) => void) => void;
          frustumCulled: boolean;
        };
        Points: new (g: unknown, m: unknown) => unknown;
        PointsMaterial: new (opts: object) => unknown;
        MeshBasicMaterial: new (opts: object) => { opacity: number; dispose: () => void };
        Sprite: new (m: unknown) => { scale: { set: (x: number, y: number, z: number) => void }; position: { set: (x: number, y: number, z: number) => void }; material: { opacity: number; dispose: () => void } };
        SpriteMaterial: new (opts: object) => { opacity: number; dispose: () => void };
        CanvasTexture: new (c: HTMLCanvasElement) => unknown;
        Line: new (g: unknown, m: unknown) => unknown;
        LineBasicMaterial: new (opts: object) => unknown;
        Vector3: new (x?: number, y?: number, z?: number) => { x: number; y: number; z: number };
        Box3: new () => { setFromObject: (o: unknown) => { getSize: (v: unknown) => { x: number; y: number; z: number }; getCenter: (v: unknown) => { x: number; y: number; z: number } } };
        Group: new () => { add: (o: unknown) => void; position: { y: number }; rotation: { y: number }; scale: { setScalar: (s: number) => void } };
      };

      if (!THREE) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setClearColor(0x020a12, 1);
      renderer.shadowMap.enabled = false;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, W / H, 0.01, 100);
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

      const holoMats: ReturnType<typeof THREE.ShaderMaterial>[] = [];

      function makeHoloMat(hex: string) {
        const m = new THREE.ShaderMaterial({
          vertexShader: VS, fragmentShader: FS,
          uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(hex) },
            uScanlines: { value: 48 },
            uSpeed: { value: 1.4 },
            uBright: { value: 1.15 },
            uFresnel: { value: 2.0 },
            uOpacity: { value: 0.82 },
            cameraPosition: { value: { x: 0, y: 1.1, z: size === "small" ? 3.2 : 3.8 } },
          },
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        holoMats.push(m);
        return m;
      }

      // Stars
      const starPos: number[] = [];
      for (let i = 0; i < 180; i++) {
        starPos.push((Math.random() - .5) * 16, (Math.random() - .5) * 18, (Math.random() - .5) * 6 - 3);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({
        size: .018, color: 0xaaccff, transparent: true, opacity: .45,
        blending: THREE.AdditiveBlending, depthWrite: false
      })));

      // Ground rings
      const ringMats: ReturnType<typeof THREE.MeshBasicMaterial>[] = [];
      [[.1, 1.1, 0x003355, .22], [1.0, 1.3, 0x002244, .12], [1.2, 1.5, 0x001133, .07]].forEach(([r0, r1, col, op]) => {
        const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        ringMats.push(m);
        const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), m);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, -.01, 0);
        scene.add(ring);
      });

      // Glow sprite helper
      function glowSprite(col: string, sz: number, x: number, y: number, z: number) {
        const c = document.createElement("canvas"); c.width = c.height = 64;
        const ctx = c.getContext("2d")!;
        const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, col.replace(")", ",1)"));
        gr.addColorStop(.4, col.replace(")", ",0.5)"));
        gr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.fill();
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(c), color: new THREE.Color(col),
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .9
        }));
        sp.scale.set(sz, sz, 1); sp.position.set(x, y, z);
        scene.add(sp); return sp;
      }

      // Organs
      const heart1 = glowSprite("rgb(255,45,65)", .5, 0, 1.35, .12);
      const heart2 = glowSprite("rgb(255,160,140)", .18, 0, 1.35, .15);
      const brain = glowSprite("rgb(180,110,255)", .42, 0, 2.18, .1);
      const lungL = glowSprite("rgb(0,190,255)", .28, -.18, 1.42, .08);
      const lungR = glowSprite("rgb(0,190,255)", .28, .18, 1.42, .08);
      glowSprite("rgb(255,120,35)", .26, .12, 1.12, .06);
      glowSprite("rgb(255,180,45)", .2, 0, 1.02, .08);

      // Joints
      const joints = [
        glowSprite("rgb(255,180,45)", .15, -.55, 1.72, 0),
        glowSprite("rgb(255,180,45)", .15, .55, 1.72, 0),
        glowSprite("rgb(255,180,45)", .13, -.95, 1.42, 0),
        glowSprite("rgb(255,180,45)", .13, .95, 1.42, 0),
        glowSprite("rgb(0,200,255)", .11, -1.25, 1.12, 0),
        glowSprite("rgb(0,200,255)", .11, 1.25, 1.12, 0),
        glowSprite("rgb(255,180,45)", .15, -.18, .82, 0),
        glowSprite("rgb(255,180,45)", .15, .18, .82, 0),
        glowSprite("rgb(255,180,45)", .13, -.18, .32, 0),
        glowSprite("rgb(255,180,45)", .13, .18, .32, 0),
        glowSprite("rgb(0,200,255)", .1, -.18, -.1, 0),
        glowSprite("rgb(0,200,255)", .1, .18, -.1, 0),
      ];

      // Load GLTFLoader + model
      const loaderScript2 = document.createElement("script");
      loaderScript2.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js";
      loaderScript2.onload = () => {
        const GLTFLoader = (window as Record<string, unknown>).THREE && (THREE as unknown as Record<string, unknown>).GLTFLoader;
        if (!GLTFLoader) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loader = new (GLTFLoader as any)();
        loader.load(
          "/xbot.glb",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (gltf: any) => {
            const model = gltf.scene;
            model.traverse((child: Record<string, unknown>) => {
              if ((child as { isMesh?: boolean }).isMesh) {
                const isSurface = String((child as { name?: string }).name || "").toLowerCase().includes("surface");
                (child as { material: unknown }).material = makeHoloMat(isSurface ? "#00ccff" : "#00eeff");
                (child as { frustumCulled: boolean }).frustumCulled = false;
              }
            });
            const box = new THREE.Box3().setFromObject(model);
            const sizeVec = new THREE.Vector3();
            box.setFromObject(model).getSize(sizeVec);
            const sc = 2.2 / sizeVec.y;
            model.scale.setScalar(sc);
            const center = new THREE.Vector3();
            box.setFromObject(model).getCenter(center);
            model.position.set(-center.x * sc, -center.y * sc + 0.1, -center.z * sc);
            scene.add(model);
          },
          undefined,
          () => buildFallback()
        );
      };
      loaderScript2.onerror = () => buildFallback();
      document.head.appendChild(loaderScript2);

      function buildFallback() {
        const grp = new THREE.Group();
        function add(geo: unknown, col: string, x: number, y: number, z: number, rz = 0) {
          const m = makeHoloMat(col);
          const mesh = new THREE.Mesh(geo, m);
          mesh.position.set(x, y, z);
          mesh.rotation.z = rz;
          grp.add(mesh);
        }
        add(new THREE.SphereGeometry(.22, 32, 32), "#00d8ff", 0, 1.62, 0);
        add(new THREE.CylinderGeometry(.09, .11, .18, 20), "#00c0e8", 0, 1.28, 0);
        add(new THREE.CylinderGeometry(.27, .24, .52, 32), "#00b8e0", 0, .88, -.02);
        add(new THREE.CylinderGeometry(.22, .2, .36, 28), "#00a8d0", 0, .46, 0);
        add(new THREE.CylinderGeometry(.22, .25, .2, 28), "#009ec8", 0, .2, 0);
        add(new THREE.CylinderGeometry(.075, .065, .38, 16), "#00b4dc", -.38, .88, 0, .42);
        add(new THREE.CylinderGeometry(.065, .055, .36, 16), "#00a8d0", -.62, .66, 0, .52);
        add(new THREE.CylinderGeometry(.075, .065, .38, 16), "#00b4dc", .38, .88, 0, -.42);
        add(new THREE.CylinderGeometry(.065, .055, .36, 16), "#00a8d0", .62, .66, 0, -.52);
        add(new THREE.CylinderGeometry(.115, .1, .5, 20), "#0094bc", -.13, -.18, 0);
        add(new THREE.CylinderGeometry(.09, .08, .46, 16), "#0088b0", -.14, -.6, 0);
        add(new THREE.BoxGeometry(.14, .08, .25), "#007098", -.14, -1.0, .04);
        add(new THREE.CylinderGeometry(.115, .1, .5, 20), "#0094bc", .13, -.18, 0);
        add(new THREE.CylinderGeometry(.09, .08, .46, 16), "#0088b0", .14, -.6, 0);
        add(new THREE.BoxGeometry(.14, .08, .25), "#007098", .14, -1.0, .04);
        scene.add(grp);
      }

      // Animate
      let frame2 = 0, hb = 0;
      function animate() {
        frameRef.current = requestAnimationFrame(animate);
        frame2++;
        const tt = frame2 * .016;
        hb += .09;

        holoMats.forEach(m => { m.uniforms.uTime.value = tt; });

        // Heart beat
        const hp = hb % (Math.PI * 2);
        const hs = hp < .45 ? 1 + Math.sin(hp * Math.PI / .45) * .55 : hp < 1.0 ? 1 + Math.sin((hp - .45) * Math.PI / .55) * .25 : 1;
        heart1.scale.set(.5 * hs, .5 * hs, 1);
        heart2.scale.set(.18 * hs, .18 * hs, 1);
        heart1.material.opacity = .7 + .3 * hs;

        const bp = .6 + .4 * Math.sin(tt * 1.05);
        brain.material.opacity = .65 * bp;
        brain.scale.set(.42 * bp, .42 * bp, 1);

        const lp = .55 + .45 * Math.sin(tt * .38);
        [lungL, lungR].forEach(l => { l.material.opacity = .55 * lp; l.scale.set(.28 * lp, .28 * lp, 1); });

        joints.forEach((j, i) => {
          const p = .5 + .5 * Math.sin(tt * 1.2 + i * .6);
          j.material.opacity = .65 * p;
        });

        ringMats[0].opacity = .18 + .06 * Math.sin(tt * .7);
        ringMats[1].opacity = .1 + .04 * Math.sin(tt * .5);

        renderer.render(scene, camera);
      }
      animate();
    };
    document.head.appendChild(script);

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (rendererRef.current) {
        (rendererRef.current as { dispose: () => void; domElement: HTMLCanvasElement }).dispose();
        const canvas = (rendererRef.current as { domElement: HTMLCanvasElement }).domElement;
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: W, height: H, position: "relative", overflow: "hidden", borderRadius: 16 }}
    />
  );
}
