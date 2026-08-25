import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface KnowledgeConstellationProps {
  isChatActive: boolean;
  aiState: 'idle' | 'thinking' | 'searching' | 'generating';
}

const ConstellationNodesAndLines: React.FC<{ aiState: string }> = ({ aiState }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const pointsRef = useRef<THREE.Points>(null!);
  const linesRef = useRef<THREE.LineSegments>(null!);

  const nodeCount = 180;
  const maxDistance = 1.8;

  // Generate organic node clusters around right/hero region
  const [positions, initialPos] = useMemo(() => {
    const pos = new Float32Array(nodeCount * 3);
    const init = new Float32Array(nodeCount * 3);

    // Create 4 main cluster centers
    const clusters = [
      { x: 1.2, y: 0.4, z: 0 },
      { x: 2.2, y: -0.6, z: -0.5 },
      { x: 0.4, y: 1.2, z: -0.8 },
      { x: -0.8, y: -0.4, z: -1.2 },
    ];

    for (let i = 0; i < nodeCount; i++) {
      const cluster = clusters[i % clusters.length];
      const offsetX = (Math.random() - 0.5) * 2.8;
      const offsetY = (Math.random() - 0.5) * 2.5;
      const offsetZ = (Math.random() - 0.5) * 2.0;

      const px = cluster.x + offsetX;
      const py = cluster.y + offsetY;
      const pz = cluster.z + offsetZ;

      pos[i * 3] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = pz;

      init[i * 3] = px;
      init[i * 3 + 1] = py;
      init[i * 3 + 2] = pz;
    }
    return [pos, init];
  }, [nodeCount]);

  // Line connections geometry pre-allocation
  const maxLines = (nodeCount * (nodeCount - 1)) / 2;
  const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);
  const lineGeometry = useMemo(() => new THREE.BufferGeometry(), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const isRagActive = aiState === 'thinking' || aiState === 'searching';
    const speedMult = isRagActive ? 1.8 : 0.8;

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.06;
      groupRef.current.rotation.x = Math.cos(t * 0.08) * 0.04;
    }

    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position;
      const pArray = posAttr.array as Float32Array;

      // Animate node positions subtly with wave turbulence
      for (let i = 0; i < nodeCount; i++) {
        const ix = initialPos[i * 3];
        const iy = initialPos[i * 3 + 1];
        const iz = initialPos[i * 3 + 2];

        // RAG state pulse effect
        const pulseEffect = isRagActive ? Math.sin(t * 4.0 + i) * 0.08 : 0;

        pArray[i * 3] = ix + Math.sin(t * 0.5 * speedMult + i) * 0.08 + pulseEffect;
        pArray[i * 3 + 1] = iy + Math.cos(t * 0.6 * speedMult + i * 0.8) * 0.08;
        pArray[i * 3 + 2] = iz + Math.sin(t * 0.4 * speedMult + i * 0.5) * 0.06;
      }
      posAttr.needsUpdate = true;

      // Dynamic line connections between nearby nodes
      let lineVertexIdx = 0;
      for (let i = 0; i < nodeCount; i++) {
        const x1 = pArray[i * 3];
        const y1 = pArray[i * 3 + 1];
        const z1 = pArray[i * 3 + 2];

        for (let j = i + 1; j < nodeCount; j++) {
          const x2 = pArray[j * 3];
          const y2 = pArray[j * 3 + 1];
          const z2 = pArray[j * 3 + 2];

          const dx = x1 - x2;
          const dy = y1 - y2;
          const dz = z1 - z2;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < maxDistance * maxDistance) {
            linePositions[lineVertexIdx * 3] = x1;
            linePositions[lineVertexIdx * 3 + 1] = y1;
            linePositions[lineVertexIdx * 3 + 2] = z1;

            linePositions[(lineVertexIdx + 1) * 3] = x2;
            linePositions[(lineVertexIdx + 1) * 3 + 1] = y2;
            linePositions[(lineVertexIdx + 1) * 3 + 2] = z2;

            lineVertexIdx += 2;
          }
        }
      }

      lineGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(linePositions.subarray(0, lineVertexIdx * 3), 3)
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Node Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={aiState === 'searching' ? 0.08 : 0.06}
          color={aiState === 'searching' ? '#22B8F0' : '#1769E0'}
          transparent={true}
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Connection Lines */}
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color={aiState === 'searching' ? '#22B8F0' : '#1769E0'}
          transparent={true}
          opacity={aiState === 'searching' ? 0.45 : 0.25}
          linewidth={1}
        />
      </lineSegments>
    </group>
  );
};

export const AiEntity3DCanvas: React.FC<KnowledgeConstellationProps> = ({ isChatActive, aiState }) => {
  return (
    <div
      className={`w-full h-full absolute inset-0 pointer-events-none transition-all duration-1000 ease-in-out ${
        isChatActive ? 'opacity-20 scale-90 translate-x-1/4 -translate-y-10 blur-[2px]' : 'opacity-100 scale-100'
      }`}
    >
      <Canvas camera={{ position: [0, 0, 5.2], fov: 48 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[4, 6, 4]} intensity={2.2} color="#FFFFFF" />
        <directionalLight position={[-4, -3, -2]} intensity={1.5} color="#22B8F0" />
        <pointLight position={[1, 1, 3]} intensity={2.5} color="#22B8F0" />
        <pointLight position={[-2, -1, 2]} intensity={1.8} color="#1769E0" />
        
        <ConstellationNodesAndLines aiState={aiState} />
      </Canvas>
    </div>
  );
};
