import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Billboard } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { GiftEvent, Recipient } from "./types";
import { wishesFor } from "./model";
import { HeartDust, Fireworks, Starfield, Meteors, FallingPetals3D } from "./Sparkles3D";
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
function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const narrow = size.width / size.height < 0.8;
    camera.position.set(0, 0.5, narrow ? 17 : 10);
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
      <color attach="background" args={["#12091e"]} />
      <fog attach="fog" args={["#12091e", 18, 38]} />
      <ambientLight intensity={1.9} />
      <pointLight position={[0, 4, 3]} intensity={25} color="#ff85a1" distance={22} />
      <pointLight position={[-6, -1, -3]} intensity={18} color="#ffd166" distance={22} />
      <pointLight position={[6, 2, -4]} intensity={18} color="#c77dff" distance={22} />
      <CameraFit />
      <HeartDust />
      <Fireworks />
      <Starfield />
      <Meteors />
      <FallingPetals3D />
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
        maxPolarAngle={Math.PI / 2 + 0.4}
        minPolarAngle={Math.PI / 2 - 0.4}
        target={[0, 0.5, 0]}
      />
    </Canvas>
  );
}
