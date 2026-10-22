import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, Rotate3d, Eye, ShieldCheck, MapPin, Radio, Compass, Zap } from 'lucide-react';

const CIVIC_NODES = [
  { lat: 18.5204, lng: 73.8567, label: 'Central Ward #12', category: 'Road Damage', status: 'In Progress', color: 0x0d9488, id: 'CS-2026-DEMO01' },
  { lat: 18.5912, lng: 73.7621, label: 'Hinjewadi Link #42', category: 'Pothole Triage', status: 'AI Analyzed', color: 0x14b8a6, id: 'CS-2026-DEMO02' },
  { lat: 18.5524, lng: 73.8015, label: 'Model Colony Ward #14', category: 'Open Manhole', status: 'Priority Critical', color: 0xef4444, id: 'CS-2026-DEMO03' },
  { lat: 18.5074, lng: 73.8112, label: 'Kothrud Sector #4', category: 'Water Main', status: 'Citizen Verified', color: 0x10b981, id: 'CS-2026-DEMO04' },
  { lat: 18.6275, lng: 73.8131, label: 'Pimpri Municipal #8', category: 'Sanitation Waste', status: 'Resolved', color: 0x38bdf8, id: 'CS-2026-DEMO05' },
  { lat: 18.4851, lng: 73.8612, label: 'Bibwewadi Junction', category: 'Streetlight', status: 'Dispatched', color: 0xf59e0b, id: 'CS-2026-DEMO06' },
];

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export default function CivicGlobe3D() {
  const containerRef = useRef(null);
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(true);
  const isRotatingRef = useRef(true);
  isRotatingRef.current = isRotating;

  const targetRotationRef = useRef({ x: 0.25, y: 0.4 });

  const activeNode = CIVIC_NODES[activeNodeIndex];

  const selectNode = (idx) => {
    setActiveNodeIndex(idx);
    const node = CIVIC_NODES[idx];
    // Rotate globe towards the selected node coordinates
    const spreadLng = (node.lng - 73.8) * 45 + idx * 55;
    targetRotationRef.current.y = -spreadLng * (Math.PI / 180);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 480;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 210;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // Main 3D Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 2. Base Sphere Mesh (Glassmorphic Holographic Core)
    const sphereRadius = 65;
    const coreGeo = new THREE.SphereGeometry(sphereRadius, 40, 40);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x06182a,
      emissive: 0x042f2e,
      emissiveIntensity: 0.45,
      specular: 0x14b8a6,
      shininess: 45,
      transparent: true,
      opacity: 0.88,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreMesh);

    // 3. Digital Twin Icosahedron Wireframe Grid
    const wireGeo = new THREE.IcosahedronGeometry(sphereRadius + 1.2, 3);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x0d9488,
      wireframe: true,
      transparent: true,
      opacity: 0.32,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wireMesh);

    // 3b. Outer Atmospheric Glow Aura
    const auraGeo = new THREE.SphereGeometry(sphereRadius + 5, 32, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    globeGroup.add(auraMesh);

    // 4. Ethereal Particle Swarm (Starfield / Civic Signal Field)
    const particleCount = 750;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = sphereRadius + 6 + Math.random() * 30;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      particlePos[i * 3] = x;
      particlePos[i * 3 + 1] = y;
      particlePos[i * 3 + 2] = z;

      particleColors[i * 3] = 0.05 + Math.random() * 0.1;
      particleColors[i * 3 + 1] = 0.65 + Math.random() * 0.35;
      particleColors[i * 3 + 2] = 0.75 + Math.random() * 0.25;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleField = new THREE.Points(particleGeo, particleMat);
    globeGroup.add(particleField);

    // 5. Orbital Halo Rings (Gyroscope)
    const ringGeo = new THREE.RingGeometry(sphereRadius + 14, sphereRadius + 15.6, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.38,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI * 0.42;
    ringMesh.rotation.y = Math.PI * 0.12;
    globeGroup.add(ringMesh);

    const ring2Geo = new THREE.RingGeometry(sphereRadius + 22, sphereRadius + 23, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
    });
    const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2Mesh.rotation.x = -Math.PI * 0.35;
    ring2Mesh.rotation.z = Math.PI * 0.25;
    globeGroup.add(ring2Mesh);

    // 6. Interactive 3D Civic Grievance Nodes & Arcs
    const nodeMeshes = [];
    const nodeVectors = [];
    const pulseMeshes = [];

    CIVIC_NODES.forEach((node, idx) => {
      const spreadLat = (node.lat - 18.5) * 45;
      const spreadLng = (node.lng - 73.8) * 45 + idx * 55;
      const v = latLngToVector3(spreadLat, spreadLng, sphereRadius + 1.5);
      nodeVectors.push(v);

      // Node Anchor Sphere
      const pinGeo = new THREE.SphereGeometry(2.6, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.95,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(v);
      pinMesh.userData = { nodeIndex: idx, nodeData: node };
      globeGroup.add(pinMesh);
      nodeMeshes.push(pinMesh);

      // Pulse beacon ring around node
      const pulseGeo = new THREE.RingGeometry(2.8, 4.4, 16);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: node.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      pulseMesh.position.copy(v);
      pulseMesh.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(pulseMesh);
      pulseMeshes.push(pulseMesh);
    });

    // Connecting 3D Arcs (Beziers) between civic nodes + Photon Packets
    const arcCurves = [];
    const photonPackets = [];

    for (let i = 0; i < nodeVectors.length - 1; i++) {
      const v1 = nodeVectors[i];
      const v2 = nodeVectors[i + 1];
      const mid = v1.clone().add(v2).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(sphereRadius + 24);

      const curve = new THREE.QuadraticBezierCurve3(v1, mid, v2);
      arcCurves.push(curve);

      const points = curve.getPoints(32);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(points);
      const arcMat = new THREE.LineBasicMaterial({
        color: 0x14b8a6,
        transparent: true,
        opacity: 0.45,
      });
      const arcLine = new THREE.Line(arcGeo, arcMat);
      globeGroup.add(arcLine);

      // Photon packet (travels along the arc)
      const photonGeo = new THREE.SphereGeometry(1.2, 8, 8);
      const photonMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.9,
      });
      const photon = new THREE.Mesh(photonGeo, photonMat);
      globeGroup.add(photon);
      photonPackets.push({ mesh: photon, curve, progress: Math.random() });
    }

    // 7. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x2dd4bf, 2.4);
    dirLight1.position.set(100, 100, 100);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight2.position.set(-100, -80, -50);
    scene.add(dirLight2);

    // 8. Interaction: Raycasting & Mouse Rotation
    let mouseX = 0;
    let mouseY = 0;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseX = x;
      mouseY = y;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        targetRotationRef.current.y += deltaX * 0.007;
        targetRotationRef.current.x += deltaY * 0.007;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };

      // Raycast to check if user clicked on a node directly in 3D
      const rect = container.getBoundingClientRect();
      mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseVector, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);
      if (intersects.length > 0) {
        const hitIdx = intersects[0].object.userData.nodeIndex;
        if (hitIdx !== undefined) {
          selectNode(hitIdx);
        }
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousemove', handleMouseMove);
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - previousMousePosition.x;
        const deltaY = touch.clientY - previousMousePosition.y;
        targetRotationRef.current.y += deltaX * 0.008;
        targetRotationRef.current.x += deltaY * 0.008;
        previousMousePosition = { x: touch.clientX, y: touch.clientY };
      }
    };
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    dom.addEventListener('touchmove', handleTouchMove, { passive: true });
    dom.addEventListener('touchstart', handleTouchStart, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 9. Animation Loop
    let animationFrameId;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = (performance.now() - startTime) * 0.001;

      if (isRotatingRef.current && !isDragging) {
        targetRotationRef.current.y += 0.0035;
      }

      // Smooth inertia damping
      globeGroup.rotation.y += (targetRotationRef.current.y - globeGroup.rotation.y) * 0.06;
      globeGroup.rotation.x += (targetRotationRef.current.x - globeGroup.rotation.x) * 0.06;

      // Subtle parallax response to mouse position
      globeGroup.position.x = mouseX * 6;
      globeGroup.position.y = mouseY * 6;

      // Particle subtle oscillation
      particleField.rotation.y -= 0.001;
      ringMesh.rotation.z += 0.002;
      ring2Mesh.rotation.z -= 0.0015;

      // Pulse beacon rings
      pulseMeshes.forEach((pulse, i) => {
        const s = 1 + Math.sin(time * 4 + i) * 0.35;
        pulse.scale.set(s, s, s);
      });

      // Animate photon packets along the 3D arcs
      photonPackets.forEach((packet) => {
        packet.progress += 0.008;
        if (packet.progress > 1) packet.progress = 0;
        const pt = packet.curve.getPoint(packet.progress);
        packet.mesh.position.copy(pt);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('mousemove', handleMouseMove);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('touchmove', handleTouchMove);
      dom.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      auraGeo.dispose();
      auraMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
    };
  }, []);

  return (
    <div className="civic-3d-wrapper">
      {/* Real-time WebGL 3D Canvas Container */}
      <div ref={containerRef} className="civic-3d-canvas" style={{ width: '100%', height: '100%' }} />

      {/* Floating 3D HUD Holographic Node Badge */}
      {activeNode && (
        <div className="civic-3d-hud">
          <div className="row between" style={{ marginBottom: 4 }}>
            <span className="ai-badge" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
              <Sparkles size={11} /> 3D Digital Twin
            </span>
            <span className="small muted mono" style={{ fontSize: '0.72rem' }}>
              {activeNode.status}
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>
            {activeNode.label}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 4, fontSize: '0.78rem', color: '#94a3b8' }}>
            <span>
              <MapPin size={12} style={{ verticalAlign: -1, color: 'var(--teal-400)' }} /> {activeNode.category}
            </span>
            <span>·</span>
            <span style={{ color: '#2dd4bf' }}>GPS Latched</span>
          </div>
        </div>
      )}

      {/* 3D Node Quick-Select Carousel Bar */}
      <div className="civic-3d-node-bar">
        {CIVIC_NODES.map((node, i) => (
          <button
            key={node.label}
            type="button"
            className={`civic-3d-node-pill ${i === activeNodeIndex ? 'active' : ''}`}
            onClick={() => selectNode(i)}
            title={`Focus on ${node.label}`}
          >
            <span className="node-pill-dot" style={{ background: i === activeNodeIndex ? '#2dd4bf' : '#64748b' }} />
            <span className="node-pill-text">{node.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Interactive Controls Overlay */}
      <div className="civic-3d-controls">
        <button
          type="button"
          className="btn-3d-toggle"
          onClick={() => setIsRotating((r) => !r)}
          title={isRotating ? 'Pause auto-rotation' : 'Resume auto-rotation'}
        >
          <Rotate3d size={14} /> {isRotating ? 'Orbiting' : 'Paused'}
        </button>
        <span className="hint-3d">Click nodes or drag 3D</span>
      </div>
    </div>
  );
}
