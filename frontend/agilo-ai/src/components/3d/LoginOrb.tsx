import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 3D Noise function for organic fluid glass morphing
function simplexNoise3D(x: number, y: number, z: number, t: number): number {
  return (
    Math.sin(x * 1.5 + t * 0.4) * Math.cos(y * 1.8 + t * 0.5) +
    Math.sin(y * 1.4 + t * 0.3) * Math.cos(z * 1.6 + t * 0.6) +
    Math.sin(z * 1.3 + t * 0.5) * Math.cos(x * 1.7 + t * 0.4)
  ) * 0.25;
}

// Morphing Translucent Glass Core (Non-spherical organic fluid structure)
const FluidGlassCore: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const geometryRef = useRef<THREE.IcosahedronGeometry>(null!);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null!);

  const basePositions = useMemo(() => {
    const geom = new THREE.IcosahedronGeometry(1.6, 32);
    return geom.attributes.position.clone();
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (geometryRef.current && meshRef.current) {
      const pos = geometryRef.current.attributes.position;
      const basePos = basePositions.array as Float32Array;
      const arr = pos.array as Float32Array;

      // Deform core vertices into an organic fluid structure
      for (let i = 0; i < arr.length / 3; i++) {
        const bx = basePos[i * 3];
        const by = basePos[i * 3 + 1];
        const bz = basePos[i * 3 + 2];

        const noise = simplexNoise3D(bx, by, bz, t);
        const scale = 1.0 + noise;

        arr[i * 3] = bx * scale;
        arr[i * 3 + 1] = by * scale;
        arr[i * 3 + 2] = bz * scale;
      }
      pos.needsUpdate = true;
      geometryRef.current.computeVertexNormals();

      // Slow elegant rotation
      meshRef.current.rotation.y = t * 0.08;
      meshRef.current.rotation.x = Math.sin(t * 0.05) * 0.1;
      meshRef.current.position.y = Math.sin(t * 0.6) * 0.12;
    }

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0.15 + Math.sin(t * 0.8) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry ref={geometryRef} args={[1.6, 32]} />
      <meshPhysicalMaterial
        ref={materialRef}
        color="#FFFFFF"
        emissive="#1769E0"
        emissiveIntensity={0.15}
        roughness={0.08}
        metalness={0.05}
        transmission={0.92}
        thickness={1.8}
        clearcoat={1.0}
        clearcoatRoughness={0.05}
        ior={1.45}
        transparent={true}
        opacity={0.9}
      />
    </mesh>
  );
};

// Neural Network Curves around the glass core
const NeuralCurves: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const count = 14;

  const curves = useMemo(() => {
    const list: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < count; i++) {
      const pts: THREE.Vector3[] = [];
      const numPts = 6;
      const radius = 2.0 + Math.random() * 0.8;
      const angleOffset = (i / count) * Math.PI * 2;

      for (let j = 0; j < numPts; j++) {
        const theta = angleOffset + (j / numPts) * Math.PI * 1.5;
        const phi = (Math.random() - 0.5) * Math.PI * 0.8;
        const r = radius + Math.sin(j * 1.2) * 0.4;
        pts.push(
          new THREE.Vector3(
            r * Math.cos(theta) * Math.cos(phi),
            r * Math.sin(phi),
            r * Math.sin(theta) * Math.cos(phi)
          )
        );
      }
      list.push(new THREE.CatmullRomCurve3(pts, true));
    }
    return list;
  }, [count]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.04;
      groupRef.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 0.03) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {curves.map((curve, idx) => {
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <primitive
            key={idx}
            object={
              new THREE.Line(
                geometry,
                new THREE.LineBasicMaterial({
                  color: idx % 2 === 0 ? '#22B8F0' : '#1769E0',
                  transparent: true,
                  opacity: idx % 3 === 0 ? 0.45 : 0.25,
                  linewidth: 1,
                })
              )
            }
          />
        );
      })}
    </group>
  );
};

// Particles Traveling Along Pathways & Floating
const NeuralParticles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 220;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 1.8 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#22B8F0"
        transparent={true}
        opacity={0.7}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export const LoginOrbCanvas: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[420px] relative">
      <Canvas
        camera={{ position: [0, 0, 5.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} color="#FFFFFF" />
        <directionalLight position={[-4, -3, -2]} intensity={1.5} color="#22B8F0" />
        <pointLight position={[0, 0, 3]} intensity={2.2} color="#22B8F0" />
        <pointLight position={[2, 2, 2]} intensity={1.8} color="#1769E0" />
        
        <FluidGlassCore />
        <NeuralCurves />
        <NeuralParticles />
      </Canvas>
    </div>
  );
};
