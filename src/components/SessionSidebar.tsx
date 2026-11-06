import { AudioLines, Plus, Search, Settings2 } from 'lucide-react';
import { BRAND } from '../brand';
import type { Session, State } from '../product';
type Props = {
  state: State;
  disabled: boolean;
  query: string;
  setQuery: (query: string) => void;
  semanticResults: string[] | null;
  setSemanticResults: (ids: string[] | null) => void;
  searching: boolean;
  semanticSearch: () => Promise<void>;
  onlyFavorites: boolean;
  setOnlyFavorites: (value: boolean) => void;
  newSession: () => void;
  selectSession: (session: Session) => void;
  openSettings: () => void;
};
export default function SessionSidebar({
  state,
  disabled,
  query,
  setQuery,
  semanticResults,
  setSemanticResults,
  searching,
  semanticSearch,
  onlyFavorites,
  setOnlyFavorites,
  newSession,
  selectSession,
  openSettings,
}: Props) {
  return (
    <aside className="sidebar">
      <div className="brand" aria-label={BRAND.fullName}>
        <span className="brand-icon">
          <AudioLines size={23} />
        </span>
        <div className="brand-copy">
          <strong>GOSU</strong>
          <span>Speech to Text</span>
          <small>{BRAND.descriptor}</small>
        </div>
      </div>
      <button className="new" onClick={newSession} disabled={disabled}>
        <Plus size={17} /> New dictation <span>＋</span>
      </button>
      <div className="search">
        <Search size={16} />
        <input
          aria-label="Search dictations"
          placeholder="Search your ideas…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSemanticResults(null);
          }}
        />
      </div>
      <button
        className="favorites-filter"
        disabled={searching || !query.trim()}
        onClick={() => void semanticSearch()}
      >
        {searching ? 'Searching…' : 'Search by meaning · local'}
      </button>
      <button
        className="favorites-filter"
        aria-pressed={onlyFavorites}
        onClick={() => setOnlyFavorites(!onlyFavorites)}
      >
        {onlyFavorites ? 'Show all' : 'Favorites only'}
      </button>
      <div className="section-label">
        YOUR WORKSPACE <span>{state.sessions.length}</span>
      </div>
      <nav aria-label="Saved dictations">
        {(semanticResults
          ? semanticResults
              .map((id) => state.sessions.find((s) => s.id === id))
              .filter((s): s is Session => !!s)
          : state.sessions.filter((s) =>
              [s.title, s.text, s.tags]
                .join(' ')
                .toLocaleLowerCase()
                .includes(query.toLocaleLowerCase()),
            )
        )
          .filter((s) => !onlyFavorites || s.favorite)
          .map((s) => (
            <button
              className={'session ' + (s.id === state.active ? 'active' : '')}
              key={s.id}
              disabled={disabled}
              onClick={() => {
                selectSession(s);
              }}
            >
              <span>
                {s.favorite ? '★ ' : ''}
                {s.title || s.text.slice(0, 48) || 'An idea waiting to happen'}
              </span>
              <small>
                {new Date(s.created).toLocaleString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </small>
            </button>
          ))}
      </nav>
      <div className="side-bottom">
        <span className="local-dot" /> Your dictations, on this device.
        <button onClick={() => openSettings()}>
          <Settings2 size={17} /> Settings
        </button>
      </div>
    </aside>
  );
}
