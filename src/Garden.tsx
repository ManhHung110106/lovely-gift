import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Billboard } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { GiftEvent, Recipient } from "./types";
import { wishesFor } from "./model";
function HeartDust() {
  const ref = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(4200 * 3);
    for (let i = 0; i < 4200; i++) {
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      a[i * 3] = 16 * Math.pow(Math.sin(t), 3) * r * 0.13;
      a[i * 3 + 1] =
        (13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)) *
          r *
          0.13 +
        1.1;
      a[i * 3 + 2] = (Math.random() - 0.5) * 0.65;
    }
    return a;
  }, []);
  const outline = useMemo(() => {
    const points = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      const t = (i / 180) * Math.PI * 2;
      points.set(
        [
          16 * Math.pow(Math.sin(t), 3) * 0.13,
          (13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t)) *
            0.13 +
            1.1,
          0.05,
        ],
        i * 3,
      );
    }
    return points;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.25;
      ref.current.scale.setScalar(
        1 + Math.sin(clock.elapsedTime * 1.5) * 0.035,
      );
    }
  });
  return (
    <group ref={ref}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.024}
          color="#f2a1bd"
          toneMapped={false}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineLoop>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[outline, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#d985ab" transparent opacity={0.27} />
      </lineLoop>
    </group>
  );
}
function Fireworks() {
  const ref = useRef<THREE.Points>(null);
  const particles = useMemo(() => {
    const p = new Float32Array(900 * 3);
    const dirs = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const theta = Math.random() * Math.PI * 2;
      const z = Math.random() * 2 - 1;
      const rad = Math.sqrt(1 - z * z);
      dirs.set([Math.cos(theta) * rad, Math.sin(theta) * rad, z], i * 3);
    }
    return { p, dirs };
  }, []);
  useFrame(({ clock }) => {
    const age = (clock.elapsedTime % 6) / 6;
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < 900; i++) {
      const group = i % 3;
      arr[i * 3] = [-4, 4, 0][group] + particles.dirs[i * 3] * age * 2;
      arr[i * 3 + 1] =
        [2, 1.5, 3.5][group] + particles.dirs[i * 3 + 1] * age * 2 - age * age;
      arr[i * 3 + 2] = -2 + particles.dirs[i * 3 + 2] * age * 2;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    (ref.current.material as THREE.PointsMaterial).opacity = (1 - age) * 0.75;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles.p, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.027}
        color="#efd29a"
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
function Photo({
  src,
  index,
  total,
}: {
  src: string;
  index: number;
  total: number;
}) {
  const mesh = useRef<THREE.Group>(null);
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(src, (texture) => {
      const image = texture.image as HTMLImageElement;
      const sourceRatio = image.width / image.height;
      const frameRatio = 1.32 / 1.55;
      if (sourceRatio > frameRatio) {
        texture.repeat.x = frameRatio / sourceRatio;
        texture.offset.x = (1 - texture.repeat.x) / 2;
      } else {
        texture.repeat.y = sourceRatio / frameRatio;
        texture.offset.y = (1 - texture.repeat.y) / 2;
      }
    });
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [src]);
  useEffect(() => () => texture.dispose(), [texture]);
  const angle = (index / total) * Math.PI * 2;
  useFrame(({ clock }) => {
    if (mesh.current)
      mesh.current.position.y =
        -1.3 + Math.sin(clock.elapsedTime * 0.6 + index) * 0.12;
  });
  return (
    <group
      ref={mesh}
      position={[Math.sin(angle) * 3.4, -1.3, Math.cos(angle) * 3.4]}
      rotation={[0, angle, 0]}
    >
      <mesh>
        <boxGeometry args={[1.5, 1.85, 0.04]} />
        <meshStandardMaterial color="#fff2dc" />
      </mesh>
      <mesh position={[0, 0.05, 0.03]}>
        <planeGeometry args={[1.32, 1.55]} />
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.05, -0.03]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.32, 1.55]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  );
}
function WishLabel({ message }: { message: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f7d3df";
    const words = message.split(/\s+/);
    let line = "";
    let row = 0;
    for (const word of words) {
      if (ctx.measureText(line + " " + word).width > 680) {
        ctx.fillText(line, 384, 60 + row * 45);
        row++;
        line = word;
      } else line += (line ? " " : "") + word;
    }
    ctx.fillText(line, 384, 60 + row * 45);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [message]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh>
      <planeGeometry args={[3, 0.95]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
function Starfield() {
  const pos = useMemo(
    () => Float32Array.from({ length: 1800 }, () => (Math.random() - 0.5) * 35),
    [],
  );
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.022} color="#d7bfa1" transparent opacity={0.6} />
    </points>
  );
}
function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const narrow = size.width / size.height < 0.8;
    camera.position.set(0, narrow ? 2.5 : 1.5, narrow ? 17 : 10);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = narrow ? 60 : 48;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);
  return null;
}
function FloatingWish({ message, index }: { message: string; index: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current)
      group.current.position.y =
        Math.cos(index * 1.3) * 1.7 +
        0.5 +
        Math.sin(clock.elapsedTime * 0.45 + index) * 0.2;
  });
  return (
    <group
      ref={group}
      position={[
        Math.sin(index * 2.4) * 5,
        Math.cos(index * 1.3) * 1.7 + 0.5,
        -1 - Math.cos(index) * 3,
      ]}
    >
      <Billboard>
        <WishLabel message={message} />
      </Billboard>
    </group>
  );
}
export function Garden({
  event,
  recipient,
}: {
  event: GiftEvent;
  recipient: Recipient;
}) {
  const messages = wishesFor(event, recipient.id);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    setOffset(0);
    if (messages.length <= 10) return;
    const timer = setInterval(
      () => setOffset((n) => (n + 10) % messages.length),
      14000,
    );
    return () => clearInterval(timer);
  }, [event.id, recipient.id, messages.length]);
  const visibleMessages =
    messages.length > 10
      ? [...messages.slice(offset), ...messages.slice(0, offset)].slice(0, 10)
      : messages;
  return (
    <Canvas
      camera={{ position: [0, 1.5, 10], fov: 48 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      aria-label="Không gian kỷ niệm 3D"
    >
      <color attach="background" args={["#160f23"]} />
      <fog attach="fog" args={["#160f23", 18, 35]} />
      <ambientLight intensity={1.8} />
      <pointLight position={[0, 5, 4]} intensity={15} color="#ffb5c8" />
      <CameraFit />
      <HeartDust />
      <Fireworks />
      <Starfield />
      {recipient.photos.map((p, i) => (
        <Photo
          key={`${p}-${i}`}
          src={p}
          index={i}
          total={recipient.photos.length}
        />
      ))}
      {visibleMessages.map((m, i) => (
        <FloatingWish
          key={m.id}
          index={i}
          message={m.message.slice(0, 85) + (m.message.length > 85 ? "…" : "")}
        />
      ))}
      <OrbitControls
        enableDamping
        autoRotate
        autoRotateSpeed={0.3}
        minDistance={6}
        maxDistance={23}
        maxPolarAngle={Math.PI * 0.78}
        minPolarAngle={0.35}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
