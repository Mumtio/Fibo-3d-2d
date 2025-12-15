import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Generator } from './pages/Generator';
import { useAppStore } from './store/useAppStore';
import { Cpu, Grid } from 'lucide-react';

function NavBar() {
  const { currentTab, setTab } = useAppStore();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-retro-base border-b-2 border-black shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" onClick={() => setTab('home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
           <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
             <div className="w-4 h-4 bg-pastel-pink rounded-sm rotate-45"></div>
           </div>
           <span className="text-xl font-extrabold tracking-tight">GenForge</span>
        </Link>

        <div className="flex gap-1 bg-gray-200 p-1 rounded-full border border-gray-400">
          <Link to="/">
            <button 
              onClick={() => setTab('home')}
              className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${isActive('/') ? 'bg-white shadow-sm text-black border border-gray-200' : 'text-gray-500 hover:text-black'}`}
            >
              <Cpu size={16} /> Home
            </button>
          </Link>
          <Link to="/generate">
            <button 
              onClick={() => setTab('generate')}
              className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${isActive('/generate') ? 'bg-white shadow-sm text-black border border-gray-200' : 'text-gray-500 hover:text-black'}`}
            >
              <Grid size={16} /> Generate
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-cream text-gray-900 font-sans selection:bg-pastel-pink selection:text-black">
        <NavBar />
        <main className="py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/generate" element={<Generator />} />
          </Routes>
        </main>
        
        <footer className="text-center py-8 text-gray-400 font-retro text-sm border-t-2 border-gray-200 mt-12">
          GENFORGE v1.0 • POWERED BY THREE.JS + REACT
        </footer>
      </div>
    </HashRouter>
  );
}

export default App;