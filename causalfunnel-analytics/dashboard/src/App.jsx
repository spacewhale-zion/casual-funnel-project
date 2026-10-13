import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Sessions from './Sessions.jsx';
import Heatmap from './Heatmap.jsx';

export default function App() {
  return (
    <>
      <nav className="navbar">
        <span className="brand">CausalFunnel Analytics</span>
        <NavLink to="/sessions">Sessions</NavLink>
        <NavLink to="/heatmap">Heatmap</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/sessions" replace />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/heatmap" element={<Heatmap />} />
        </Routes>
      </main>
    </>
  );
}
