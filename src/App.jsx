import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, History as HistoryIcon, Lock, LogOut, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "./supabase";

const TYPES = {
  win: { label: "Wygrana", points: 3, icon: "🟢" },
  draw: { label: "Remis", points: 1, icon: "🟡" },
  loss: { label: "Porażka", points: 0, icon: "🔴" }
};
const today = () => new Date().toLocaleDateString("sv-SE");
const datePL = value => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));

/*
  Bonus naliczany osobno dla każdej nieprzerwanej serii:
  5 obecności = +3; 10 = kolejne +5; 20 = kolejne +5; itd.
  Brak rekordu gracza przy danym meczu oznacza nieobecność i zeruje serię.
*/
function bonusForStreak(length) {
  if (length < 5) return 0;
  return 3 + Math.floor(length / 10) * 5;
}

function calculatePlayerStats(players, matches, results) {
  const orderedMatches = [...matches].sort((a, b) => a.match_date.localeCompare(b.match_date) || String(a.id).localeCompare(String(b.id)));
  return players.map(player => {
    const resultByMatch = new Map(results.filter(row => row.player_id === player.id).map(row => [row.match_id, row]));
    let currentStreak = 0;
    let segmentLength = 0;
    let bonusPoints = 0;
    let matchPoints = 0;
    let played = 0;
    let wins = 0, draws = 0, losses = 0;

    for (const match of orderedMatches) {
      const row = resultByMatch.get(match.id);
      if (row) {
        segmentLength += 1;
        currentStreak = segmentLength;
        played += 1;
        matchPoints += TYPES[row.result].points;
        if (row.result === "win") wins += 1;
        if (row.result === "draw") draws += 1;
        if (row.result === "loss") losses += 1;
      } else {
        bonusPoints += bonusForStreak(segmentLength);
        segmentLength = 0;
        currentStreak = 0;
      }
    }
    bonusPoints += bonusForStreak(segmentLength);
    return { ...player, played, matchPoints, bonusPoints, points: matchPoints + bonusPoints, currentStreak, wins, draws, losses };
  });
}

export default function App() {
  const [view, setView] = useState({ name: "ranking" });
  const [sortBy, setSortBy] = useState("points");
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [results, setResults] = useState([]);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true); setError("");
    const [p, m, r] = await Promise.all([
      supabase.from("players").select("*").eq("active", true).order("stable_order"),
      supabase.from("matches").select("*").order("match_date", { ascending: false }),
      supabase.from("match_results").select("*")
    ]);
    const problem = p.error || m.error || r.error;
    if (problem) setError(problem.message);
    else { setPlayers(p.data || []); setMatches(m.data || []); setResults(r.data || []); }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(currentSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(false); return; }
    supabase.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle().then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session]);

  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(""), 2600); return () => clearTimeout(id); }, [notice]);

  const stats = useMemo(() => calculatePlayerStats(players, matches, results), [players, matches, results]);
  const ranking = useMemo(() => [...stats].sort((a, b) => {
    const keys = sortBy === "matches" ? ["played", "points", "currentStreak"] : sortBy === "streak" ? ["currentStreak", "points", "played"] : ["points", "played", "currentStreak"];
    for (const key of keys) if (b[key] !== a[key]) return b[key] - a[key];
    return a.stable_order - b.stable_order;
  }), [stats, sortBy]);

  async function afterSave(message) {
    await loadData(); setNotice(message); setView({ name: "admin" });
  }

  async function logout() { await supabase.auth.signOut(); setView({ name: "ranking" }); }

  return <main className="app">
    {error && <div className="global-error">{error}<button onClick={() => setError("")}><X size={15}/></button></div>}
    {view.name === "ranking" && <Ranking ranking={ranking} sortBy={sortBy} setSortBy={setSortBy} openHistory={() => setView({ name: "history" })} openAdmin={() => setView({ name: session ? "admin" : "login" })}/>} 
    {view.name === "login" && <Login back={() => setView({ name: "ranking" })} success={() => setView({ name: "admin" })}/>} 
    {view.name === "admin" && (session && isAdmin ? <AdminHome matches={matches} results={results} back={() => setView({ name: "ranking" })} logout={logout} add={() => setView({ name: "editor" })} edit={id => setView({ name: "editor", id })}/> : session ? <Denied back={() => setView({ name: "ranking" })}/> : <Login back={() => setView({ name: "ranking" })} success={() => setView({ name: "admin" })}/>)}
    {view.name === "history" && <History matches={matches} results={results} players={players} isAdmin={isAdmin} back={() => setView({ name: "ranking" })} edit={id => setView({ name: "editor", id })}/>} 
    {view.name === "editor" && session && isAdmin && <MatchEditor players={players} existing={matches.find(item => item.id === view.id)} existingResults={results.filter(item => item.match_id === view.id)} back={() => setView({ name: "admin" })} saved={afterSave}/>} 
    {loading && <div className="loading">Ładowanie…</div>}
    {notice && <div className="toast"><Check size={15}/>{notice}</div>}
  </main>;
}

function Ranking({ ranking, sortBy, setSortBy, openHistory, openAdmin }) {
  return <section className="page ranking-page">
    <header className="ranking-title"><h1>Ranking wtorkowej sali</h1><p>Punkty zawierają bonusy za regularność</p></header>
    <div className="segments">{[["points", "Punkty"], ["matches", "Mecze"], ["streak", "Seria"]].map(([value, label]) => <button key={value} className={sortBy === value ? "active" : ""} onClick={() => setSortBy(value)}>{label}</button>)}</div>
    <div className="table-head"><span>#</span><span>Zawodnik</span><span>Punkty</span><span>Mecze</span><span>Seria</span></div>
    <section className="ranking-list">{ranking.map((player, index) => <div key={player.id} className={`ranking-row top-${index + 1}`}>
      <span className="position">{index + 1}</span>
      <div className="rank-name"><span>{player.name}</span>{player.bonusPoints > 0 && <small>w tym +{player.bonusPoints} bonusu</small>}</div>
      <span className="number strong">{player.points}</span><span className="number">{player.played}</span><span className="number streak">{player.currentStreak}</span>
    </div>)}</section>
    <nav className="bottom-nav"><button onClick={openHistory}><HistoryIcon size={14}/>Historia</button><button onClick={openAdmin}><Lock size={13}/>Admin</button></nav>
  </section>;
}

function Login({ back, success }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); setError(""); const { error } = await supabase.auth.signInWithPassword({ email, password }); setBusy(false); if (error) setError("Nieprawidłowy e-mail lub hasło"); else success(); }
  return <section className="page padded"><button className="back" onClick={back}><ArrowLeft size={17}/>Ranking</button><div className="card login-card"><div className="lock-icon"><Lock size={20}/></div><h2>Logowanie administratora</h2><p>Zaloguj się, aby dodawać i poprawiać wyniki.</p><form onSubmit={submit}><input type="email" required placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)}/><input type="password" required placeholder="Hasło" value={password} onChange={e => setPassword(e.target.value)}/>{error && <div className="form-error">{error}</div>}<button className="primary" disabled={busy}>{busy ? "Logowanie…" : "Zaloguj"}</button></form></div></section>;
}

function AdminHome({ matches, results, back, logout, add, edit }) {
  const ordered = [...matches].sort((a, b) => b.match_date.localeCompare(a.match_date));
  return <section className="page padded"><header className="nav-header"><button className="back" onClick={back}><ArrowLeft size={17}/>Ranking</button><button className="logout" onClick={logout}><LogOut size={14}/>Wyloguj</button></header><h1>Panel administratora</h1><p className="subtitle">Dodawaj mecze i poprawiaj historię</p><button className="primary full" onClick={add}>Dodaj nowy mecz</button><h2 className="section-title">Historia do edycji</h2>{ordered.length ? <div className="history-list">{ordered.map(match => <button className="history-item" key={match.id} onClick={() => edit(match.id)}><div><b>{datePL(match.match_date)}</b><span>{results.filter(row => row.match_id === match.id).length} uczestników</span></div><span className="edit-label"><Pencil size={14}/>Edytuj</span></button>)}</div> : <div className="empty">Brak zapisanych meczów.</div>}</section>;
}

function History({ matches, results, players, isAdmin, back, edit }) {
  return <section className="page padded"><header className="nav-header"><button className="back" onClick={back}><ArrowLeft size={17}/>Ranking</button></header><h1>Historia meczów</h1><p className="subtitle">Od najnowszego do najstarszego</p>{matches.length ? matches.map(match => <article className="card match-card" key={match.id}><header><div><h3>{datePL(match.match_date)}</h3><p>{results.filter(row => row.match_id === match.id).length} uczestników</p></div>{isAdmin && <button className="small-edit" onClick={() => edit(match.id)}><Pencil size={13}/>Edytuj</button>}</header>{results.filter(row => row.match_id === match.id).map(row => { const player = players.find(item => item.id === row.player_id); return <div className="match-result" key={row.id}><span>{player?.name}</span><b className={row.result}>{TYPES[row.result].label} +{TYPES[row.result].points}</b></div>; })}</article>) : <div className="empty">Brak zapisanych meczów.</div>}</section>;
}

function MatchEditor({ players, existing, existingResults, back, saved }) {
  const [date, setDate] = useState(existing?.match_date || today());
  const [draft, setDraft] = useState(() => Object.fromEntries(players.map(player => [player.id, existingResults.find(row => row.player_id === player.id)?.result || null])));
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const participantCount = Object.values(draft).filter(Boolean).length;
  const counts = { win: Object.values(draft).filter(v => v === "win").length, draw: Object.values(draft).filter(v => v === "draw").length, loss: Object.values(draft).filter(v => v === "loss").length };

  async function save() {
    if (!participantCount) { setError("Wybierz wynik co najmniej jednego uczestnika."); return; }
    setBusy(true); setError("");
    let matchId = existing?.id;
    if (existing) {
      const { error: matchError } = await supabase.from("matches").update({ match_date: date, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (matchError) { setError(matchError.message); setBusy(false); return; }
      const { error: deleteError } = await supabase.from("match_results").delete().eq("match_id", existing.id);
      if (deleteError) { setError(deleteError.message); setBusy(false); return; }
    } else {
      const { data, error: matchError } = await supabase.from("matches").insert({ match_date: date }).select().single();
      if (matchError) { setError(matchError.message); setBusy(false); return; }
      matchId = data.id;
    }
    const rows = players.filter(player => draft[player.id]).map(player => ({ match_id: matchId, player_id: player.id, result: draft[player.id] }));
    const { error: insertError } = await supabase.from("match_results").insert(rows);
    if (insertError) { setError(insertError.message); setBusy(false); return; }
    await saved(existing ? "Mecz został poprawiony" : "Mecz został dodany");
  }

  async function remove() {
    if (!existing || !window.confirm("Usunąć cały mecz? Ranking i serie zostaną przeliczone.")) return;
    setBusy(true); const { error } = await supabase.from("matches").delete().eq("id", existing.id); setBusy(false);
    if (error) setError(error.message); else await saved("Mecz został usunięty");
  }

  return <section className="page editor-page"><header className="sticky-header"><button className="back" onClick={back}><ArrowLeft size={17}/>Panel</button><div><h1>{existing ? "Edytuj mecz" : "Dodaj punkty"}</h1><p>{participantCount} uczestników</p></div></header><div className="editor-body"><label>Data meczu</label><input type="date" value={date} onChange={e => setDate(e.target.value)}/>{error && <div className="form-error editor-error">{error}</div>}<div className="players-editor">{players.map(player => <div className="player-editor" key={player.id}><b>{player.name}</b><div className="choices"><Choice selected={!draft[player.id]} className="absent" label="Nie grał" onClick={() => setDraft(current => ({ ...current, [player.id]: null }))}/>{Object.entries(TYPES).map(([value, meta]) => <Choice key={value} selected={draft[player.id] === value} className={value} label={meta.label} points={meta.points} onClick={() => setDraft(current => ({ ...current, [player.id]: value }))}/>)}</div></div>)}</div><div className="summary"><b>Uczestnicy: {participantCount}</b><span>🟢 Wygrane: {counts.win}</span><span>🟡 Remisy: {counts.draw}</span><span>🔴 Porażki: {counts.loss}</span></div>{existing && <button className="delete-match" onClick={remove} disabled={busy}><Trash2 size={15}/>Usuń cały mecz</button>}</div><div className="save-bar"><button className="primary full" onClick={save} disabled={busy || !participantCount}>{busy ? "Zapisywanie…" : existing ? "Zapisz poprawki" : "Zapisz wyniki"}</button></div></section>;
}

function Choice({ selected, className, label, points, onClick }) { return <button type="button" className={`choice ${className} ${selected ? "selected" : ""}`} onClick={onClick}><span>{label}</span>{points !== undefined && <small>+{points}</small>}</button>; }
function Denied({ back }) { return <section className="page padded"><div className="card"><h2>Brak uprawnień</h2><p>To konto nie znajduje się na liście administratorów.</p><button className="primary full" onClick={back}>Wróć</button></div></section>; }
