import { useEffect, useState } from "react";
import axios from "axios";
import type { SessionContext } from "./raceTypes";

const API_BASE = "http://localhost:5000";

// Resolves a session key to the weekend it belongs to and every sibling
// session. Keyed off the session rather than the meeting so a deep link to any
// session — including sprint qualifying — loads with the selector in the right
// state and no dependency on router state.
export function useSessionContext(sessionKey: string | undefined) {
  const [context, setContext] = useState<SessionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionKey) return;

    let cancelled = false;

    const fetchContext = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get(
          `${API_BASE}/api/races/${sessionKey}/session-context`
        );

        if (cancelled) return;

        setContext({
          meeting: res.data.meeting,
          isSprintWeekend: res.data.isSprintWeekend ?? false,
          groups: {
            grandPrix: res.data.groups?.grandPrix ?? [],
            sprint: res.data.groups?.sprint ?? [],
          },
          selected: res.data.selected ?? null,
        });
      } catch {
        if (!cancelled) setError("Failed to load session");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchContext();

    // Switching sessions refires this; a slow first response must not
    // overwrite the newer one.
    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  return { context, loading, error };
}
