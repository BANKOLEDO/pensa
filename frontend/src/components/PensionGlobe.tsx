import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Pin {
  lat: number;
  lon: number;
  title: string;
  sub: string;
  alt?: boolean;
}

const PINS: Pin[] = [
  { lat: 40.71, lon: -74.01, title: "$30.00 · saved", sub: "New York" },
  { lat: 51.51, lon: -0.13, title: "+4.4% APR", sub: "London" },
  { lat: 35.68, lon: 139.69, title: "$18.00 · saved", sub: "Tokyo" },
  { lat: -33.87, lon: 151.21, title: "+5.2% APR", sub: "Sydney" },
  { lat: 28.61, lon: 77.21, title: "$9.00 · saved", sub: "New Delhi" },
  { lat: 19.43, lon: -99.13, title: "$3.00 · saved", sub: "Mexico City" },
  { lat: -1.29, lon: 36.82, title: "$1,240 · saved", sub: "Nairobi", alt: true },
  { lat: -23.55, lon: -46.63, title: "+4.7% APR", sub: "São Paulo" },
];

const ARC_PAIRS: [number, number][] = [
  [0, 6],
  [1, 6],
  [2, 6],
  [3, 6],
  [4, 6],
  [5, 6],
  [7, 6],
  [0, 2],
];

const R = 1.7;
const ACCENT = "#f5a400";
const TEAL = "#06b6d4";
const DIM = "#d8c98f";

function wc(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function buildGraticule(): THREE.BufferGeometry {
  const pts: number[] = [];
  for (let lat = -90; lat <= 90; lat += 9) {
    for (let lon = 0; lon < 360; lon += 9) {
      const v = wc(lat, lon, R + 0.004);
      pts.push(v.x, v.y, v.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function buildNodes(): THREE.BufferGeometry {
  const pts: number[] = [];
  for (const p of PINS) {
    const v = wc(p.lat, p.lon, R + 0.03);
    pts.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

interface Arc {
  mesh: THREE.Mesh;
  total: number;
  phase: number;
}

function buildArcs(): { arcs: Arc[]; dispose: () => void } {
  const arcs: Arc[] = [];
  const disposables: { dispose: () => void }[] = [];
  ARC_PAIRS.forEach(([a, b], i) => {
    const p0 = wc(PINS[a].lat, PINS[a].lon, R);
    const p1 = wc(PINS[b].lat, PINS[b].lon, R);
    const mid = p0
      .clone()
      .add(p1)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(R * 1.7);
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
    const geo = new THREE.TubeGeometry(curve, 56, 0.0038, 6, false);
    const mat = new THREE.MeshBasicMaterial({
      color: i % 2 ? TEAL : ACCENT,
      transparent: true,
      opacity: 0.55,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    arcs.push({ mesh, total: geo.index ? geo.index.count : geo.attributes.position.count, phase: i * 0.37 });
    disposables.push(geo, mat);
  });
  return { arcs, dispose: () => disposables.forEach((d) => d.dispose()) };
}

export default function PensionGlobe() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, R * 3.05);

    const group = new THREE.Group();
    group.rotation.x = 0.12;
    scene.add(group);

    const graticule = new THREE.Points(
      buildGraticule(),
      new THREE.PointsMaterial({ color: DIM, size: 0.014, transparent: true, opacity: 0.55, sizeAttenuation: true })
    );
    const nodes = new THREE.Points(
      buildNodes(),
      new THREE.PointsMaterial({ color: ACCENT, size: 0.035, transparent: true, opacity: 0.95, sizeAttenuation: true })
    );
    group.add(graticule, nodes);

    const { arcs, dispose: disposeArcs } = buildArcs();
    for (const a of arcs) group.add(a.mesh);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    wrap.appendChild(renderer.domElement);
    renderer.domElement.className = "globe-canvas";

    const pins = Array.from(wrap.querySelectorAll<HTMLElement>("[data-pin]"));

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(rect.width, rect.height, false);
    };
    resize();

    const clock = new THREE.Clock();
    let raf = 0;
    let paused = false;

    const frame = () => {
      const t = clock.getElapsedTime();
      group.rotation.y = t * 0.14;

      for (const a of arcs) {
        const progress = (t * 0.5 + a.phase) % 1;
        if (progress === 0) a.mesh.visible = false;
        a.mesh.visible = true;
        const count = Math.floor(progress * a.total);
        (a.mesh.geometry as THREE.BufferGeometry).setDrawRange(0, count);
      }

      group.updateMatrixWorld(true);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      for (let i = 0; i < pins.length; i++) {
        const p = PINS[i];
        const el = pins[i];
        const wp = wc(p.lat, p.lon, R + 0.05).clone().applyMatrix4(group.matrixWorld);
        const front = wp.z > 0;
        if (!front || w === 0 || h === 0) {
          el.style.display = "none";
          continue;
        }
        const sp = wp.clone().project(camera);
        const cx = Math.min(Math.max((sp.x * 0.5 + 0.5) * w, 46), w - 46);
        const cy = Math.min(Math.max((-sp.y * 0.5 + 0.5) * h, 30), h - 30);
        el.style.display = "flex";
        el.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      }

      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!paused) frame();
      raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      group.rotation.y = 0.6;
      for (const a of arcs) {
        a.mesh.visible = true;
        (a.mesh.geometry as THREE.BufferGeometry).setDrawRange(0, Math.floor(0.5 * a.total));
      }
      frame();
    } else {
      raf = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const io = new IntersectionObserver(
      (entries) => {
        paused = !entries[0].isIntersecting;
      },
      { threshold: 0.05 }
    );
    io.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      disposeArcs();
      graticule.geometry.dispose();
      (graticule.material as THREE.Material).dispose();
      nodes.geometry.dispose();
      (nodes.material as THREE.Material).dispose();
      group.clear();
      renderer.dispose();
      if (renderer.domElement.parentElement === wrap) wrap.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={wrapRef} className="globe-wrap">
      {PINS.map((p, i) => (
        <div key={i} data-pin={i} className="globe-pin" style={{ display: "none" }}>
          <span className={`globe-pin-dot ${p.alt ? "alt" : ""}`} />
          <span className="globe-pin-card">
            <b>{p.title}</b>
            <br />
            <span>{p.sub}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
