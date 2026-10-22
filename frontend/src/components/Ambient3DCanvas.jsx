import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Ambient3DCanvas
 * Global 3D WebGL ambient background with civic hexagonal ward prisms,
 * infrastructure wireframes, and cybernetic telemetry constellations.
 */
export default function Ambient3DCanvas() {
  const containerRef = useRef(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    // Detect user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // 1. Scene, Camera, WebGLRenderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060f1e, 0.0022);

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
    camera.position.z = 180;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2. Floating Civic Geometries (Municipal GIS Hexagons & Infrastructure Nodes)
    const shapesGroup = new THREE.Group();
    scene.add(shapesGroup);

    // Cylinder with 6 segments = Hexagonal Ward Prism
    const hexPrismGeo = new THREE.CylinderGeometry(10, 10, 6, 6);
    const icosaGeo = new THREE.IcosahedronGeometry(11, 1);
    const octaGeo = new THREE.OctahedronGeometry(9, 0);
    const boxGeo = new THREE.BoxGeometry(11, 11, 11);
    const torusGeo = new THREE.TorusGeometry(11, 1.5, 8, 24);

    const shapeGeometries = [hexPrismGeo, icosaGeo, octaGeo, boxGeo, torusGeo];

    const shapeMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x0d9488, wireframe: true, transparent: true, opacity: 0.28 }),
      new THREE.MeshBasicMaterial({ color: 0x14b8a6, wireframe: true, transparent: true, opacity: 0.24 }),
      new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true, transparent: true, opacity: 0.22 }),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true, transparent: true, opacity: 0.22 }),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.20 }),
    ];

    const floatingMeshes = [];
    const countShapes = 16;

    for (let i = 0; i < countShapes; i++) {
      const geo = shapeGeometries[i % shapeGeometries.length];
      const mat = shapeMaterials[i % shapeMaterials.length];
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.x = (Math.random() - 0.5) * 420;
      mesh.position.y = (Math.random() - 0.5) * 320;
      mesh.position.z = (Math.random() - 0.5) * 200 - 40;

      mesh.rotation.x = Math.random() * Math.PI;
      mesh.rotation.y = Math.random() * Math.PI;

      mesh.userData = {
        rotSpeedX: (Math.random() - 0.5) * 0.007,
        rotSpeedY: (Math.random() - 0.5) * 0.010,
        floatSpeed: 0.001 + Math.random() * 0.002,
        initialY: mesh.position.y,
        floatRange: 14 + Math.random() * 18,
      };

      shapesGroup.add(mesh);
      floatingMeshes.push(mesh);
    }

    // 3. Cybernetic Particle Constellation (Civic Signal Field)
    const particleCount = 260;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 450;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 350;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 250 - 20;

      particleVelocities.push({
        vx: (Math.random() - 0.5) * 0.07,
        vy: (Math.random() - 0.5) * 0.07,
        vz: (Math.random() - 0.5) * 0.04,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x2dd4bf,
      size: 2.2,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 4. Parallax Mouse Tracker
    let targetCameraX = 0;
    let targetCameraY = 0;

    const onMouseMove = (e) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      targetCameraX = normX * 22;
      targetCameraY = normY * 15;
    };

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', onResize);

    // 5. Animation Loop using performance.now (avoids THREE.Clock deprecation)
    let animationFrameId;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Smooth camera interpolation towards mouse parallax
      camera.position.x += (targetCameraX - camera.position.x) * 0.04;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Rotate and float geometric polyhedra
      floatingMeshes.forEach((mesh) => {
        mesh.rotation.x += mesh.userData.rotSpeedX;
        mesh.rotation.y += mesh.userData.rotSpeedY;
        mesh.position.y = mesh.userData.initialY + Math.sin(elapsedTime * 0.8 + mesh.position.x) * mesh.userData.floatRange;
      });

      // Drift particles
      const positions = particleGeometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const vel = particleVelocities[i];
        positions[i * 3] += vel.vx;
        positions[i * 3 + 1] += vel.vy;
        positions[i * 3 + 2] += vel.vz;

        if (Math.abs(positions[i * 3]) > 250) vel.vx = -vel.vx;
        if (Math.abs(positions[i * 3 + 1]) > 200) vel.vy = -vel.vy;
        if (Math.abs(positions[i * 3 + 2]) > 150) vel.vz = -vel.vz;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Slow orbital drift
      shapesGroup.rotation.y = elapsedTime * 0.018;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      shapeGeometries.forEach((g) => g.dispose());
      shapeMaterials.forEach((m) => m.dispose());
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, [enabled]);

  return (
    <>
      <div
        ref={containerRef}
        className="ambient-3d-canvas-wrapper"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          pointerEvents: 'none',
          overflow: 'hidden',
          opacity: enabled ? 0.75 : 0,
          transition: 'opacity 0.5s ease',
        }}
      />
      {/* 3D Experience Floating Status Pill */}
      <div className="ambient-3d-toggle-badge" title="Civic 3D Spatial Engine">
        <button
          type="button"
          onClick={() => setEnabled((prev) => !prev)}
          className={`ambient-3d-pill-btn ${enabled ? 'active' : ''}`}
          aria-label="Toggle 3D spatial background effect"
        >
          <span className="ambient-3d-dot" />
          <span className="ambient-3d-text">{enabled ? '3D Spatial Active' : '3D Mode Paused'}</span>
        </button>
      </div>
    </>
  );
}
