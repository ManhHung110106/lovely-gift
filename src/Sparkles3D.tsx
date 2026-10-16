import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const palette = [
  "#ff1e6d",
  "#ff75a0",
  "#ff9a8b",
  "#ffd166",
  "#ffe082",
  "#c77dff",
  "#b388ff",
  "#ffffff",
  "#ffb3c6",
].map((c) => new THREE.Color(c));

function attributes(count: number, size: number, customPalette = palette) {
  const color = new Float32Array(count * 3),
    sizes = new Float32Array(count),
    opacity = new Float32Array(count).fill(1);
  for (let i = 0; i < count; i++) {
    customPalette[i % customPalette.length].toArray(color, i * 3);
    sizes[i] = size * (0.6 + Math.random() * 0.8);
  }
  return { color, sizes, opacity };
}

function Glow({ strength = 1 }: { strength?: number }) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ time: { value: 0 }, strength: { value: strength } }),
    [strength],
  );
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.time.value = clock.elapsedTime;
  });
  return (
    <shaderMaterial
      ref={ref}
      uniforms={uniforms}
      transparent
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      vertexShader={`uniform float time; attribute vec3 aColor; attribute float aSize; attribute float aOpacity;
        varying vec3 vColor; varying float vAlpha;
        void main(){
          vec4 p=modelViewMatrix*vec4(position,1.);
          gl_Position=projectionMatrix*p;
          float twinkle=.58+.42*sin(time*3.6+position.x*13.+position.y*17.+position.z*11.);
          gl_PointSize=clamp(aSize*560./max(1.,-p.z)*(1.+.28*twinkle),1.,64.);
          vColor=aColor;
          vAlpha=aOpacity*twinkle;
        }`}
      fragmentShader={`uniform float strength; varying vec3 vColor; varying float vAlpha;
        void main(){
          vec2 p=gl_PointCoord-.5;
          float r=length(p);
          if(r>.5)discard;
          float halo=exp(-r*r*16.)*.36;
          float core=exp(-r*r*170.);
          float cross=exp(-abs(p.x)*85.)*exp(-abs(p.y)*10.)+exp(-abs(p.y)*85.)*exp(-abs(p.x)*10.);
          float diag=exp(-abs(p.x+p.y)*85.)*exp(-abs(p.x-p.y)*12.)+exp(-abs(p.x-p.y)*85.)*exp(-abs(p.x+p.y)*12.);
          float flare=halo+core*.95+(cross+diag*.55)*.3;
          gl_FragColor=vec4(mix(vColor,vec3(1.),core*.85)*strength,flare*vAlpha);
        }`}
    />
  );
}

function Buffers({ data }: { data: ReturnType<typeof attributes> }) {
  return (
    <>
      <bufferAttribute attach="attributes-aColor" args={[data.color, 3]} />
      <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
      <bufferAttribute attach="attributes-aOpacity" args={[data.opacity, 1]} />
    </>
  );
}

export function HeartDust() {
  const ref = useRef<THREE.Group>(null);
  const data = useMemo(() => {
    // Tăng mật độ hạt lên 32,000 hạt dày đặc, lấp đầy toàn bộ khối trái tim 3D
    const count = 32000,
      position = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let t: number;
      do {
        t = Math.random() * Math.PI * 2;
      } while (Math.random() > 0.08 + 0.92 * Math.abs(Math.sin(t)));
      // r phân bố thể tích từ tâm ra vỏ: 65% hạt lấp đầy khối trong, 35% ở vỏ ngoài
      const isInner = Math.random() < 0.65;
      const r = isInner ? Math.pow(Math.random(), 0.55) : 0.85 + Math.random() * 0.15;
      const lower = Math.max(0, -Math.cos(t));
      const x =
        (16 * Math.pow(Math.sin(t), 3) +
          10 * Math.sin(t) * Math.pow(lower, 3)) *
        0.132 *
        r;
      const y =
        ((13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)) *
          0.132 +
          0.26 * Math.pow(lower, 4)) *
        r;
      const groove =
        1 - 0.38 * Math.exp((-x * x) / 0.22) * Math.max(0, Math.min(1, y / 1.1));
      const depth =
        1.35 *
        Math.sqrt(Math.max(0.01, 1 - r * r * 0.85)) *
        groove *
        (Math.random() < 0.5 ? -1 : 1) *
        (isInner ? Math.random() : 1);
      position.set([x, y + 1.15, depth], i * 3);
    }
    return { position, ...attributes(count, 0.095) };
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.elapsedTime;
      // Nhịp đập trái tim đôi (heartbeat pulse) chân thực
      const beat =
        Math.pow(Math.sin(t * 2.4), 18) * 0.045 +
        Math.pow(Math.sin(t * 2.4 + 0.32), 18) * 0.025;
      ref.current.rotation.y = Math.sin(t * 0.22) * 0.24;
      ref.current.rotation.x = Math.sin(t * 0.16) * 0.09;
      ref.current.scale.setScalar(1 + beat);
    }
  });

  return (
    <group ref={ref}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[data.position, 3]}
          />
          <Buffers data={data} />
        </bufferGeometry>
        <Glow strength={1.9} />
      </points>
    </group>
  );
}

export function Fireworks() {
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    // 16 tâm nổ pháo hoa, mỗi tâm 480 hạt = 7,680 hạt rực rỡ
    const count = 7680,
      position = new Float32Array(count * 3),
      directions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2,
        z = Math.random() * 2 - 1,
        r = Math.sqrt(1 - z * z);
      const speed = 0.5 + Math.random() * 0.8;
      directions.set([Math.cos(a) * r * speed, Math.sin(a) * r * speed, z * speed], i * 3);
    }
    return { position, directions, ...attributes(count, 0.088) };
  }, []);

  const centers = [
    [-6, 4.2, -4],
    [6, 5.0, -5],
    [-4, 7.2, -7],
    [4, 2.5, -5],
    [-7, 1.0, -4],
    [7, -0.5, -6],
    [0, 7.5, -8],
    [0, -2.0, -5],
    [-3, 5.5, -9],
    [3, 6.2, -8],
    [-8, 3.5, -6],
    [8, 3.8, -6],
    [0, 8.5, -7],
    [-5, -1.2, -6],
    [5, -1.5, -5],
    [0, 4.0, -4],
  ];

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < 7680; i++) {
      const g = Math.floor(i / 480);
      // Tốc độ nổ chậm hơn ~0.8x (chu kỳ 6.0s thay vì 4.8s)
      const age = ((t + g * 0.525) % 6.0) / 6.0;
      const spread = Math.pow(age, 0.52) * 3.2;
      const c = centers[g];
      const i3 = i * 3;
      data.position[i3] = c[0] + data.directions[i3] * spread;
      data.position[i3 + 1] =
        c[1] + data.directions[i3 + 1] * spread - age * age * 1.5;
      data.position[i3 + 2] = c[2] + data.directions[i3 + 2] * spread;
      // Nhấp nháy lấp lánh (sparkling glitter) khi tàn pháo rơi
      const shimmer = 0.8 + 0.2 * Math.sin(t * 15.0 + i);
      data.opacity[i] =
        Math.sin(Math.min(age * 5.6, 1) * Math.PI * 0.5) *
        Math.pow(1 - age, 1.4) *
        shimmer;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.geometry.attributes.aOpacity.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.position, 3]}
        />
        <Buffers data={data} />
      </bufferGeometry>
      <Glow strength={2.4} />
    </points>
  );
}

export function Starfield() {
  const data = useMemo(
    () => ({
      position: Float32Array.from(
        { length: 7200 },
        () => (Math.random() - 0.5) * 44,
      ),
      ...attributes(2400, 0.075),
    }),
    [],
  );
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.position, 3]}
        />
        <Buffers data={data} />
      </bufferGeometry>
      <Glow strength={1.4} />
    </points>
  );
}

export function Meteors() {
  const ref = useRef<THREE.Points>(null);
  // 16 dải sao băng vút qua liên tục
  const data = useMemo(
    () => ({
      position: new Float32Array(16 * 70 * 3),
      ...attributes(16 * 70, 0.12),
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const total = 16 * 70;
    for (let i = 0; i < total; i++) {
      const group = Math.floor(i / 70);
      const tail = (i % 70) / 70;
      // Tốc độ sao băng chậm hơn ~0.8x (chu kỳ 6.5s, vận tốc di chuyển *0.8)
      const age = ((t + group * 0.81) % 6.5) / 6.5;
      const progress = age * 2.8;
      // Điểm xuất phát và hướng bay đa dạng theo góc nghiêng duyên dáng
      const startX = 14 - (group % 4) * 3;
      const startY = 10 - Math.floor(group / 4) * 2;
      const speedX = 20.8;
      const speedY = 10.4 + (group % 3) * 1.6;
      const i3 = i * 3;
      data.position[i3] = startX - progress * speedX + tail * 2.8;
      data.position[i3 + 1] = startY - progress * speedY + tail * 1.4;
      data.position[i3 + 2] = -7 - (group % 5) * 1.6;
      data.opacity[i] =
        (progress < 1.75 ? 1 : 0) * Math.pow(1 - tail, 1.8);
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.geometry.attributes.aOpacity.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.position, 3]}
        />
        <Buffers data={data} />
      </bufferGeometry>
      <Glow strength={2.8} />
    </points>
  );
}

// Cánh hoa hồng & hoa anh đào 3D bay bồng bềnh phủ khắp không gian
const petalPalette = [
  "#ff4d6d",
  "#ff758f",
  "#ff8fa3",
  "#c9184a",
  "#ffb3c1",
  "#ffd6e0",
  "#ffcad4",
].map((c) => new THREE.Color(c));

export function FallingPetals3D() {
  const ref = useRef<THREE.Points>(null);
  const count = 1800;
  const data = useMemo(() => {
    const position = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      position[i * 3] = (Math.random() - 0.5) * 20;
      position[i * 3 + 1] = (Math.random() - 0.5) * 16;
      position[i * 3 + 2] = (Math.random() - 0.5) * 16;
      speeds[i] = 0.4 + Math.random() * 0.8;
      offsets[i] = Math.random() * Math.PI * 2;
    }
    return {
      position,
      speeds,
      offsets,
      ...attributes(count, 0.11, petalPalette),
    };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const speed = data.speeds[i];
      const offset = data.offsets[i];
      // Rơi xuống xoắn ốc nhẹ nhàng
      data.position[i3 + 1] -= speed * 0.035;
      data.position[i3] += Math.sin(t * 0.9 + offset) * 0.02;
      data.position[i3 + 2] += Math.cos(t * 0.7 + offset) * 0.02;

      // Khi rơi xuống đáy thì quay lại đỉnh
      if (data.position[i3 + 1] < -8) {
        data.position[i3 + 1] = 9;
        data.position[i3] = (Math.random() - 0.5) * 20;
        data.position[i3 + 2] = (Math.random() - 0.5) * 16;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.position, 3]}
        />
        <Buffers data={data} />
      </bufferGeometry>
      <Glow strength={1.6} />
    </points>
  );
}

