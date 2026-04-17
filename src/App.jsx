import { useExoplanets } from './hooks/useExoplanets';
import './App.css';

function App() {
  const { data, loading, error } = useExoplanets();

  return (
    <div className="flex h-screen w-screen flex-col bg-background font-body text-text-primary">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex flex-col">
          <h1 className="font-display text-2xl font-bold tracking-[0.2em] text-accent-cyan">
            EXOPLANET EXPLORER
          </h1>
          <span className="text-xs uppercase tracking-widest text-text-secondary">
            NASA Confirmed Exoplanet Archive
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase tracking-widest text-text-muted">
            Planets Loaded
          </span>
          <span className="font-display text-xl font-bold text-accent-teal">
            {loading ? 'Loading...' : data?.length.toLocaleString() ?? 0}
          </span>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-background">
        {loading && (
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent-cyan" />
        )}
        {!loading && error && (
          <div className="max-w-md text-center">
            <p className="mb-2 font-display text-lg uppercase tracking-widest text-accent-red">
              Connection Error
            </p>
            <p className="text-sm text-text-secondary">
              {error.message || 'Failed to load exoplanet data.'}
            </p>
          </div>
        )}
        {!loading && !error && data && (
          <p className="font-display text-lg uppercase tracking-widest text-text-muted">
            Map goes here
          </p>
        )}
      </main>
    </div>
  );
}

export default App;
