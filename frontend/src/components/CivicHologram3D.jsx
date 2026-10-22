import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Cpu, Scan, ShieldAlert, Sparkles } from 'lucide-react';

const CATEGORY_COLORS = {
  POTHOLES_ROAD_DAMAGE: 0xf59e0b,
  OPEN_MANHOLE_HAZARD: 0xef4444,
  WATER_SUPPLY_SEWAGE: 0x06b6d4,
  GARBAGE_SOLID_WASTE: 0x10b981,
  STREETLIGHTING_ELECTRICAL: 0x8b5cf6,
  SANITATION_PUBLIC_TOILETS: 0x14b8a6,
  ENCROACHMENT_OBSTRUCTION: 0xf97316,
  AIR_POLLUTION_BURNING: 0xec4899,
  OTHER: 0x2dd4bf,
};

export default function CivicHologram3D({
  category = '',
  priority = '',
  confidence = 94,
  isAnalyzing = false,
  lat = null,
  lng = null,
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 280;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 56);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Hologram Core Group
    const holoGroup = new THREE.Group();
    scene.add(holoGroup);

    // Target color based on category
    const hexColor = CATEGORY_COLORS[category] || 0x2dd4bf;

    // 3. Central Wireframe Octahedron (Holographic Beacon)
    const prismGeo = new THREE.OctahedronGeometry(12, 1);
    const prismMat = new THREE.MeshBasicMaterial({
      color: hexColor,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const prismMesh = new THREE.Mesh(prismGeo, prismMat);
    holoGroup.add(prismMesh);

    // Inner glowing sphere core
    const innerGeo = new THREE.SphereGeometry(6, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.35,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    holoGroup.add(innerMesh);

    // 4. Dual Gyroscopic Orbit Rings
    const ringGeo = new THREE.RingGeometry(18, 19, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI * 0.35;
    holoGroup.add(ring1);

    const ring2Mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring2 = new THREE.Mesh(ringGeo, ring2Mat);
    ring2.rotation.x = -Math.PI * 0.3;
    ring2.rotation.y = Math.PI * 0.4;
    holoGroup.add(ring2);

    // 5. 3D Laser Scanning Plane
    const scanPlaneGeo = new THREE.PlaneGeometry(28, 28);
    const scanPlaneMat = new THREE.MeshBasicMaterial({
      color: hexColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
    });
    const scanPlane = new THREE.Mesh(scanPlaneGeo, scanPlaneMat);
    scanPlane.rotation.x = Math.PI / 2;
    holoGroup.add(scanPlane);

    // 6. Floating Diagnostic Data Particles
    const particleCount = 60;
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const rad = 22 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * 20;
      particlePos[i * 3] = rad * Math.cos(angle);
      particlePos[i * 3 + 1] = elevation;
      particlePos[i * 3 + 2] = rad * Math.sin(angle);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: hexColor,
      size: 2,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    holoGroup.add(particlePoints);

    // 7. Interactive Dragging / Rotation
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const handleMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;
      holoGroup.rotation.y += deltaX * 0.01;
      holoGroup.rotation.x += deltaY * 0.01;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // 8. Animation Loop
    let animId;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = (performance.now() - startTime) * 0.001;
      const speedMultiplier = isAnalyzing ? 3.5 : 1;

      if (!isDragging) {
        holoGroup.rotation.y += 0.012 * speedMultiplier;
        prismMesh.rotation.x = Math.sin(time * 1.2) * 0.3;
        prismMesh.rotation.z = Math.cos(time * 1.5) * 0.2;
      }

      // Scanner laser oscillation up and down
      scanPlane.position.y = Math.sin(time * (isAnalyzing ? 6 : 2.5)) * 11;

      // Rotate orbit rings
      ring1.rotation.z += 0.015 * speedMultiplier;
      ring2.rotation.z -= 0.018 * speedMultiplier;

      // Gentle breathing scale on the core
      const pulse = 1 + Math.sin(time * 3) * 0.06;
      innerMesh.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      prismGeo.dispose();
      prismMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ring2Mat.dispose();
      scanPlaneGeo.dispose();
      scanPlaneMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [category, isAnalyzing]);

  return (
    <div className="civic-hologram-container">
      <div className="civic-hologram-hud-top">
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <Scan size={14} className={isAnalyzing ? 'spin' : ''} style={{ color: '#2dd4bf' }} />
          <span className="mono" style={{ fontSize: '0.72rem', letterSpacing: '0.08em', color: '#2dd4bf' }}>
            {isAnalyzing ? 'NEURAL SCAN ACTIVE…' : '3D SPATIAL TELEMETRY'}
          </span>
        </div>
        <span className="hologram-gps-badge">
          {lat && lng ? `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E` : 'GPS Awaiting Fix'}
        </span>
      </div>

      <div ref={mountRef} className="civic-hologram-canvas" title="Interactive 3D Hologram - Click and drag to orbit" />

      <div className="civic-hologram-hud-bottom">
        <div className="hologram-stat-col">
          <span className="hologram-label">TRIAGE CONFIDENCE</span>
          <span className="hologram-val" style={{ color: '#2dd4bf' }}>
            {confidence}% MATCH
          </span>
        </div>
        <div className="hologram-stat-col">
          <span className="hologram-label">SPATIAL RADAR</span>
          <span className="hologram-val" style={{ color: priority === 'CRITICAL' ? '#ef4444' : '#38bdf8' }}>
            {priority || 'CALIBRATING'}
          </span>
        </div>
      </div>
    </div>
  );
}
