import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Race from './pages/Race.tsx'
import Driver from './pages/Driver.tsx'
import Simulator from './pages/Simulator'

function App() {
  return (
    <BrowserRouter>
      <div className="bg-gray-900 min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/race/:sessionKey" element={<Race />} />
          <Route path="/race/:sessionKey/driver/:driverNumber" element={<Driver />} />
          <Route path="/simulator" element={<Simulator />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App