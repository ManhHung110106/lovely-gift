import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const palette = ["#ff69ad", "#ffbada", "#ffd78b", "#c7b3ff", "#fff5df"].map(c => new THREE.Color(c));
function attributes(count: number, size: number) {
  const color = new Float32Array(count * 3), sizes = new Float32Array(count), opacity = new Float32Array(count).fill(1);
  for (let i = 0; i < count; i++) {
    palette[i % palette.length].toArray(color, i * 3);
    sizes[i] = size * (.55 + Math.random());
  }
  return { color, sizes, opacity };
}
function Glow({ strength = 1 }: { strength?: number }) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, strength: { value: strength } }), [strength]);
  useFrame(({ clock }) => { if (ref.current) ref.current.uniforms.time.value = clock.elapsedTime; });
  return <shaderMaterial ref={ref} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending}
    vertexShader={`uniform float time; attribute vec3 aColor; attribute float aSize; attribute float aOpacity;
      varying vec3 vColor; varying float vAlpha;
      void main(){ vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p;
        float twinkle=.65+.35*sin(time*2.8+position.x*12.+position.y*17.);
        gl_PointSize=clamp(aSize*520./max(1.,-p.z)*(1.+.2*twinkle),1.,48.);
        vColor=aColor; vAlpha=aOpacity*twinkle; }`}
    fragmentShader={`uniform float strength; varying vec3 vColor; varying float vAlpha;
      void main(){vec2 p=gl_PointCoord-.5; float r=length(p); if(r>.5)discard;
        float halo=exp(-r*r*22.)*.3; float core=exp(-r*r*180.);
        float rays=exp(-abs(p.x)*100.)*exp(-abs(p.y)*12.)+exp(-abs(p.y)*100.)*exp(-abs(p.x)*12.);
        gl_FragColor=vec4(mix(vColor,vec3(1.),core*.8)*strength,(halo+core*.8+rays*.15)*vAlpha); }`}/ >;
}
function Buffers({ data }: { data: ReturnType<typeof attributes> }) {
  return <><bufferAttribute attach="attributes-aColor" args={[data.color, 3]}/><bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]}/><bufferAttribute attach="attributes-aOpacity" args={[data.opacity, 1]}/></>;
}

export function HeartDust() {
  const ref = useRef<THREE.Group>(null);
  const data = useMemo(() => {
    const count = 14000, position = new Float32Array(count * 3);
    for (let i=0;i<count;i++) {
      // Inflate a two-lobed heart outline into two rounded front/back surfaces.
      // The upper valley stays between the lobes instead of becoming a circular crater.
      let t: number;
      do { t = Math.random()*Math.PI*2; } while (Math.random() > .08+.92*Math.abs(Math.sin(t)));
      const r = Math.sqrt(Math.random());
      const lower = Math.max(0, -Math.cos(t));
      // A linear sine term gives the lower tip a smooth, full curve.
      // Its influence fades out before the upper lobes and central groove.
      const x = (16*Math.pow(Math.sin(t),3)+10*Math.sin(t)*Math.pow(lower,3))*.13*r;
      const y = ((13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*.13+.25*Math.pow(lower,4))*r;
      const groove = 1-.38*Math.exp(-x*x/.22)*Math.max(0,Math.min(1,y/1.1));
      const depth = 1.3*Math.sqrt(1-r*r)*groove*(Math.random()<.5 ? -1 : 1);
      const fill = i%5 === 0 ? Math.random() : 1;
      position.set([x,y+1.1,depth*fill],i*3);
    }
    return { position, ...attributes(count,.085) };
  }, []);
  useFrame(({clock}) => { if(ref.current) { ref.current.rotation.y=Math.sin(clock.elapsedTime*.25)*.18; ref.current.scale.setScalar(1+Math.sin(clock.elapsedTime*1.7)*.025); } });
  return <group ref={ref}><points><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.position,3]}/><Buffers data={data}/></bufferGeometry><Glow strength={1.65}/></points></group>;
}

export function Fireworks() {
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const count=2560, position=new Float32Array(count*3), directions=new Float32Array(count*3);
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,z=Math.random()*2-1,r=Math.sqrt(1-z*z);directions.set([Math.cos(a)*r,Math.sin(a)*r,z],i*3);}
    return {position,directions,...attributes(count,.075)};
  },[]);
  const centers = [[-5,3,-4],[5,4,-5],[-3,6,-7],[3,1,-5],[-6,-1,-4],[6,-1,-7],[0,6,-8],[0,-3,-6]];
  useFrame(({clock})=>{
    if(!ref.current)return;
    for(let i=0;i<2560;i++){
      const g=Math.floor(i/320), age=((clock.elapsedTime+g*.71)%5)/5, spread=Math.pow(age,.55)*2.4;
      const c=centers[g];
      data.position[i*3]=c[0]+data.directions[i*3]*spread;
      data.position[i*3+1]=c[1]+data.directions[i*3+1]*spread-age*age*1.3;
      data.position[i*3+2]=c[2]+data.directions[i*3+2]*spread;
      data.opacity[i]=Math.sin(Math.min(age*8,1)*Math.PI/2)*Math.pow(1-age,1.5);
    }
    ref.current.geometry.attributes.position.needsUpdate=true;
    ref.current.geometry.attributes.aOpacity.needsUpdate=true;
  });
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.position,3]}/><Buffers data={data}/></bufferGeometry><Glow strength={2}/></points>;
}

export function Starfield() {
  const data=useMemo(()=>({position:Float32Array.from({length:3600},()=> (Math.random()-.5)*38),...attributes(1200,.07)}),[]);
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.position,3]}/><Buffers data={data}/></bufferGeometry><Glow strength={1.2}/></points>;
}

export function Meteors() {
  const ref=useRef<THREE.Points>(null);
  const data=useMemo(()=>({position:new Float32Array(360*3),...attributes(360,.1)}),[]);
  useFrame(({clock})=>{
    if(!ref.current)return;
    for(let i=0;i<360;i++){
      const group=Math.floor(i/60), tail=(i%60)/60, age=((clock.elapsedTime+group*1.9)%13)/13;
      const progress=age*2.3;
      data.position[i*3]=12-progress*24+tail*2.4;
      data.position[i*3+1]=8-progress*11+tail*1.1-group*.8;
      data.position[i*3+2]=-9-group*1.2;
      data.opacity[i]=(progress<1.5 ? 1:0)*Math.pow(1-tail,2);
    }
    ref.current.geometry.attributes.position.needsUpdate=true;
    ref.current.geometry.attributes.aOpacity.needsUpdate=true;
  });
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.position,3]}/><Buffers data={data}/></bufferGeometry><Glow strength={2.3}/></points>;
}
