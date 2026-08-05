import type { SessionContext, SessionGroup, SessionSummary } from "./raceTypes";

interface Props {
  context: SessionContext;
  selectedKey: number;
  onSelect: (session: SessionSummary) => void;
}

const GROUP_LABELS: Record<SessionGroup, string> = {
  grandPrix: "Grand Prix",
  sprint: "Sprint",
};

// Two levels, both driven entirely by what the backend says the weekend holds:
// the group toggle only appears when there are sprint sessions, and each group
// lists its own sessions. Adding a new session type needs no change here.
export default function SessionSelector({
  context,
  selectedKey,
  onSelect,
}: Props) {
  const { groups, isSprintWeekend } = context;

  // The active half follows the selected session rather than local state, so
  // the selector cannot drift out of sync with what is actually rendered.
  const activeGroup: SessionGroup = context.selected?.group ?? "grandPrix";
  const sessions = groups[activeGroup] ?? [];

  // Switching halves loads that half's first session (Race, or Sprint Race)
  // instead of leaving the page in a half-selected state.
  const switchGroup = (group: SessionGroup) => {
    const first = groups[group]?.[0];

    if (first && first.sessionKey !== selectedKey) onSelect(first);
  };

  return (
    <div className="mt-6 flex flex-col gap-4">
      {isSprintWeekend && (
        <div className="inline-flex w-fit rounded-xl border border-neutral-800 bg-neutral-900 p-1">
          {(["grandPrix", "sprint"] as SessionGroup[]).map((group) => {
            const isActive = group === activeGroup;

            return (
              <button
                key={group}
                onClick={() => switchGroup(group)}
                disabled={(groups[group] ?? []).length === 0}
                className={`rounded-lg px-5 py-2 text-sm font-bold uppercase tracking-wider transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActive
                    ? "bg-red-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {GROUP_LABELS[group]}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {sessions.map((session) => {
          const isActive = session.sessionKey === selectedKey;

          return (
            <button
              key={session.sessionKey}
              onClick={() => onSelect(session)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                isActive
                  ? "border-red-500 bg-red-500/10 text-white"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-white"
              }`}
            >
              {session.label}
              {session.isFuture && (
                <span className="ml-2 text-xs font-normal text-neutral-500">
                  Upcoming
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
