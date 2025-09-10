'use client';
import { useEffect, useMemo, useState } from 'react';

async function api(payload, method='POST') {
  const url = method === 'GET'
    ? '/api/query?' + new URLSearchParams(payload).toString()
    : '/api/query';
  const res = await fetch(url, {
    method, headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(payload)
  });
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { ok:false, error:'Bad JSON from API', raw:txt }; }
}

export default function Page() {
  const [q,setQ]=useState(''); const [jd,setJd]=useState(''); const [sel,setSel]=useState('');
  const [projects,setProjects]=useState([]); const [others,setOthers]=useState([]);
  const [hits,setHits]=useState([]); const [note,setNote]=useState(''); const [md,setMd]=useState('');
  const [loadingAsk,setLA]=useState(false); const [loadingCover,setLC]=useState(false); const [loadingCase,setLCa]=useState(false);

  useEffect(() => { (async () => {
    const r = await api({ mode:'list' }, 'GET');
    if (r.ok) {
      setProjects(r.projects||[]); setOthers(r.others||[]);
      setSel((r.projects && r.projects[0]) || '');
    } else { console.warn('List failed', r); }
  })(); }, []);

  const tips = useMemo(()=>[
    'What did you do on HSBC payments?',
    'How did you improve Mercedes-Benz IA?',
    'Tell me about SRF (Swiss broadcaster).',
    'What was your role on Barclaycard ID&V?',
    'What is La Casa Shambala?'
  ],[]);

  return (
    <div className="container">
      <h1>Talk to my work</h1>
      <p className="muted">All answers cite only the files listed in Sources. No external data is used.</p>

      <div className="row">
        <div className="col"><div className="card">
          <h3>Ask about my work</h3>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder={`e.g. "${tips[0]}"`} />
          <div className="btnRow">
            <button
  type="button"
  className="btn primary"
  onClick={async ()=>{
    try {
      setLA(true);
      const r = await api({ mode:'ask', q });
      if (!r.ok) { console.error(r); alert(r.error || 'Error'); return; }
      setHits(r.hits || []);
    } finally { setLA(false); }
  }}
>
  {loadingAsk ? <span className="spinner" aria-hidden="true"></span> : 'Answer'}
</button>
          </div>
          <hr />
          {hits?.length ? hits.map((h,i)=>(
            <div key={i} className="answer">
              {h.p}
              <div className="muted">Source: <a href={'/docs/'+h.source} target="_blank" rel="noreferrer"><code>{h.source}</code></a></div>
            </div>
          )) : <small className="muted">No matches yet.</small>}
        </div></div>

        <div className="col"><div className="card">
          <h3>Tailored cover note</h3>
          <textarea value={jd} onChange={e=>setJd(e.target.value)} placeholder="Paste a job description here..." />
          <div className="btnRow">
            <button
  type="button"
  className="btn primary"
  onClick={async ()=>{
    try {
      setLC(true);
      const r = await api({ mode:'cover', jd });
      if (!r.ok) { console.error(r); alert(r.error || 'Error'); return; }
      setNote(r.note || '');
    } finally { setLC(false); }
  }}
>
  {loadingCover ? <span className="spinner" aria-hidden="true"></span> : 'Generate'}
</button>
          </div>
          {note && (<><hr/><div className="answer">{note}</div></>)}
        </div></div>
      </div>

      <div className="row">
        <div className="col"><div className="card">
          <h3>Case study generator</h3>
          <select value={sel} onChange={e=>setSel(e.target.value)}>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="btnRow">
            <button
  type="button"
  className="btn primary"
  onClick={async ()=>{
    try {
      setLCa(true);
      const r = await api({ mode:'case', project: sel });
      if (!r.ok) { console.error(r); alert(r.error || 'Error'); return; }
      setMd(r.md || '');
    } finally { setLCa(false); }
  }}
>
  {loadingCase ? <span className="spinner" aria-hidden="true"></span> : 'Create'}
</button>
          </div>
          {md && (<><hr/><div className="answer">{md}</div></>)}
        </div></div>

        <div className="col"><div className="card">
          <h3>Sources</h3>
          <ul style={{margin:0,paddingLeft:16}}>
      {projects.map(p => <li key={'p-'+p}><a href={'/docs/'+p} target="_blank" rel="noreferrer"><code>{p}</code></a></li>)}
      {others.map(o => <li key={'o-'+o}><a href={'/docs/'+o} target="_blank" rel="noreferrer"><code>{o}</code></a></li>)}
    </ul>
        </div></div>
      </div>
    </div>
  );
}
