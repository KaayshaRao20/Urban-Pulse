import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './LandingPage.css';

// Pre-defined SVG icons matching the exact icons from specification
const SVG_ICONS = {
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  track: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M17 14c2.5 0 4 1.8 4 4.5" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 16V11a6 6 0 1112 0v5l2 2H4z" />
      <path d="M10 21a2 2 0 004 0" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.3 11l7.4-4M8.3 13l7.4 4" />
    </svg>
  )
};

const INITIAL_FEED = [
  { id: 1, icon: 'pin', title: 'Pothole reported', sub: 'Sample · Ward 12', status: 'Resolved', statusClass: 'st r' },
  { id: 2, icon: 'bell', title: 'Traffic congestion detected', sub: 'Sample · Ring Road', status: 'Assigned', statusClass: 'st a' },
  { id: 3, icon: 'eye', title: 'Streetlight outage', sub: 'Sample · Zone 4', status: 'Reported', statusClass: 'st' },
  { id: 4, icon: 'people', title: 'Crowd gathering alert', sub: 'Sample · Central Park', status: 'Reported', statusClass: 'st' }
];

const FEED_POOL = [
  { icon: 'pin', title: 'Pothole reported', sub: 'Sample · Ward 12' },
  { icon: 'bell', title: 'Traffic congestion detected', sub: 'Sample · Ring Road' },
  { icon: 'eye', title: 'Streetlight outage', sub: 'Sample · Zone 4' },
  { icon: 'people', title: 'Crowd gathering alert', sub: 'Sample · Central Park' },
  { icon: 'link', title: 'Water leak reported', sub: 'Sample · Sector 9' },
  { icon: 'pin', title: 'Debris on arterial road', sub: 'Sample · Ward 8' }
];

export default function LandingPage({ onNavigateToAuth }) {
  const sceneRef = useRef(null);
  const labRef0 = useRef(null);
  const labRef1 = useRef(null);
  const labRef2 = useRef(null);

  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [feedItems, setFeedItems] = useState(INITIAL_FEED);

  // Live Stats
  const [stats, setStats] = useState({
    reports: 12480,
    resolved: 9215,
    zones: 42,
    rate: 74,
    responses: 3360
  });

  // Fetch real-time public stats if backend is running
  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === 'object') {
          setStats((prev) => ({
            ...prev,
            reports: d.reports ?? prev.reports,
            resolved: d.resolved ?? prev.resolved,
            zones: d.zones ?? prev.zones,
            rate: d.rate ?? prev.rate,
            responses: d.responses ?? prev.responses
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Window Scroll & Progress Bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 10);
      const totalH = document.body.scrollHeight - window.innerHeight;
      const prog = totalH > 0 ? scrollY / totalH : 0;
      setScrollProgress(Math.min(Math.max(prog, 0), 1));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for .rv elements (reveal animations)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll('.landing-page-root .rv');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // 3D Card Hover Tilt Effect
  useEffect(() => {
    const cards = document.querySelectorAll('.landing-page-root .card');
    const handleMouseMove = (e) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
      const rotX = (0.5 - y / rect.height) * 8;
      const rotY = (x / rect.width - 0.5) * 8;
      card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px)`;
    };

    const handleMouseLeave = (e) => {
      e.currentTarget.style.transform = '';
    };

    cards.forEach((c) => {
      c.addEventListener('mousemove', handleMouseMove);
      c.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      cards.forEach((c) => {
        c.removeEventListener('mousemove', handleMouseMove);
        c.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  // Dynamic Animated Report Feed
  useEffect(() => {
    let poolIndex = 0;
    const interval = setInterval(() => {
      const itemDef = FEED_POOL[poolIndex % FEED_POOL.length];
      poolIndex++;
      const newItemId = Date.now();

      setFeedItems((prev) => [
        {
          id: newItemId,
          icon: itemDef.icon,
          title: itemDef.title,
          sub: itemDef.sub,
          status: 'Reported',
          statusClass: 'st'
        },
        ...prev.slice(0, 3)
      ]);

      // Stage 2 transition -> Assigned
      setTimeout(() => {
        setFeedItems((current) =>
          current.map((item) =>
            item.id === newItemId ? { ...item, status: 'Assigned', statusClass: 'st a' } : item
          )
        );
      }, 1800);

      // Stage 3 transition -> Resolved
      setTimeout(() => {
        setFeedItems((current) =>
          current.map((item) =>
            item.id === newItemId ? { ...item, status: 'Resolved', statusClass: 'st r' } : item
          )
        );
      }, 3800);
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  // Three.js 3D Procedural Smart City Scene
  useEffect(() => {
    const host = sceneRef.current;
    if (!host) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      host.prepend(renderer.domElement);
    } catch (err) {
      console.warn('[LandingPage] WebGL initialization fallback notice:', err);
      host.classList.add('nogl');
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf4f9fd, 48, 120);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);

    // Sky Environment Texture
    (() => {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 256;
      const g = c.getContext('2d');
      const gd = g.createLinearGradient(0, 0, 0, 256);
      gd.addColorStop(0, '#5d9bf0');
      gd.addColorStop(0.5, '#cfe4fb');
      gd.addColorStop(0.52, '#ffffff');
      gd.addColorStop(1, '#bfe5d5');
      g.fillStyle = gd;
      g.fillRect(0, 0, 16, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      const es = new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide })));
      const sn = new THREE.Mesh(new THREE.SphereGeometry(9), new THREE.MeshBasicMaterial({ color: 0xfff4d6 }));
      sn.position.set(50, 60, 35);
      es.add(sn);
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(es).texture;
      pm.dispose();
    })();

    scene.add(new THREE.HemisphereLight(0xffffff, 0xbfe5d5, 0.45));
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.15);
    sun.position.set(34, 48, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -56, right: 56, top: 56, bottom: -56, far: 150 });
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    let sd = 7;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0xdde6ef, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    function createFacadeTexture(tint) {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = tint;
      g.fillRect(0, 0, 64, 128);
      for (let y = 4; y < 128; y += 12) {
        for (let x = 4; x < 64; x += 12) {
          g.fillStyle = rnd() < 0.1 ? '#ffe9b0' : 'rgba(18,58,108,.6)';
          g.fillRect(x, y, 7, 8);
        }
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    }

    const sideMats = ['#dbe9fb', '#e6f3ee', '#cddff6'].map(
      (t) => new THREE.MeshStandardMaterial({ map: createFacadeTexture(t), roughness: 0.22, metalness: 0.4 })
    );
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf6f9fc, roughness: 0.7 });
    const plateM = new THREE.MeshStandardMaterial({ color: 0xf8fcfa, roughness: 0.9 });
    const plateG = new THREE.BoxGeometry(5, 0.14, 5);

    for (let i = -8; i <= 8; i++) {
      for (let j = -8; j <= 8; j++) {
        const x = i * 6;
        const z = j * 6;
        const d = Math.hypot(i, j);

        const p = new THREE.Mesh(plateG, plateM);
        p.position.set(x, 0.07, z);
        p.receiveShadow = true;
        scene.add(p);

        const lm = i === 0 && j === 0;
        const h = lm ? 30 : 1.8 + Math.max(0, 1 - d / 9) * rnd() * 17 + rnd() * 3;
        const w = lm ? 2.6 : 2.8 + rnd() * 1.3;
        const dp = lm ? 2.6 : 2.8 + rnd() * 1.3;
        if (!lm && rnd() < 0.14) continue; // Parks / open spaces

        const g = new THREE.BoxGeometry(w, h, dp);
        const uv = g.attributes.uv;
        for (let k = 0; k < uv.count; k++) {
          uv.setXY(k, (uv.getX(k) * w) / 3, (uv.getY(k) * h) / 3);
        }
        const mats = lm
          ? new THREE.MeshStandardMaterial({ color: 0x0fa97a, roughness: 0.15, metalness: 0.6, emissive: 0x04503a, emissiveIntensity: 0.35 })
          : [sideMats[(i + j) & 1 ? 0 : 1 + (rnd() < 0.5 ? 1 : 0)]];
        const m = new THREE.Mesh(g, lm ? mats : [mats[0], mats[0], roofMat, roofMat, mats[0], mats[0]]);
        m.position.set(x, h / 2 + 0.14, z);
        m.castShadow = m.receiveShadow = true;
        scene.add(m);
      }
    }

    // Landmark Antenna and Pulsing Beacon
    const an = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x1d5fd1 }));
    an.position.set(0, 33, 0);
    scene.add(an);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0x34d6a0, fog: false }));
    bulb.position.set(0, 36.2, 0);
    scene.add(bulb);

    // Instanced Trees
    const TN = 420;
    const treeMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ color: 0x2fb784, roughness: 0.9 }), TN);
    const dm = new THREE.Object3D();
    for (let k = 0; k < TN; k++) {
      const i = Math.round((rnd() - 0.5) * 16);
      const j = Math.round((rnd() - 0.5) * 16);
      const e = rnd() < 0.5;
      dm.position.set(
        i * 6 + (e ? (rnd() - 0.5) * 4.6 : rnd() < 0.5 ? -2.2 : 2.2),
        0.55,
        j * 6 + (e ? (rnd() < 0.5 ? -2.2 : 2.2) : (rnd() - 0.5) * 4.6)
      );
      const s = 0.7 + rnd() * 0.8;
      dm.scale.set(s, s * 1.2, s);
      dm.updateMatrix();
      treeMesh.setMatrixAt(k, dm.matrix);
    }
    treeMesh.castShadow = true;
    scene.add(treeMesh);

    // Traffic Cars
    const cols = [0x1d5fd1, 0xffffff, 0x0fa97a, 0x0a2a52];
    const cars = [];
    const cg = new THREE.BoxGeometry(0.95, 0.34, 0.46);
    for (let k = 0; k < 70; k++) {
      const ax = rnd() < 0.5 ? 0 : 1;
      const line = Math.round((rnd() - 0.5) * 14) * 6 + 3;
      const dir = rnd() < 0.5 ? 1 : -1;
      const m = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: cols[k % 4], roughness: 0.35, metalness: 0.5 }));
      m.castShadow = true;
      if (ax) m.rotation.y = Math.PI / 2;
      cars.push({ m, ax, line, dir, sp: 2.5 + rnd() * 3, pos: (rnd() - 0.5) * 100 });
      scene.add(m);
    }

    // Pulse Hotspots
    const hotspots = [
      [-12, 3],
      [9, -15],
      [18, 12]
    ].map(([i, j], n) => {
      const x = i + (n ? 3 : 3);
      const z = j + 3;
      const rings = [0, 1].map(() => {
        const m = new THREE.Mesh(
          new THREE.RingGeometry(0.7, 0.9, 48),
          new THREE.MeshBasicMaterial({ color: 0x0fa97a, transparent: true, side: THREE.DoubleSide, fog: false })
        );
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.25, z);
        scene.add(m);
        return m;
      });
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 12), new THREE.MeshBasicMaterial({ color: 0x0fa97a, transparent: true, opacity: 0.55, fog: false }));
      b.position.set(x, 6, z);
      scene.add(b);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0x34d6a0, fog: false }));
      dot.position.set(x, 12, z);
      scene.add(dot);
      return { x, z, rings };
    });

    // Drifting Cloud Sprites
    const cc = document.createElement('canvas');
    cc.width = cc.height = 128;
    const cgx = cc.getContext('2d');
    const gr2 = cgx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr2.addColorStop(0, 'rgba(255,255,255,.95)');
    gr2.addColorStop(1, 'rgba(255,255,255,0)');
    cgx.fillStyle = gr2;
    cgx.fillRect(0, 0, 128, 128);
    const ct = new THREE.CanvasTexture(cc);
    const clouds = [];
    for (let k = 0; k < 14; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, opacity: 0.5 + rnd() * 0.3, depthWrite: false, fog: false }));
      sp.scale.set(30 + rnd() * 30, 10 + rnd() * 8, 1);
      sp.position.set((rnd() - 0.5) * 200, 42 + rnd() * 18, (rnd() - 0.5) * 140);
      clouds.push(sp);
      scene.add(sp);
    }

    // Bezier Data Arcs linking hotspots
    const arcs = [
      [0, 1],
      [1, 2],
      [2, 0]
    ].map(([a, b]) => {
      const A = new THREE.Vector3(hotspots[a].x, 12, hotspots[a].z);
      const B = new THREE.Vector3(hotspots[b].x, 12, hotspots[b].z);
      const M = A.clone().add(B).multiplyScalar(0.5);
      M.y = 26;
      const cv = new THREE.QuadraticBezierCurve3(A, M, B);
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cv.getPoints(60)), new THREE.LineBasicMaterial({ color: 0x1d5fd1, transparent: true, opacity: 0.55, fog: false })));
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0x1d5fd1, fog: false }));
      scene.add(p);
      return { cv, p };
    });

    let mx = 0;
    let my = 0;
    let W = host.clientWidth;
    let H = host.clientHeight;

    const handlePointerMove = (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!host) return;
      W = host.clientWidth;
      H = host.clientHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      if (W > 900) {
        camera.setViewOffset(W, H, -W * 0.2, 0, W, H);
      } else {
        camera.clearViewOffset();
      }
      camera.updateProjectionMatrix();
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const v = new THREE.Vector3();
    let animId = null;

    const labs = [labRef0.current, labRef1.current, labRef2.current];

    const animate = (t) => {
      const s = t / 1000;
      const a = 0.5 + s * 0.035 + mx * 0.35;
      const r = W > 900 ? 50 : 62;

      camera.position.set(Math.sin(a) * r, 26 - my * 5, Math.cos(a) * r);
      camera.lookAt(0, 5, 0);

      cars.forEach((c) => {
        c.pos += c.dir * c.sp * 0.016;
        if (c.pos > 56) c.pos = -56;
        if (c.pos < -56) c.pos = 56;
        const off = c.dir * 0.4;
        if (c.ax) c.m.position.set(c.line + off, 0.3, c.pos);
        else c.m.position.set(c.pos, 0.3, c.line + off);
      });

      hotspots.forEach((h, n) => {
        h.rings.forEach((m, k) => {
          const p = (s * 0.45 + n * 0.3 + k * 0.5) % 1;
          m.scale.setScalar(1 + p * 9);
          m.material.opacity = (1 - p) * 0.85;
        });
      });

      bulb.material.color.setHex(Math.sin(s * 3) > 0 ? 0x34d6a0 : 0xb9f3de);

      clouds.forEach((c) => {
        c.position.x += 0.012;
        if (c.position.x > 110) c.position.x = -110;
      });

      arcs.forEach((a, n) => a.p.position.copy(a.cv.getPoint((s * 0.18 + n * 0.33) % 1)));

      labs.forEach((l, n) => {
        if (!l) return;
        const h = hotspots[n];
        v.set(h.x, 13, h.z).project(camera);
        const ok = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        l.style.opacity = ok ? '1' : '0';
        l.style.transform = `translate(${(v.x * 0.5 + 0.5) * W + 14}px, ${(-v.y * 0.5 + 0.5) * H - 28}px)`;
      });

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="landing-page-root">
      {/* Top Scroll Indicator */}
      <div id="landing-prog" style={{ transform: `scaleX(${scrollProgress})` }} />

      {/* Navigation */}
      <nav id="nav" className={isScrolled ? 's' : ''}>
        <div className="wrap landing-nav-inner">
          <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <defs>
                <linearGradient id="lg" x1="0" x2="1">
                  <stop stopColor="#1d5fd1" />
                  <stop offset="1" stopColor="#0fa97a" />
                </linearGradient>
              </defs>
              <rect width="40" height="40" rx="11" fill="url(#lg)" />
              <path d="M6 22h7l3-8 5 15 4-11 2 4h7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Urban Pulse</span>
          </div>

          <div className="links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#impact">Impact</a>
          </div>

          <button
            type="button"
            className="btn bp bs mag"
            onClick={() => onNavigateToAuth('login')}
          >
            Log in
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main id="top">
        {/* HERO SECTION */}
        <header className="hero">
          <div id="scene" ref={sceneRef} aria-hidden="true">
            <div className="lab" ref={labRef0}>
              <i />
              <div>
                <b>New citizen report</b>
                <span>Sample hotspot</span>
              </div>
            </div>
            <div className="lab" ref={labRef1}>
              <i />
              <div>
                <b>Incident alert</b>
                <span>Sample hotspot</span>
              </div>
            </div>
            <div className="lab" ref={labRef2}>
              <i />
              <div>
                <b>Response team</b>
                <span>Sample hotspot</span>
              </div>
            </div>

            <div className="gp">
              <b>City activity</b>
              <small>Simulated trend, not live data</small>
              <svg viewBox="0 0 240 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lg2" x1="0" x2="1">
                    <stop stopColor="#1d5fd1" />
                    <stop offset="1" stopColor="#0fa97a" />
                  </linearGradient>
                </defs>
                <path d="M2 46C24 42 34 22 54 28S86 50 106 24 146 8 166 20 204 34 238 6" />
              </svg>
            </div>
          </div>

          <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>
            <div className="hc">
              <p className="tag in0">
                <i />
                Smart City Monitoring &amp; Response Network
              </p>

              <h1 id="h1">
                <span className="w" style={{ animationDelay: '0.15s' }}>Urban </span>
                <span className="w grad" style={{ animationDelay: '0.24s' }}>Pulse</span>
              </h1>

              <p className="sub in0" style={{ animationDelay: '0.6s' }}>
                A Smarter City Starts with Us.
              </p>

              <p className="lead in0" style={{ animationDelay: '0.7s' }}>
                Connect citizens, empower authorities, and transform urban challenges into coordinated action through intelligent city monitoring.
              </p>

              <div className="cta in0" style={{ animationDelay: '0.85s' }}>
                <button
                  type="button"
                  className="btn bp mag"
                  onClick={() => onNavigateToAuth('login')}
                >
                  <span>Get Started</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
                <a className="btn bg mag" href="#features">
                  Explore Urban Pulse
                </a>
              </div>

              <div className="hs in0" style={{ animationDelay: '1s' }}>
                <div>
                  <b>{stats.reports.toLocaleString()}</b>
                  <span>Citizen reports</span>
                </div>
                <div>
                  <b>{stats.resolved.toLocaleString()}</b>
                  <span>Issues resolved</span>
                </div>
                <div>
                  <b>{stats.zones.toLocaleString()}</b>
                  <span>Monitoring zones</span>
                </div>
              </div>

              <p className="note in0" id="note" style={{ animationDelay: '1.1s' }}>
                Sample values shown for illustration. They are not live statistics.
              </p>
            </div>
          </div>
        </header>

        {/* SIMULATED TICKER */}
        <div className="tick" aria-label="Simulated example activity">
          <div>
            <span>Simulated: pothole reported, Ward 12</span>
            <span>Simulated: streetlight repaired</span>
            <span>Simulated: traffic congestion detected</span>
            <span>Simulated: water leak assigned to team</span>
            <span>Simulated: crowd alert resolved</span>
            <span>Simulated: waste collection scheduled</span>
            <span>Simulated: pothole reported, Ward 12</span>
            <span>Simulated: streetlight repaired</span>
            <span>Simulated: traffic congestion detected</span>
            <span>Simulated: water leak assigned to team</span>
            <span>Simulated: crowd alert resolved</span>
            <span>Simulated: waste collection scheduled</span>
          </div>
        </div>

        {/* FEATURES (BENTO GRID) */}
        <section id="features">
          <div className="wrap">
            <div className="sh rv">
              <div>
                <p className="eb">Features</p>
                <h2>
                  Building blocks for
                  <br />
                  a responsive city.
                </h2>
              </div>
              <p>Everything citizens and authorities need to see, share and solve urban problems together.</p>
            </div>

            <div className="bento">
              {/* Card 1: Citizen issue reporting */}
              <article className="card bt b3 rv">
                <div className="ico ib">{SVG_ICONS.pin}</div>
                <h3>Citizen issue reporting</h3>
                <p>Report potholes, outages and hazards with a location and a short description.</p>
                <div className="vz pinv">
                  <span className="rp" />
                  <span className="rp" style={{ animationDelay: '1.1s' }} />
                  {SVG_ICONS.pin}
                </div>
              </article>

              {/* Card 2: Complaint tracking */}
              <article className="card bt b3 rv">
                <div className="ico ig">{SVG_ICONS.track}</div>
                <h3>Complaint tracking</h3>
                <p>See the status of each report from submission to resolution.</p>
                <div className="vz trk">
                  <u>Reported</u>
                  <u>Assigned</u>
                  <u>Resolved</u>
                </div>
              </article>

              {/* Card 3: Smart city monitoring */}
              <article className="card bt b2 rv">
                <div className="ico ib">{SVG_ICONS.eye}</div>
                <h3>Smart city monitoring</h3>
                <p>Watch every monitoring zone from one dashboard.</p>
                <div className="vz heat">
                  {Array.from({ length: 30 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        '--d': `${(-(Math.random() * 3)).toFixed(2)}s`
                      }}
                    />
                  ))}
                </div>
              </article>

              {/* Card 4: Crowd and traffic intelligence */}
              <article className="card bt b2 rv">
                <div className="ico ig">{SVG_ICONS.people}</div>
                <h3>Crowd and traffic intelligence</h3>
                <p>Spot congestion and gatherings early.</p>
                <div className="vz eq">
                  {Array.from({ length: 10 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        '--d': `${(-(Math.random() * 1.5)).toFixed(2)}s`,
                        '--h': `${(0.4 + Math.random() * 0.6).toFixed(2)}`
                      }}
                    />
                  ))}
                </div>
              </article>

              {/* Card 5: Incident alerts */}
              <article className="card bt b2 rv">
                <div className="ico ib">{SVG_ICONS.bell}</div>
                <h3>Incident alerts</h3>
                <p>Get notified when something needs fast attention.</p>
                <div className="vz bellv">
                  <span className="rp o" />
                  <span className="rp o" style={{ animationDelay: '1.2s' }} />
                  {SVG_ICONS.bell}
                </div>
              </article>

              {/* Card 6: Authority coordination */}
              <article className="card bt b6 rv">
                <div>
                  <div className="ico ig">{SVG_ICONS.link}</div>
                  <h3>Authority coordination</h3>
                  <p>Route each issue to the right department and keep everyone aligned, from the first report to the final update.</p>
                </div>
                <svg className="net" viewBox="0 0 420 130" aria-hidden="true">
                  <g className="nl">
                    <path d="M50 65L190 65" />
                    <path d="M230 65L360 22" />
                    <path d="M230 65L370 65" />
                    <path d="M230 65L360 108" />
                  </g>
                  <g>
                    <circle className="nd" cx="50" cy="65" r="22" fill="#e6f0ff" stroke="#1d5fd1" strokeWidth="2" />
                    <text x="50" y="69" textAnchor="middle" fontSize="10" fill="#0a2a52">
                      Citizens
                    </text>
                    <circle className="nd" cx="210" cy="65" r="30" fill="#0a2a52" style={{ animationDelay: '0.4s' }} />
                    <text x="210" y="69" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">
                      Urban Pulse
                    </text>
                    <circle className="nd" cx="372" cy="22" r="16" fill="#e3f6ee" stroke="#0fa97a" strokeWidth="2" style={{ animationDelay: '0.8s' }} />
                    <text x="372" y="25" textAnchor="middle" fontSize="9" fill="#0a2a52">
                      Roads
                    </text>
                    <circle className="nd" cx="384" cy="65" r="16" fill="#e3f6ee" stroke="#0fa97a" strokeWidth="2" style={{ animationDelay: '1.2s' }} />
                    <text x="384" y="68" textAnchor="middle" fontSize="9" fill="#0a2a52">
                      Water
                    </text>
                    <circle className="nd" cx="372" cy="108" r="16" fill="#e3f6ee" stroke="#0fa97a" strokeWidth="2" style={{ animationDelay: '1.6s' }} />
                    <text x="372" y="111" textAnchor="middle" fontSize="9" fill="#0a2a52">
                      Power
                    </text>
                  </g>
                </svg>
              </article>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="how">
          <div className="wrap hg">
            <div className="rv">
              <p className="eb">How it works</p>
              <h2>
                From a report to a
                <br />
                coordinated response.
              </h2>
              <div style={{ marginTop: '1.5rem' }}>
                <div className="stp">
                  <div className="num">1</div>
                  <div>
                    <h3>Citizens report</h3>
                    <p>Anyone in the city can report an issue or concern.</p>
                  </div>
                </div>
                <div className="stp">
                  <div className="num">2</div>
                  <div>
                    <h3>Urban Pulse connects</h3>
                    <p>Related information is brought together by location and type.</p>
                  </div>
                </div>
                <div className="stp">
                  <div className="num">3</div>
                  <div>
                    <h3>Authorities respond</h3>
                    <p>Teams review, coordinate, and update the outcome.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="feed rv" aria-label="Simulated preview of the report feed">
              <div className="fh">
                <span>Report feed</span>
                <small>Simulated preview</small>
              </div>
              <div id="fl">
                {feedItems.map((item) => (
                  <div key={item.id} className="fi">
                    <i>{SVG_ICONS[item.icon] || SVG_ICONS.pin}</i>
                    <div>
                      <b>{item.title}</b>
                      <span>{item.sub}</span>
                    </div>
                    <em className={item.statusClass}>{item.status}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* IMPACT COMMAND CENTER */}
        <section id="impact" className="cmd">
          <div className="wrap">
            <div className="sh rv">
              <div>
                <p className="eb" style={{ color: '#6ee7b7' }}>
                  Impact
                </p>
                <h2 style={{ color: '#fff' }}>
                  Real reports.
                  <br />
                  Real response.
                </h2>
              </div>
              <p style={{ color: '#9db4d1' }}>Live figures replace these samples once your backend statistics are connected.</p>
            </div>

            <div className="cg rv" id="imp">
              {/* Circular Gauge */}
              <div className="gauge">
                <svg viewBox="0 0 120 120">
                  <circle className="rt" cx="60" cy="60" r="52" />
                  <circle className="rg" cx="60" cy="60" r="52" transform="rotate(-90 60 60)" style={{ '--p': stats.rate / 100 }} />
                </svg>
                <div className="gv">
                  <b className="pc">{stats.rate}</b>
                  <span>Resolution rate</span>
                </div>
                <p>Resolved issues as a share of reports. Sample values.</p>
              </div>

              {/* Stat Tiles with SVG Sparklines */}
              <div className="tile">
                <span>Citizen reports</span>
                <b>{stats.reports.toLocaleString()}</b>
                <svg viewBox="0 0 120 36" preserveAspectRatio="none">
                  <path pathLength="1" d="M0 30C20 28 30 14 50 18S80 30 100 10 112 4 120 6" />
                </svg>
              </div>

              <div className="tile">
                <span>Issues resolved</span>
                <b>{stats.resolved.toLocaleString()}</b>
                <svg viewBox="0 0 120 36" preserveAspectRatio="none">
                  <path pathLength="1" d="M0 32C25 30 35 22 55 20S85 14 100 8 112 6 120 4" />
                </svg>
              </div>

              <div className="tile">
                <span>Active monitoring zones</span>
                <b>{stats.zones.toLocaleString()}</b>
                <svg viewBox="0 0 120 36" preserveAspectRatio="none">
                  <path pathLength="1" d="M0 20H30L40 8 55 28 70 12 85 22H120" />
                </svg>
              </div>

              <div className="tile">
                <span>Authority responses</span>
                <b>{stats.responses.toLocaleString()}</b>
                <svg viewBox="0 0 120 36" preserveAspectRatio="none">
                  <path pathLength="1" d="M0 28C15 10 30 30 50 16S85 26 100 12 114 8 120 10" />
                </svg>
              </div>
            </div>

            {/* Live ECG Heartbeat Line */}
            <svg className="ecg" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="lg3" x1="0" x2="1">
                  <stop stopColor="#1d5fd1" />
                  <stop offset="1" stopColor="#34d6a0" />
                </linearGradient>
              </defs>
              <path
                className="eb0"
                d="M0 40H240l18-8 18 8h40l14-34 22 70 18-52 14 16h60H520l18-8 18 8h40l14-34 22 70 18-52 14 16h60H800l18-8 18 8h40l14-34 22 70 18-52 14 16h60H1200"
              />
              <path
                className="eb1"
                pathLength="1000"
                d="M0 40H240l18-8 18 8h40l14-34 22 70 18-52 14 16h60H520l18-8 18 8h40l14-34 22 70 18-52 14 16h60H800l18-8 18 8h40l14-34 22 70 18-52 14 16h60H1200"
              />
            </svg>
          </div>
        </section>

        {/* FINAL CALL TO ACTION BANNER */}
        <div className="wrap">
          <div className="final rv">
            <span className="ring r1" />
            <span className="ring r2" />
            <h2>Be Part of a Smarter City.</h2>
            <p>Join Urban Pulse as a citizen, or sign in with your assigned authority credentials.</p>
            <div className="cta">
              <button
                type="button"
                className="btn bw mag"
                onClick={() => onNavigateToAuth('register')}
              >
                Create Citizen Account
              </button>
              <button
                type="button"
                className="btn bo mag"
                onClick={() => onNavigateToAuth('authority')}
              >
                Authority Login
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer>
        <div className="wrap fg">
          <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Urban Pulse
          </div>
          <nav aria-label="Footer">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0 }}
              onClick={() => onNavigateToAuth('login')}
            >
              Log in
            </button>
          </nav>
          <span>© 2026 Urban Pulse. Smart City Monitoring &amp; Response Network.</span>
        </div>
      </footer>
    </div>
  );
}
