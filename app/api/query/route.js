export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

const STOP = new Set(['the','and','for','with','that','this','from','into','your','you','our','are','was','were','but','not','use','using','have','has','had','can','will','able','about','over','more','than','then','also','been','their','they','them','on','in','to','of','a','an','as','by','at','it','its','or','be','is','am','we','us','what','did','does']);
const strip = (md)=>String(md||'').replace(/^---[\s\S]*?---\s*/, '').trim();
const toks  = (s)=> (String(s).toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(t=>!STOP.has(t));

async function loadManifest(origin){
  try{
    const r = await fetch(`${origin}/docs/manifest.json`, { cache: 'no-store' });
    if(!r.ok) return { ok:false, error:`manifest ${r.status}` };
    const arr = await r.json();
    if(!Array.isArray(arr)) return { ok:false, error:'manifest not array' };
    return { ok:true, files: arr.filter(p=>typeof p==='string') };
  }catch(e){ return { ok:false, error:String(e) }; }
}
async function fetchText(origin, rel){
  const r = await fetch(`${origin}/docs/${rel}`, { cache: 'no-store' });
  if(!r.ok) return '';
  const ct = r.headers.get('content-type')||'';
  return ct.includes('text') ? await r.text() : '';
}

export async function GET(req){ return POST(req); }
export async function POST(req){
  try{
    const url = new URL(req.url);
    const mode = (await req.json().catch(()=>({}))).mode || url.searchParams.get('mode') || 'ask';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const host  = req.headers.get('host');
    const origin = `${proto}://${host}`;

    const man = await loadManifest(origin);
    if(mode==='list'){
      if(!man.ok) return NextResponse.json({ ok:false, error:`No /docs/manifest.json (${man.error})`, projects:[], others:[] });
      const files = man.files;
      const projects = files.filter(p=>p.startsWith('projects/'));
      const others   = files.filter(p=>!p.startsWith('projects/'));
      return NextResponse.json({ ok:true, projects, others });
    }

    if(!man.ok) return NextResponse.json({ ok:false, error:`No /docs/manifest.json (${man.error})`, hits:[], note:'', md:'' });

    if(mode==='ask'){
      const q = (await req.json().catch(()=>({}))).q || url.searchParams.get('q') || '';
      const qTok = toks(q);
      if(!qTok.length) return NextResponse.json({ ok:true, hits: [] });

      const files = man.files.filter(p=>p.endsWith('.md'));
      const texts = await Promise.all(files.map(async p => ({ p, t: strip(await fetchText(origin, p)) })));
      const hits = [];
      for(const {p,t} of texts){
        for(const para of t.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean)){
          const s = qTok.reduce((acc,k)=> acc + (para.toLowerCase().includes(k)?1:0), 0);
          if(s>0) hits.push({ score:s, p:para, source:p });
        }
      }
      hits.sort((a,b)=>b.score-a.score);
      return NextResponse.json({ ok:true, hits: hits.slice(0,8) });
    }

    if(mode==='cover'){
      const jd = (await req.json().catch(()=>({}))).jd || '';
      const kws = toks(jd);
      const freq = new Map(); kws.forEach(t=>freq.set(t,(freq.get(t)||0)+1));
      const top = Array.from(new Set(kws)).sort((a,b)=>(freq.get(b)||0)-(freq.get(a)||0)).slice(0,25);

      const files = man.files.filter(p=>p.startsWith('projects/') && p.endsWith('.md'));
      const texts = await Promise.all(files.map(async p => ({ p, t: (await fetchText(origin,p)).toLowerCase() })));
      const scored = texts.map(x=>({ score: top.reduce((s,k)=> s + (x.t.includes(k)?1:0),0), p:x.p }))
                          .sort((a,b)=>b.score-a.score).slice(0,2);
      const projNames = scored.map(s=>s.p.replace(/^projects\/|\.md$/g,'').replace(/[-_]/g,' ')).join(', ') || 'HSBC Payments, Mercedes-Benz IA';

      const bio114 = await fetchText(origin, 'bio/bio_114.md');
      const bio48  = await fetchText(origin, 'bio/bio_48.md');
      const bio    = strip(bio114) || strip(bio48);

      const bullets = top.slice(0,3).map(r=>`- ${r} → evidence in ${projNames}`).join('\n') ||
        `- Enterprise UX → HSBC corporate payments\n- IA & research → Mercedes-Benz IA\n- Prototyping & testing → JEWZY / La Casa Shambala`;

      const note = [
        `Hi — I’m Ed Birchmore, a senior UX consultant/architect with 27+ years across enterprise, finance, media and travel.`,
        `Here’s why I’m a fit:`,
        ``,
        bullets, ``,
        `Selected work: ${projNames}`,
        `Availability: contract or perm (flexible)`,
        ``,
        `Short bio: ${(bio||'').slice(0,260)}…`
      ].join('\n');

      return NextResponse.json({ ok:true, note });
    }

    if(mode==='case'){
      const project = (await req.json().catch(()=>({}))).project || url.searchParams.get('project') || '';
      if(!project) return NextResponse.json({ ok:false, error:'No project provided' });
      const md = strip(await fetchText(origin, project));
      if(!md) return NextResponse.json({ ok:false, error:'Not found' });

      const lines = md.split('\n');
      const find = (label) => {
        const re = new RegExp(`^(#+\\s*)?(${label})\\b`, 'i');
        let s=-1,e=lines.length; for(let i=0;i<lines.length;i++){ if(re.test(lines[i])){ s=i+1; break; } }
        if (s<0) return '';
        for(let i=s;i<lines.length;i++){ if(/^#+\s/.test(lines[i])){ e=i; break; } }
        return lines.slice(s,e).join('\n').trim();
      };
      const context = find('the\\s+brief');
      const role    = find('my\\s+role');
      const results = find('major\\s+accomplishments|challenges?\\s*&?\\s*results?');

      const caseMd = `# ${project.replace(/^projects\\//,'').replace(/\\.md$/,'').replace(/[-_]/g,' ')}

**Context**  
${context || '—'}

**Goal**  
${(context.split('. ')[0] || '—')}

**Approach**  
${role || '—'}

**Results**  
${results || '—'}

**Your role**  
${role || '—'}
`;
      return NextResponse.json({ ok:true, md: caseMd });
    }

    return NextResponse.json({ ok:false, error:'Unknown mode' });
  }catch(e){
    return NextResponse.json({ ok:false, error:String(e) });
  }
}
