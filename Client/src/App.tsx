import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Race from "./pages/Race";
import Driver from "./pages/Driver";
import Simulator from "./pages/Simulator";

function App() {
  return (
    <BrowserRouter>
      <div className="bg-gray-900">
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route path="/races" element={<Home />} />

          <Route
            path="/race/:sessionKey"
            element={<Race />}
          />

          <Route
            path="/race/:sessionKey/driver/:driverNumber"
            element={<Driver />}
          />

          <Route
            path="/simulator"
            element={<Simulator />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;