import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Race from "./pages/RaceReplay/Race";
import Driver from "./pages/Driver/Driver";
import RaceStrategy from "./pages/RaceStrategy";
import DriverAnalysis from "./pages/DriveraAnalysis/DriverAnalysis";
import CarPerformance from "./pages/CarPerformance";
import StrategySimulator from "./pages/StrategySim/StrategySimulator";
import RaceReplay from "./pages/RaceReplay/RaceReplay"


function App() {
  return (
    <BrowserRouter>
      <div className="bg-gray-900">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/race/:sessionKey" element={<Race />} />
          <Route path="/race/:sessionKey/driver/:driverNumber" element={<Driver />} />
          <Route path="/race-strategy" element={<RaceStrategy />} />
          <Route path="/driver-analysis" element={<DriverAnalysis />} />
          <Route path="/car-performance" element={<CarPerformance />} />
          <Route path="/strategy-simulator" element={<StrategySimulator />} />
          <Route path="/race-replay" element={<RaceReplay />} />
          <Route path="/drivers" element={<Driver/>}/>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
