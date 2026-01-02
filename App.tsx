
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import Publish from './pages/Publish';
import Player from './pages/Player';
import Login from './pages/Login';
import { ThemeProvider } from './context/ThemeContext';
import { PlayerProvider } from './context/PlayerContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <PlayerProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/login" element={<Login />} />
              <Route path="/publish" element={<Publish />} />
              <Route path="/song/:songId" element={<Player />} />
            </Routes>
          </Layout>
        </Router>
      </PlayerProvider>
    </ThemeProvider>
  );
};

export default App;
