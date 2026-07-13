import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';
const SEASONS = ['2026', '2025', '2024', '2023'];

interface Race {
  sessionKey: number;
  round: number;
  raceName: string;
  circuit: string;
  location: string;
  country: string;
  countryCode: string;
  date: string;
}

function Home() {
  const [season, setSeason] = useState('2026');
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRaces = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE}/api/races/season/${season}`);
        setRaces(res.data.races);
      } catch {
        setError('Failed to load races');
      } finally {
        setLoading(false);
      }
    };
    fetchRaces();
  }, [season]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">PitWall</h1>
          <p className="text-gray-400 mt-1">Race Strategy, Not Data Overload.</p>
        </div>
        <select
          value={season}
          onChange={e => setSeason(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
        >
          {SEASONS.map(s => <option key={s} value={s}>{s} Season</option>)}
        </select>
      </div>

      {loading && <div className="text-gray-400">Loading races...</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {races.map(race => (
            <div
              key={race.sessionKey}
              onClick={() => navigate(`/race/${race.sessionKey}`)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-5 cursor-pointer transition-colors"
            >
              <div className="text-sm text-gray-400 mb-1">Round {race.round}</div>
              <div className="text-xl font-semibold text-white mb-1">{race.raceName}</div>
              <div className="text-gray-300 text-sm">{race.location}, {race.country}</div>
              <div className="text-gray-500 text-sm mt-1">{race.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;