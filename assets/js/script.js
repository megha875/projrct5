document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.querySelector('#themeCheckbox');
  const currentTheme = localStorage.getItem('theme');

  if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'light') {
      toggleSwitch.checked = true;
    }
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  function switchTheme(e) {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }    
  }

  toggleSwitch.addEventListener('change', switchTheme, false);
});
  
  //First Section

  (function () {
    const mount = document.getElementById('shape3d');
    if (!mount || typeof THREE === 'undefined') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    function cssVar(name, fallback) {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    function makeColor(varName, fallback) {
      const c = new THREE.Color();
      try { c.setStyle(cssVar(varName, fallback)); } catch (e) { c.set(fallback); }
      return c;
    }

    // Colors strictly local to Section 1
    const colorCyan = makeColor('--cyan', '#57ffe0');
    const colorCyanDim = makeColor('--cyan-dim', '#2c8a78');
    const colorSand = makeColor('--sand', '#f3ead9');
    const colorInkDeep = new THREE.Color('#050708');

    let width = mount.clientWidth;
    let height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    mount.appendChild(renderer.domElement);

    function rightOffset() {
      const dist = camera.position.z;
      const vFov = (camera.fov * Math.PI) / 180;
      const visibleWidth = 2 * Math.tan(vFov / 2) * dist * camera.aspect;
      return visibleWidth * 0.25; 
    }

    const rig = new THREE.Group();
    rig.position.x = rightOffset();
    scene.add(rig);

    /* Lights */
    const key = new THREE.PointLight(colorCyan, 3, 30);
    key.position.set(4, 3, 6);
    scene.add(key);

    const fill = new THREE.PointLight(colorSand, 0.6, 30);
    fill.position.set(-6, -3, 4);
    scene.add(fill);

    scene.add(new THREE.AmbientLight(colorInkDeep, 1.4));

    /* Core Shape */
    const geometry = new THREE.IcosahedronGeometry(1.6, 5);
    const basePositions = geometry.attributes.position.array.slice();

    const material = new THREE.MeshStandardMaterial({
      color: colorInkDeep.clone().lerp(colorCyanDim, 0.25),
      metalness: 0.4,
      roughness: 0.35,
      emissive: colorCyanDim,
      emissiveIntensity: 0.25,
      flatShading: true
    });
    const core = new THREE.Mesh(geometry, material);
    rig.add(core);

    const wireGeo = new THREE.IcosahedronGeometry(1.65, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: colorCyan,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const wireCore = new THREE.Mesh(wireGeo, wireMat);
    rig.add(wireCore);

    /* Particles */
    const PARTICLE_COUNT = 600;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 2.0 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      speeds[i] = 0.4 + Math.random() * 0.8;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleBase = positions.slice();

    const particleMat = new THREE.PointsMaterial({
      color: colorCyan,
      size: 0.028,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    rig.add(particles);

    function noise3D(x, y, z, t) {
      return Math.sin(x * 2.1 + t) * Math.cos(y * 1.9 + t) * Math.sin(z * 2.3 + t * 0.65) * 0.16;
    }

    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;

    window.addEventListener('mousemove', (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const posAttr = geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const ix = i * 3;
        const bx = basePositions[ix], by = basePositions[ix + 1], bz = basePositions[ix + 2];
        const len = Math.sqrt(bx * bx + by * by + bz * bz);
        const n = noise3D(bx, by, bz, t * 0.55);
        const scale = 1 + n;
        posAttr.array[ix] = (bx / len) * len * scale;
        posAttr.array[ix + 1] = (by / len) * len * scale;
        posAttr.array[ix + 2] = (bz / len) * len * scale;
      }
      posAttr.needsUpdate = true;
      geometry.computeVertexNormals();

      core.rotation.y += 0.0028;
      core.rotation.x += 0.001;
      wireCore.rotation.y -= 0.0016;
      wireCore.rotation.x += 0.0007;

      const pPos = particleGeo.attributes.position;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const bx = particleBase[ix], by = particleBase[ix + 1], bz = particleBase[ix + 2];
        const s = speeds[i];
        const drift = Math.sin(t * s + i) * 0.12;
        pPos.array[ix] = bx + drift + mouseX * 0.35;
        pPos.array[ix + 1] = by + Math.cos(t * s * 0.8 + i) * 0.12 - mouseY * 0.35;
        pPos.array[ix + 2] = bz + Math.sin(t * s * 0.6 + i) * 0.12;
      }
      pPos.needsUpdate = true;
      particles.rotation.y += 0.0009;

      rig.rotation.y += (mouseX * 0.25 - rig.rotation.y) * 0.03;
      rig.rotation.x += (-mouseY * 0.2 - rig.rotation.x) * 0.03;

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      rig.position.x = rightOffset();
    });
  })();
  //Second Section Start
  (function () {
  const container = document.getElementById('targetSection');
  const canvas = document.getElementById('webgl-canvas');
  if (!container || !canvas || typeof THREE === 'undefined') return;

  let width = container.clientWidth;
  let height = container.clientHeight;

  // 1. Scene & Camera Setup
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.z = 8.5;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0x57ffe0, 3, 30);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);

  // Helper Material Creator
  function createShapeMaterial(colorHex = 0x57ffe0) {
    return new THREE.MeshStandardMaterial({
      color: colorHex,
      wireframe: true,
      transparent: true,
      opacity: 1,
      roughness: 0.2,
      metalness: 0.8
    });
  }

  function getScaleFactor() {
    if (width <= 480) return 0.5;
    if (width <= 768) return 0.65;
    if (width <= 1024) return 0.8;
    return 1;
  }

  let scaleFactor = getScaleFactor();

  // 2. Meshes Creation
  const meshTL = new THREE.Mesh(new THREE.TorusKnotGeometry(0.5, 0.16, 64, 16), createShapeMaterial(0x57ffe0));
  const meshTR = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), createShapeMaterial(0x3a86ff));
  const meshBL = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 1), createShapeMaterial(0x3a86ff));
  const meshBR = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 16), createShapeMaterial(0x57ffe0));

  scene.add(meshTL, meshTR, meshBL, meshBR);
  const meshes = [meshTL, meshTR, meshBL, meshBR];
  meshes.forEach(m => m.scale.setScalar(scaleFactor));

  // Define 4 Corner Positions
  function getPositions() {
    const aspect = width / height;
    let centerX = aspect < 1 ? 1.8 : 4.5;
    let centerY = aspect < 1 ? 2.6 : 2.0;

    return [
      { x: -centerX, y: centerY, z: 0 },  // Index 0: Top-Left
      { x: centerX, y: centerY, z: 0 },   // Index 1: Top-Right
      { x: -centerX, y: -centerY, z: 0 }, // Index 2: Bottom-Left
      { x: centerX, y: -centerY, z: 0 }   // Index 3: Bottom-Right
    ];
  }

  let centers = getPositions();

  // Initial Colors
  const startColors = [
    new THREE.Color(0x57ffe0), // Cyan
    new THREE.Color(0x3a86ff), // Blue
    new THREE.Color(0x3a86ff), // Blue
    new THREE.Color(0x57ffe0)  // Cyan
  ];

  // Scroll Target Colors
  const targetColors = [
    new THREE.Color(0xa855f7), // Purple
    new THREE.Color(0x34d399), // Green
    new THREE.Color(0xa855f7), // Purple
    new THREE.Color(0x34d399)  // Green
  ];

  // Target positions to swap corners: TL -> BR, TR -> BL, BL -> TR, BR -> TL
  const swapMapping = [3, 2, 1, 0];

  // Current Animation Variables
  let scrollProgress = 0;
  let targetProgress = 0;

  // 3. Native Scroll Listener (Without GSAP / ScrollTrigger)
  function onScroll() {
    const rect = container.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Calculate scroll progress (0 to 1) based on section visibility
    let progress = (windowHeight - rect.top) / (windowHeight + rect.height);
    targetProgress = Math.min(Math.max(progress, 0), 1);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 4. Animation & Render Loop
  function animate() {
    requestAnimationFrame(animate);

    // Smooth Lerp for Scroll Progress (Eased transition)
    scrollProgress += (targetProgress - scrollProgress) * 0.08;

    // Update Mesh Positions and Colors based on scrollProgress
    meshes.forEach((mesh, i) => {
      // 1. Continuous Rotation
      mesh.rotation.x += 0.006 * (i + 1);
      mesh.rotation.y += 0.006 * (i + 1);

      // 2. Position Swapping Interpolation
      const startPos = centers[i];
      const targetPos = centers[swapMapping[i]];

      mesh.position.x = startPos.x + (targetPos.x - startPos.x) * scrollProgress;
      mesh.position.y = startPos.y + (targetPos.y - startPos.y) * scrollProgress;
      mesh.position.z = startPos.z + (targetPos.z - startPos.z) * scrollProgress;

      // 3. Color Changing Interpolation
      mesh.material.color.lerpColors(startColors[i], targetColors[i], scrollProgress);
    });

    renderer.render(scene, camera);
  }
  animate();

  // Resize Handler
  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      width = container.clientWidth;
      height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      const newScale = getScaleFactor();
      if (newScale !== scaleFactor) {
        scaleFactor = newScale;
        meshes.forEach(m => m.scale.setScalar(scaleFactor));
      }

      centers = getPositions();
      onScroll();
    }, 150);
  }

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
})();
  // ==========================================
  // SECOND SECTION: GSAP ScrollTrigger Shapes
  // ==========================================
  // (function () {
  //   const container = document.getElementById('targetSection');
  //   const canvas = document.getElementById('webgl-canvas');
  //   if (!container || !canvas || typeof THREE === 'undefined' || typeof gsap === 'undefined') return;

  //   gsap.registerPlugin(ScrollTrigger);

  //   let width = container.clientWidth;
  //   let height = container.clientHeight;

  //   const scene = new THREE.Scene();
  //   const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  //   camera.position.z = 7.5;

  //   const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  //   renderer.setSize(width, height);
  //   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  //   const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  //   scene.add(ambientLight);

  //   const pointLight = new THREE.PointLight(0x57ffe0, 3, 30);
  //   pointLight.position.set(5, 5, 5);
  //   scene.add(pointLight);

  //   function createShapeMaterial(colorHex = 0x57ffe0) {
  //     return new THREE.MeshStandardMaterial({
  //       color: colorHex,
  //       wireframe: true,
  //       transparent: true,
  //       opacity: 1,
  //       roughness: 0.2,
  //       metalness: 0.8
  //     });
  //   }

  //   const meshTL = new THREE.Mesh(new THREE.TorusKnotGeometry(0.5, 0.16, 64, 16), createShapeMaterial(0x57ffe0));
  //   const meshTR = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), createShapeMaterial(0x3a86ff));
  //   const meshBL = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 1), createShapeMaterial(0x3a86ff));
  //   const meshBR = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 16), createShapeMaterial(0x57ffe0));

  //   scene.add(meshTL, meshTR, meshBL, meshBR);
  //   const meshes = [meshTL, meshTR, meshBL, meshBR];

  //   const startX = 4.0;
  //   const startY = 2.2; 

  //   const centerPositions = [
  //     { x: -2.8, y: 1.0, z: 0.5 },  // Top-Left
  //     { x: 2.8,  y: 1.0, z: 0.5 },  // Top-Right
  //     { x: -2.8, y: -1.0, z: 0.5 }, // Bottom-Left
  //     { x: 2.8,  y: -1.0, z: 0.5 }  // Bottom-Right
  //   ];

  //   meshTL.position.set(-startX, startY, 0);
  //   meshTR.position.set(startX, startY, 0);
  //   meshBL.position.set(-startX, -startY, 0);
  //   meshBR.position.set(startX, -startY, 0);

  //   // ScrollTrigger fix: pinSpacing ko false kar diya gaya hai
  //   const tl = gsap.timeline({
  //     scrollTrigger: {
  //       trigger: "#targetSection",
  //       start: "top top",
  //       end: "+=100%", 
  //       scrub: 1,
  //       pin: true,
  //       pinSpacing: false, // Extra bottom gap hatane ke liye
  //       anticipatePin: 1,
  //       invalidateOnRefresh: true
  //     }
  //   });

  //   meshes.forEach((mesh, index) => {
  //     tl.to(mesh.position, {
  //       x: centerPositions[index].x,
  //       y: centerPositions[index].y,
  //       z: centerPositions[index].z,
  //       duration: 1.5,
  //       ease: "power2.out"
  //     }, 0);
  //   });

  //   tl.to(meshTL.position, { x: centerPositions[3].x, y: centerPositions[3].y, duration: 2, ease: "power3.inOut" }, ">");
  //   tl.to(meshTR.position, { x: centerPositions[2].x, y: centerPositions[2].y, duration: 2, ease: "power3.inOut" }, "<");
  //   tl.to(meshBL.position, { x: centerPositions[1].x, y: centerPositions[1].y, duration: 2, ease: "power3.inOut" }, "<");
  //   tl.to(meshBR.position, { x: centerPositions[0].x, y: centerPositions[0].y, duration: 2, ease: "power3.inOut" }, "<");

  //   tl.to(meshes.map(m => m.rotation), {
  //     x: "+=" + (Math.PI * 2),
  //     y: "+=" + (Math.PI * 2),
  //     duration: 2,
  //     ease: "power3.inOut"
  //   }, "<");

  //   function animate() {
  //     requestAnimationFrame(animate);
  //     meshes.forEach((mesh, i) => {
  //       mesh.rotation.x += 0.005 * (i + 1);
  //       mesh.rotation.y += 0.005 * (i + 1);
  //     });
  //     renderer.render(scene, camera);
  //   }
  //   animate();

  //   window.addEventListener('resize', () => {
  //     width = container.clientWidth;
  //     height = container.clientHeight;
  //     camera.aspect = width / height;
  //     camera.updateProjectionMatrix();
  //     renderer.setSize(width, height);
  //     ScrollTrigger.refresh();
  //   });
  // })();
  // (function () {
  //   const container = document.getElementById('targetSection');
  //   const canvas = document.getElementById('webgl-canvas');
  //   if (!container || !canvas || typeof THREE === 'undefined' || typeof gsap === 'undefined') return;

  //   gsap.registerPlugin(ScrollTrigger);

  //   let width = container.clientWidth;
  //   let height = container.clientHeight;

  //   const scene = new THREE.Scene();
  //   const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  //   camera.position.z = 7.5;

  //   const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  //   renderer.setSize(width, height);
  //   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  //   const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  //   scene.add(ambientLight);

  //   const pointLight = new THREE.PointLight(0x57ffe0, 3, 30);
  //   pointLight.position.set(5, 5, 5);
  //   scene.add(pointLight);

  //   function createShapeMaterial(colorHex = 0x57ffe0) {
  //     return new THREE.MeshStandardMaterial({
  //       color: colorHex,
  //       wireframe: true,
  //       transparent: true,
  //       opacity: 1,
  //       roughness: 0.2,
  //       metalness: 0.8
  //     });
  //   }

  //   // Scale geometry size down a bit on small screens so shapes don't dominate
  //   function getScaleFactor() {
  //     if (width <= 480) return 0.55;
  //     if (width <= 768) return 0.7;
  //     if (width <= 1024) return 0.85;
  //     return 1;
  //   }

  //   let scaleFactor = getScaleFactor();

  //   const meshTL = new THREE.Mesh(new THREE.TorusKnotGeometry(0.5, 0.16, 64, 16), createShapeMaterial(0x57ffe0));
  //   const meshTR = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), createShapeMaterial(0x3a86ff));
  //   const meshBL = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 1), createShapeMaterial(0x3a86ff));
  //   const meshBR = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 16), createShapeMaterial(0x57ffe0));

  //   scene.add(meshTL, meshTR, meshBL, meshBR);
  //   const meshes = [meshTL, meshTR, meshBL, meshBR];
  //   meshes.forEach(m => m.scale.setScalar(scaleFactor));

  //   // Compute responsive positions based on current viewport
  //   function getPositions() {
  //     const aspect = width / height;
  //     // keep shapes proportional to container width instead of fixed world units
  //     const startX = aspect < 1 ? 1.6 : 4.0;   // portrait vs landscape
  //     const startY = aspect < 1 ? 3.0 : 2.2;
  //     const centerX = aspect < 1 ? 1.1 : 2.8;
  //     const centerY = aspect < 1 ? 1.8 : 1.0;

  //     return {
  //       start: { x: startX, y: startY },
  //       centers: [
  //         { x: -centerX, y: centerY, z: 0.5 },
  //         { x: centerX, y: centerY, z: 0.5 },
  //         { x: -centerX, y: -centerY, z: 0.5 },
  //         { x: centerX, y: -centerY, z: 0.5 }
  //       ]
  //     };
  //   }

  //   let positions = getPositions();

  //   function setInitialPositions() {
  //     meshTL.position.set(-positions.start.x, positions.start.y, 0);
  //     meshTR.position.set(positions.start.x, positions.start.y, 0);
  //     meshBL.position.set(-positions.start.x, -positions.start.y, 0);
  //     meshBR.position.set(positions.start.x, -positions.start.y, 0);
  //   }

  //   setInitialPositions();

  //   let tl; // holds current timeline so we can rebuild it on resize

  //   function buildTimeline() {
  //     if (tl) {
  //       tl.scrollTrigger && tl.scrollTrigger.kill();
  //       tl.kill();
  //     }

  //     const centerPositions = positions.centers;

  //     tl = gsap.timeline({
  //       scrollTrigger: {
  //         trigger: "#targetSection",
  //         start: "top top",
  //         end: "+=100%",
  //         scrub: 1,
  //         pin: true,
  //         pinSpacing: false,
  //         anticipatePin: 1,
  //         invalidateOnRefresh: true
  //       }
  //     });

  //     meshes.forEach((mesh, index) => {
  //       tl.to(mesh.position, {
  //         x: centerPositions[index].x,
  //         y: centerPositions[index].y,
  //         z: centerPositions[index].z,
  //         duration: 1.5,
  //         ease: "power2.out"
  //       }, 0);
  //     });

  //     tl.to(meshTL.position, { x: centerPositions[3].x, y: centerPositions[3].y, duration: 2, ease: "power3.inOut" }, ">");
  //     tl.to(meshTR.position, { x: centerPositions[2].x, y: centerPositions[2].y, duration: 2, ease: "power3.inOut" }, "<");
  //     tl.to(meshBL.position, { x: centerPositions[1].x, y: centerPositions[1].y, duration: 2, ease: "power3.inOut" }, "<");
  //     tl.to(meshBR.position, { x: centerPositions[0].x, y: centerPositions[0].y, duration: 2, ease: "power3.inOut" }, "<");

  //     tl.to(meshes.map(m => m.rotation), {
  //       x: "+=" + (Math.PI * 2),
  //       y: "+=" + (Math.PI * 2),
  //       duration: 2,
  //       ease: "power3.inOut"
  //     }, "<");
  //   }

  //   buildTimeline();

  //   function animate() {
  //     requestAnimationFrame(animate);
  //     meshes.forEach((mesh, i) => {
  //       mesh.rotation.x += 0.005 * (i + 1);
  //       mesh.rotation.y += 0.005 * (i + 1);
  //     });
  //     renderer.render(scene, camera);
  //   }
  //   animate();

  //   // Debounced resize/orientation handler that rebuilds geometry positions,
  //   // not just the camera/renderer.
  //   let resizeTimeout;
  //   function handleResize() {
  //     clearTimeout(resizeTimeout);
  //     resizeTimeout = setTimeout(() => {
  //       width = container.clientWidth;
  //       height = container.clientHeight;

  //       camera.aspect = width / height;
  //       camera.updateProjectionMatrix();
  //       renderer.setSize(width, height);

  //       const newScale = getScaleFactor();
  //       if (newScale !== scaleFactor) {
  //         scaleFactor = newScale;
  //         meshes.forEach(m => m.scale.setScalar(scaleFactor));
  //       }

  //       positions = getPositions();
  //       buildTimeline();
  //       ScrollTrigger.refresh();
  //     }, 150);
  //   }

  //   window.addEventListener('resize', handleResize);
  //   window.addEventListener('orientationchange', handleResize);
  // })();
   (function () {
      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;

      var wrap = document.getElementById('card-wrap');
      if (!wrap) return;

      var W = wrap.clientWidth;
      var H = wrap.clientHeight;

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
      camera.position.set(0, 0, 7.5);

      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      wrap.appendChild(renderer.domElement);

      var ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      var pointLight = new THREE.PointLight(0xffffff, 2.0, 30);
      pointLight.position.set(5, 5, 5);
      scene.add(pointLight);

      function createSphereCircle(radius, segments, colorHex) {
        var group = new THREE.Group();

        var innerGeo = new THREE.SphereGeometry(radius, segments, segments);
        var innerMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          wireframe: true,
          transparent: true,
          opacity: 0,
          roughness: 0.2,
          metalness: 0.8
        });
        var innerMesh = new THREE.Mesh(innerGeo, innerMat);
        group.add(innerMesh);

        var outerGeo = new THREE.SphereGeometry(radius + 0.5, 16, 16);
        var outerMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          wireframe: true,
          transparent: true,
          opacity: 0
        });
        var outerMesh = new THREE.Mesh(outerGeo, outerMat);
        group.add(outerMesh);

        group.userData = { inner: innerMesh, outer: outerMesh };
        group.scale.set(0.1, 0.1, 0.1);
        return group;
      }

      var circle1 = createSphereCircle(1.8, 12, 0x57ffe0);
      var circle2 = createSphereCircle(1.6, 20, 0xa855f7);
      var circle3 = createSphereCircle(1.5, 32, 0x34d399);

      var circles = [circle1, circle2, circle3];
      circles.forEach(function (c) { scene.add(c); });

      circle1.userData.inner.material.opacity = 1;
      circle1.userData.outer.material.opacity = 0.25;
      circle1.scale.set(1, 1, 1);

      var scrollSection = document.getElementById('scroll-section');
      var textSteps = document.querySelectorAll('.text-step');
      var currentStep = 0;

      function updateScroll() {
        if (!scrollSection) return;
        var rect = scrollSection.getBoundingClientRect();
        var totalHeight = rect.height - window.innerHeight;

        if (totalHeight <= 0) return;

        var progress = Math.min(Math.max(-rect.top / totalHeight, 0), 1);

        var stepIndex = 0;
        if (progress < 0.33) {
          stepIndex = 0;
        } else if (progress >= 0.33 && progress < 0.66) {
          stepIndex = 1;
        } else {
          stepIndex = 2;
        }

        if (stepIndex !== currentStep) {
          currentStep = stepIndex;

          textSteps.forEach(function (step, idx) {
            if (idx === currentStep) {
              step.classList.add('active');
            } else {
              step.classList.remove('active');
            }
          });
        }
      }

      window.addEventListener('scroll', updateScroll, { passive: true });
      window.addEventListener('touchmove', updateScroll, { passive: true });
      updateScroll();

      var clock = new THREE.Clock();

      function animate() {
        requestAnimationFrame(animate);
        var t = clock.getElapsedTime();

        circles.forEach(function (group, idx) {
          var inner = group.userData.inner;
          var outer = group.userData.outer;

          inner.rotation.y = t * 0.4;
          inner.rotation.x = t * 0.2;

          outer.rotation.y = -t * 0.15;
          outer.rotation.z = t * 0.1;

          var targetInnerOpacity = idx === currentStep ? 1 : 0;
          var targetOuterOpacity = idx === currentStep ? 0.3 : 0;
          var targetScale = idx === currentStep ? 1 : 0.2;

          inner.material.opacity += (targetInnerOpacity - inner.material.opacity) * 0.08;
          outer.material.opacity += (targetOuterOpacity - outer.material.opacity) * 0.08;

          var currentScale = group.scale.x;
          var newScale = currentScale + (targetScale - currentScale) * 0.08;
          group.scale.set(newScale, newScale, newScale);
        });

        renderer.render(scene, camera);
      }
      animate();

      function handleResize() {
        W = wrap.clientWidth;
        H = wrap.clientHeight;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
        updateScroll();
      }

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
    })();
  // Four Section
  // (function () {
  //   const canvas = document.getElementById('bg-canvas');
  //   const viewContainers = document.querySelectorAll('.view-container');
  
  //   const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  //   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  //   renderer.setSize(window.innerWidth, window.innerHeight);
  
  //   let mouseX = 0, mouseY = 0;
  //   window.addEventListener('mousemove', (e) => {
  //     mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  //     mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  //   });
  
  //   function createSceneForType(type) {
  //     const scene = new THREE.Scene();
  //     const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  //     camera.position.z = 6;
  
  //     let mesh;
  
  //     switch (type) {
  //       case 'sphere': {
  //         const geo = new THREE.IcosahedronGeometry(1.8, 4);
  //         const mat = new THREE.PointsMaterial({ color: 0x38bff8, size: 0.035 });
  //         mesh = new THREE.Points(geo, mat);
  //         break;
  //       }
  //       case 'torus': {
  //         const geo = new THREE.TorusKnotGeometry(1.2, 0.35, 100, 16);
  //         const mat = new THREE.MeshBasicMaterial({ color: 0x818cf8, wireframe: true });
  //         mesh = new THREE.Mesh(geo, mat);
  //         break;
  //       }
  //       case 'cubes': {
  //         const group = new THREE.Group();
  //         const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  //         const mat = new THREE.MeshNormalMaterial({ wireframe: true });
  //         for (let x = -1.5; x <= 1.5; x += 0.75) {
  //           for (let y = -1.5; y <= 1.5; y += 0.75) {
  //             const cube = new THREE.Mesh(geo, mat);
  //             cube.position.set(x, y, 0);
  //             group.add(cube);
  //           }
  //         }
  //         mesh = group;
  //         break;
  //       }
  //       case 'icosahedron': {
  //         const geo = new THREE.IcosahedronGeometry(1.6, 1);
  //         const mat = new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true });
  //         mesh = new THREE.Mesh(geo, mat);
  //         break;
  //       }
  //     }
  
  //     scene.add(mesh);
  //     return { scene, camera, mesh, type };
  //   }
  
  //   const scenes = Array.from(viewContainers).map((container) => {
  //     const type = container.getAttribute('data-scene');
  //     return {
  //       element: container,
  //       ...createSceneForType(type)
  //     };
  //   });
  
  //   const clock = new THREE.Clock();
  
  //   function render() {
  //     requestAnimationFrame(render);
  //     const time = clock.getElapsedTime();
  
  //     const width = window.innerWidth;
  //     const height = window.innerHeight;
  
  //     if (canvas.width !== width || canvas.height !== height) {
  //       renderer.setSize(width, height, false);
  //     }
  
  //     renderer.setScissorTest(false);
  //     renderer.clear();
  //     renderer.setScissorTest(true);
  
  //     scenes.forEach((item) => {
  //       const rect = item.element.getBoundingClientRect();
  
  //       if (rect.bottom < 0 || rect.top > height || rect.right < 0 || rect.left > width) {
  //         return;
  //       }
  
  //       const viewWidth = rect.right - rect.left;
  //       const viewHeight = rect.bottom - rect.top;
  //       const left = rect.left;
  //       const bottom = height - rect.bottom;
  
  //       renderer.setViewport(left, bottom, viewWidth, viewHeight);
  //       renderer.setScissor(left, bottom, viewWidth, viewHeight);
  
  //       item.camera.aspect = viewWidth / viewHeight;
  //       item.camera.updateProjectionMatrix();
  
  //       if (item.type === 'sphere') {
  //         item.mesh.rotation.y = time * 0.2 + mouseX * 0.3;
  //         item.mesh.rotation.x = mouseY * 0.2;
  //       } else if (item.type === 'torus') {
  //         item.mesh.rotation.x = time * 0.4;
  //         item.mesh.rotation.y = time * 0.3;
  //       } else if (item.type === 'cubes') {
  //         item.mesh.children.forEach((child, i) => {
  //           child.rotation.x = time * 0.5;
  //           child.position.z = Math.sin(time * 2 + i) * 0.5;
  //         });
  //         item.mesh.rotation.y = time * 0.2;
  //       } else if (item.type === 'icosahedron') {
  //         item.mesh.rotation.y = -time * 0.3;
  //         const scale = 1 + Math.sin(time * 1.5) * 0.15;
  //         item.mesh.scale.set(scale, scale, scale);
  //       }
  
  //       renderer.render(item.scene, item.camera);
  //     });
  //   }
  
  //   render();
  // })();
  (function () {
    const container = document.querySelector('.four_section');
    const canvas = document.getElementById('bg-canvas');
    const viewContainers = document.querySelectorAll('.view-container');

    if (!container || !canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    function updateCanvasSize() {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
    }
    updateCanvasSize();

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    function createSceneForType(type) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 6;

      // Standard Lighting for realistic depth and colors
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      const dirLight = new THREE.DirectionalLight(0x57ffe0, 2);
      dirLight.position.set(5, 5, 5);
      scene.add(ambientLight, dirLight);

      let mesh;

      switch (type) {
        case 'sphere': {
          // 01. Dynamic Web Architecture - Cyan Color (#57FFE0)
          const geo = new THREE.IcosahedronGeometry(1.8, 4);
          const mat = new THREE.PointsMaterial({ 
            color: 0x57ffe0, 
            size: 0.035,
            transparent: true,
            opacity: 0.85 
          });
          mesh = new THREE.Points(geo, mat);
          break;
        }
        case 'torus': {
          // 02. Interactive 3D Interfaces - Neon Purple (#818CF8)
          const geo = new THREE.TorusKnotGeometry(1.2, 0.35, 100, 16);
          const mat = new THREE.MeshStandardMaterial({ 
            color: 0x818cf8, 
            emissive: 0x312e81,
            wireframe: true,
            roughness: 0.3,
            metalness: 0.8
          });
          mesh = new THREE.Mesh(geo, mat);
          break;
        }
        case 'cubes': {
          // 03. Scalable IT Infrastructure - Vibrant Blue (#3B82F6)
          const group = new THREE.Group();
          const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
          const mat = new THREE.MeshStandardMaterial({ 
            color: 0x3b82f6, 
            wireframe: true,
            roughness: 0.2,
            metalness: 0.9
          });
          for (let x = -1.5; x <= 1.5; x += 0.75) {
            for (let y = -1.5; y <= 1.5; y += 0.75) {
              const cube = new THREE.Mesh(geo, mat);
              cube.position.set(x, y, 0);
              group.add(cube);
            }
          }
          mesh = group;
          break;
        }
        case 'icosahedron': {
          // 04. Performance Analytics - Emerald Teal (#34D399)
          const geo = new THREE.IcosahedronGeometry(1.6, 1);
          const mat = new THREE.MeshStandardMaterial({ 
            color: 0x34d399, 
            emissive: 0x064e3b,
            wireframe: true,
            roughness: 0.2,
            metalness: 0.8
          });
          mesh = new THREE.Mesh(geo, mat);
          break;
        }
      }

      scene.add(mesh);
      return { scene, camera, mesh, type };
    }

    const scenes = Array.from(viewContainers).map((element) => {
      const type = element.getAttribute('data-scene');
      return {
        element,
        ...createSceneForType(type)
      };
    });

    const clock = new THREE.Clock();

    function render() {
      requestAnimationFrame(render);
      const time = clock.getElapsedTime();

      const canvasRect = canvas.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Viewport Clipping check to render only when visible
      if (canvasRect.bottom < 0 || canvasRect.top > windowHeight) return;

      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setScissorTest(true);

      scenes.forEach((item) => {
        const rect = item.element.getBoundingClientRect();

        // Skip elements that are offscreen
        if (rect.bottom < 0 || rect.top > windowHeight || rect.right < 0 || rect.left > window.innerWidth) {
          return;
        }

        const viewWidth = rect.width;
        const viewHeight = rect.height;
        const left = rect.left - canvasRect.left;
        const bottom = canvasRect.bottom - rect.bottom;

        renderer.setViewport(left, bottom, viewWidth, viewHeight);
        renderer.setScissor(left, bottom, viewWidth, viewHeight);

        item.camera.aspect = viewWidth / viewHeight;
        item.camera.updateProjectionMatrix();

        if (item.type === 'sphere') {
          item.mesh.rotation.y = time * 0.2 + mouseX * 0.3;
          item.mesh.rotation.x = mouseY * 0.2;
        } else if (item.type === 'torus') {
          item.mesh.rotation.x = time * 0.4;
          item.mesh.rotation.y = time * 0.3;
        } else if (item.type === 'cubes') {
          item.mesh.children.forEach((child, i) => {
            child.rotation.x = time * 0.5;
            child.position.z = Math.sin(time * 2 + i) * 0.5;
          });
          item.mesh.rotation.y = time * 0.2;
        } else if (item.type === 'icosahedron') {
          item.mesh.rotation.y = -time * 0.3;
          const scale = 1 + Math.sin(time * 1.5) * 0.15;
          item.mesh.scale.set(scale, scale, scale);
        }

        renderer.render(item.scene, item.camera);
      });
    }

    render();

    window.addEventListener('resize', () => {
      updateCanvasSize();
    });
  })();
  //  Testimonal Section Start 


  
    const testimonials = [
        {
          img: 'https://cruip-tutorials.vercel.app/fancy-testimonials-slider/testimonial-01.jpg',
          quote: "The ability to capture responses is a game-changer. If a user gets tired of the sign up and leaves, that data is still persisted. Additionally, it's great to select between formats.",
          name: 'Jessie J',
          role: 'Acme LTD'
        },
        {
          img: 'https://cruip-tutorials.vercel.app/fancy-testimonials-slider/testimonial-02.jpg',
          quote: "Having the power to capture user feedback is revolutionary. Even if a participant abandons the sign-up process midway, their valuable input remains intact.",
          name: 'Nick V',
          role: 'Malika Inc.'
        },
        {
          img: 'https://cruip-tutorials.vercel.app/fancy-testimonials-slider/testimonial-03.jpg',
          quote: "The functionality to capture responses is a true game-changer. Even if a user becomes fatigued during sign-up and abandons the process, their information remains stored.",
          name: 'Amelia W',
          role: 'Panda AI'
        }
      ];
  
      let currentIndex = 0;
      let isAnimating = false;
      let autorotateInterval = null;
      const autorotateTiming = 7000;
  
      const avatarContainer = document.getElementById("avatar-container");
      const quoteEl = document.getElementById("quote");
      const tabsContainer = document.getElementById("tabs-container");
      let avatarElements = [];
  
      // Render Avatars into stacked container
      function renderAvatars() {
        avatarContainer.innerHTML = "";
        avatarElements = testimonials.map((item, index) => {
          const img = document.createElement("img");
          img.src = item.img;
          img.alt = item.name;
          img.className = "avatar-img";
        
          // Initial state setups
          if (index === currentIndex) {
            gsap.set(img, { opacity: 1, rotation: 0, scale: 1, zIndex: 10, transformOrigin: "50% 160px" });
          } else {
            gsap.set(img, { opacity: 0, rotation: -60, scale: 0.8, zIndex: 1, transformOrigin: "50% 160px" });
          }
        
          avatarContainer.appendChild(img);
          return img;
        });
      }
  
      // Render Tab Buttons
      function renderTabs() {
        tabsContainer.innerHTML = "";
        testimonials.forEach((item, index) => {
          const btn = document.createElement("button");
          const isActive = index === currentIndex;
        
          btn.className = `tab-btn ${isActive ? 'active' : ''}`;
        
          btn.innerHTML = `
            <span>${item.name}</span>
            <span class="tab-divider">-</span>
            <span>${item.role}</span>
          `;
  
          btn.addEventListener("click", () => {
            stopAutorotate();
            switchTestimonial(index);
          });
  
          tabsContainer.appendChild(btn);
        });
      }
  
      // Clockwise Orbit Animation Logic
      function switchTestimonial(newIndex) {
        if (newIndex === currentIndex || isAnimating) return;
        isAnimating = true;
  
        const oldIndex = currentIndex;
        currentIndex = newIndex;
  
        const oldAvatar = avatarElements[oldIndex];
        const newAvatar = avatarElements[newIndex];
  
        const direction = newIndex > oldIndex ? 1 : -1;
  
        // Update Buttons State
        renderTabs();
  
        const tl = gsap.timeline({
          onComplete: () => {
            isAnimating = false;
          }
        });
  
        // 1. Old Avatar Rotates Clockwise Outward along Circle Edge
        tl.to(oldAvatar, {
          rotation: 60 * direction,
          opacity: 0,
          scale: 0.85,
          zIndex: 1,
          duration: 0.6,
          ease: "power2.inOut"
        }, 0);
  
        // 2. New Avatar Starts from Orbit Edge & Rotates Inward
        gsap.set(newAvatar, {
          rotation: -60 * direction,
          opacity: 0,
          scale: 0.85,
          zIndex: 10,
          transformOrigin: "50% 160px"
        });
  
        tl.to(newAvatar, {
          rotation: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "power2.inOut"
        }, 0);
  
        // 3. Quote Text Transition (Fade + Small Slide)
        tl.to(quoteEl, {
          y: -10 * direction,
          opacity: 0,
          duration: 0.25,
          ease: "power1.in",
          onComplete: () => {
            quoteEl.textContent = testimonials[currentIndex].quote;
          }
        }, 0);
  
        tl.to(quoteEl, {
          y: 0,
          opacity: 1,
          duration: 0.35,
          ease: "power1.out"
        }, 0.25);
      }
  
      function startAutorotate() {
        autorotateInterval = setInterval(() => {
          const nextIndex = (currentIndex + 1) % testimonials.length;
          switchTestimonial(nextIndex);
        }, autorotateTiming);
      }
  
      function stopAutorotate() {
        if (autorotateInterval) {
          clearInterval(autorotateInterval);
          autorotateInterval = null;
        }
      }
  
      function init() {
        quoteEl.textContent = testimonials[0].quote;
        renderAvatars();
        renderTabs();
        startAutorotate();
      }
  
      init();
      // Slider Section Start
  const reviewsData = [
  {
    para: "I was impressed by the food — every dish is bursting with flavor! And I could really tell that they use high-quality ingredients. The staff was friendly and attentive.",
    name: "Tamar Mendelson",
    designation: "Restaurant Critic",
    src: "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?q=80&w=1368&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
      para: "This place exceeded all expectations! The atmosphere is inviting, and the staff truly goes above and beyond to ensure a fantastic visit. I'll keep returning for more dining experience.",
    name: "Joe Charlescraft",
    designation: "Frequent Visitor",
    src: "https://images.unsplash.com/photo-1628749528992-f5702133b686?q=80&w=1368&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
      para: "Shining Yam is a hidden gem! From the moment I walked in, I knew I was in for a treat. The impeccable service and overall attention to detail created a memorable experience.",
    name: "Martina Edelweist",
    designation: "Satisfied Customer",
    src: "https://images.unsplash.com/photo-1524267213992-b76e8577d046?q=80&w=1368&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

let activeIndex = 0;
const imageContainer = document.getElementById('image-container');
const nameElement = document.getElementById('name');
const designationElement = document.getElementById('designation');
const paraElement = document.getElementById('para');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');

function calculateGap(width) {
  const minWidth = 1024;
  const maxWidth = 1456;
  const minGap = 60;
  const maxGap = 86;

  if (width <= minWidth) return minGap;
  if (width >= maxWidth) return Math.max(minGap, maxGap + 0.06018 * (width - maxWidth));

  return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
}

function updateReview(direction) {
  activeIndex = (activeIndex + direction + reviewsData.length) % reviewsData.length;

  const containerWidth = imageContainer.offsetWidth;
  const gap = calculateGap(containerWidth);
  const maxStickUp = gap * 0.8;

  // Image transitions
  reviewsData.forEach((review, index) => {
    let img = imageContainer.querySelector(`[data-index="${index}"]`);
    if (!img) {
      img = document.createElement('img');
      img.src = review.src;
      img.alt = review.name;
      img.classList.add('review-image');
      img.dataset.index = index;
      imageContainer.appendChild(img);
    }

    const offset = (index - activeIndex + reviewsData.length) % reviewsData.length;
    const zIndex = reviewsData.length - Math.abs(offset);
    const opacity = 1;
    const scale = index === activeIndex ? 1 : 0.85;

    let translateX, translateY, rotateY;
    if (offset === 0) {
      translateX = '0%';
      translateY = '0%';
      rotateY = 0;
    } else if (offset === 1 || offset === -2) {
      translateX = '20%';
      translateY = `-${(maxStickUp / (img.offsetHeight || 384)) * 100}%`;
      rotateY = -15;
    } else {
      translateX = '-20%';
      translateY = `-${(maxStickUp / (img.offsetHeight || 384)) * 100}%`;
      rotateY = 15;
    }

    gsap.to(img, {
      zIndex: zIndex,
      opacity: opacity,
      scale: scale,
      x: translateX,
      y: translateY,
      rotateY: rotateY,
      duration: 0.8,
      ease: "power3.out"
    });
  });

  // Update Name & Designation
  gsap.to([nameElement, designationElement], {
    opacity: 0,
    y: -10,
    duration: 0.25,
    ease: "power2.in",
    onComplete: () => {
      nameElement.textContent = reviewsData[activeIndex].name;
      designationElement.textContent = reviewsData[activeIndex].designation;
      gsap.to([nameElement, designationElement], {
        opacity: 1,
        y: 0,
        color: '#ffffff',
        duration: 0.3,
        ease: "power2.out"
      });
    }
  });

  // Update Quote inside Right Box
  gsap.to(paraElement, {
    opacity: 0,
    y: -10,
    duration: 0.25,
    ease: "power2.in",
    onComplete: () => {
      // Inline-block and pre-wrap space formatting so words layout properly
      paraElement.innerHTML = reviewsData[activeIndex].para
        .split(' ')
        .map(word => `<span class="word" style="display: inline-block; white-space: pre;">${word} </span>`)
        .join('');

      gsap.set(paraElement, { opacity: 1, y: 0, color: '#ffffff' });

      // Directly targeting freshly inserted elements via quoteElement.querySelectorAll('.word')
      const wordElements = paraElement.querySelectorAll('.word');

      gsap.fromTo(wordElements, 
        { 
          opacity: 0, 
          y: 8, 
          color: '#ffffff' 
        },
        {
          opacity: 1,
          y: 0,
          color: '#ffffff',
          stagger: 0.015,
          duration: 0.25,
          ease: "power2.out"
        }
      );
    }
  });
}

function handleNext() { updateReview(1); }
function handlePrev() { updateReview(-1); }

prevButton.addEventListener('click', handlePrev);
nextButton.addEventListener('click', handleNext);

// Initial load
updateReview(0);