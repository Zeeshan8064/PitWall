import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RaceDetail from './pages/RaceDetail'
import Simulator from './pages/Simulator'

function App() {
  return (
    <BrowserRouter>
      <div className="bg-gray-900 min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/race/:id" element={<RaceDetail />} />
          <Route path="/simulator" element={<Simulator />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App