import { useEffect } from 'react';
import Lenis from 'lenis';
import { Hero } from './sections/Hero';
import { Threads } from './sections/Threads';
import { Fabric } from './sections/Fabric';
import { Shuttle } from './sections/Shuttle';
import { Quiet } from './sections/Quiet';
import { OpenSource } from './sections/OpenSource';
import { ModuleStore } from './sections/ModuleStore';
import { Footer } from './sections/Footer';
import { NavBar } from './components/NavBar';
import { Atmosphere } from './components/Atmosphere';
import { ScrollProgress } from './components/ScrollProgress';
import { Cursor } from './components/Cursor';
import { GrainOverlay } from './components/GrainOverlay';
import { RheoLineSpine } from './components/RheoLineSpine';
import './index.css';

function App() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <GrainOverlay />
      <RheoLineSpine />
      <Atmosphere />
      <ScrollProgress />
      <Cursor />
      <NavBar />
      <Hero />
      <div id="threads" className="reveal">
        <Threads />
      </div>
      <div className="reveal">
        <Shuttle />
      </div>
      <div className="reveal">
        <Fabric />
      </div>
      <div className="reveal">
        <ModuleStore />
      </div>
      <div className="reveal">
        <Quiet />
      </div>
      <div id="open-source" className="reveal">
        <OpenSource />
      </div>
      <div id="footer" className="reveal">
        <Footer />
      </div>
    </>
  );
}

export default App;
