/* GATE-style test engine — MCQ (−⅓ / −⅔), MSQ and NAT (no negative), timer, palette, resume, result analysis.
   Shared by every subject page and by mock-gate-2027.html. Question data lives in bank-<subject>.js. */
(function(){
'use strict';
var ORDER=['ga','em','discrete-math','dl','coa','pds','alg','os','toc','cn','dbms','cd'];
var STORE_ACTIVE='gt:active', STORE_HIST='gt:hist';
var MIN_PER_MARK=1.8;                       // 180 minutes for 100 marks, as in GATE
var FULL_QUOTA={'ga':[5,5],'em':[1,2],'discrete-math':[2,3],'dl':[2,2],'coa':[3,3],'pds':[3,3],'alg':[3,3],'os':[3,3],'toc':[2,3],'cn':[2,3],'dbms':[2,3],'cd':[2,2]}; // [1-mark, 2-mark]

/* ---------- small helpers ---------- */
function $(s,r){return (r||document).querySelector(s);}
function el(tag,cls,html){var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function fmtMarks(x){var r=Math.round(x*100)/100,neg=r<0;r=Math.abs(r);var t=(r%1===0)?String(r):r.toFixed(2);return neg?'\u2212'+t:t;}
function fmtTime(s){s=Math.max(0,Math.round(s));var h=Math.floor(s/3600),m=Math.floor(s%3600/60),c=s%60;return (h?h+':':'')+(h&&m<10?'0':'')+m+':'+(c<10?'0':'')+c;}
function load(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function drop(k){try{localStorage.removeItem(k);}catch(e){}}
function base(){var s=document.currentScript||document.querySelector('script[src*="gate-test.js"]'); if(!s||!s.src) return ''; return s.src.replace(/gate-test\.js.*$/,'');}
var BASE=base();

/* ---------- bank loading ---------- */
function loadSubject(key){
  return new Promise(function(res,rej){
    window.GATE_BANK=window.GATE_BANK||{};
    if(window.GATE_BANK[key]) return res(window.GATE_BANK[key]);
    var s=document.createElement('script'); s.src=BASE+'bank-'+key+'.js';
    s.onload=function(){ window.GATE_BANK[key]?res(window.GATE_BANK[key]):rej(new Error('bank '+key)); };
    s.onerror=function(){rej(new Error('Could not load questions for '+key+'. Open the app once while online so it can be saved for offline use.'));};
    document.head.appendChild(s);
  });
}
function loadMany(keys){return Promise.all(keys.map(loadSubject));}

/* ---------- question model ---------- */
function mk(b,type,idx){
  var it, q={subj:b.key,sname:b.short,type:type,idx:idx};
  if(type==='MCQ'){it=b.Q[idx];q.topic=it[0];q.stem=it[1];q.opts=it[2];q.ans=it[3];q.exp=it[4];q.marks=it[5];q.id=b.key+':Q'+idx;}
  else if(type==='MSQ'){it=b.MSQ[idx];q.topic=it[0];q.stem=it[1];q.opts=it[2];q.ans=it[3];q.exp=it[4];q.marks=it[5];q.id=b.key+':M'+idx;}
  else {it=b.NAT[idx];q.topic=it.t;q.stem=it.q;q.ans=it.a;q.tol=it.tol;q.unit=it.u;q.exp=it.e;q.marks=it.m;q.src=it.src;q.id=b.key+':N'+idx;}
  q.tlabel=(b.topics&&b.topics[q.topic])||q.topic;
  return q;
}
function fromId(id){
  var m=/^([^:]+):([QMN])(\d+)$/.exec(id); if(!m) return null;
  var b=window.GATE_BANK&&window.GATE_BANK[m[1]]; if(!b) return null;
  return mk(b,{Q:'MCQ',M:'MSQ',N:'NAT'}[m[2]],+m[3]);
}
function negFor(q){return q.type==='MCQ'?q.marks/3:0;}
function natParse(t){
  t=String(t==null?'':t).trim().replace(/,/g,'').replace(/−/g,'-'); if(!t) return null;
  var f=/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(t); if(f&&+f[2]!==0) return +f[1]/+f[2];
  if(!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
  return parseFloat(t);
}
/* result of a response: {state:'unattempted'|'correct'|'wrong', marks:number} */
function grade(q,r){
  if(q.type==='MCQ'){
    if(r==null) return {state:'unattempted',marks:0};
    return r===q.ans?{state:'correct',marks:q.marks}:{state:'wrong',marks:-negFor(q)};
  }
  if(q.type==='MSQ'){
    if(!r||!r.length) return {state:'unattempted',marks:0};
    var num=function(x,y){return x-y;};
    var a=q.ans.slice().sort(num).join(','), b=r.slice().sort(num).join(',');
    return a===b?{state:'correct',marks:q.marks}:{state:'wrong',marks:0};
  }
  var v=natParse(r); if(v===null) return {state:'unattempted',marks:0};
  if(isNaN(v)) return {state:'wrong',marks:0};
  return Math.abs(v-q.ans)<=q.tol+1e-9?{state:'correct',marks:q.marks}:{state:'wrong',marks:0};
}
function answerText(q){
  if(q.type==='MCQ') return String.fromCharCode(65+q.ans)+'. '+q.opts[q.ans];
  if(q.type==='MSQ') return q.ans.slice().sort(function(a,b){return a-b;}).map(function(i){return String.fromCharCode(65+i)+'. '+q.opts[i];}).join('<br>');
  return esc(String(q.ans))+(q.tol?' (accepted ±'+q.tol+')':'')+(q.unit?' '+esc(q.unit):'');
}
function givenText(q,r){
  if(q.type==='MCQ') return r==null?'—':String.fromCharCode(65+r)+'. '+q.opts[r];
  if(q.type==='MSQ') return (!r||!r.length)?'—':r.slice().sort(function(a,b){return a-b;}).map(function(i){return String.fromCharCode(65+i)+'. '+q.opts[i];}).join('<br>');
  return (r==null||String(r).trim()==='')?'—':esc(String(r));
}

/* ---------- composing a paper ---------- */
function compose(b,n1,n2,topic,opt){
  var pools={MCQ:{1:[],2:[]},MSQ:{1:[],2:[]},NAT:{1:[],2:[]}};
  b.Q.forEach(function(x,i){if(!topic||x[0]===topic)pools.MCQ[x[5]].push(['MCQ',i]);});
  b.MSQ.forEach(function(x,i){if(!topic||x[0]===topic)pools.MSQ[x[5]].push(['MSQ',i]);});
  b.NAT.forEach(function(x,i){if(!topic||x.t===topic)pools.NAT[x.m].push(['NAT',i,x.src]);});
  Object.keys(pools).forEach(function(t){[1,2].forEach(function(m){pools[t][m]=shuffle(pools[t][m]);});});
  var N=n1+n2, natT=Math.max(1,Math.round(N*0.25)), msqT=(opt&&opt.msq!=null)?opt.msq:(N>=12?1:0);
  var slots=shuffle([].concat(Array(n1).fill(1),Array(n2).fill(2)));
  var types=shuffle([].concat(Array(Math.min(natT,N)).fill('NAT'),Array(Math.min(msqT,Math.max(0,N-natT))).fill('MSQ')));
  while(types.length<N) types.push('MCQ'); types=shuffle(types);
  var usedQ={}, usedN={}, out=[];
  function take(type,m){
    var p=pools[type][m];
    while(p.length){
      var c=p.shift();
      if(type==='MCQ'&&usedQ[c[1]]) continue;
      if(type==='NAT'&&c[2]!=null&&usedQ[c[2]]) continue;
      if(type==='MCQ') usedQ[c[1]]=1; if(type==='NAT'&&c[2]!=null) usedQ[c[2]]=1;
      return mk(b,type,c[1]);
    }
    return null;
  }
  for(var i=0;i<N;i++){
    var m=slots[i], t=types[i], q=take(t,m);
    if(!q) q=take('MCQ',m)||take('NAT',m)||take('MCQ',m===1?2:1)||take('NAT',m===1?2:1);
    if(q) out.push(q);
  }
  return out;
}
function composeFull(){
  var all=[];
  ORDER.forEach(function(k){
    var qt=FULL_QUOTA[k], b=window.GATE_BANK[k];
    all=all.concat(compose(b,qt[0],qt[1],null,{msq:k==='ga'?2:((qt[0]+qt[1])>=5?1:0)}));
  });
  return all;
}

/* ---------- styles ---------- */
var CSS=[
'.gt-lock{overflow:hidden!important}',
'.gt-ov{position:fixed;inset:0;z-index:99990;background:var(--bg,#0b0e14);color:var(--text,#e6e9f0);display:flex;flex-direction:column;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}',
'.gt-ov *{box-sizing:border-box}',
'.gt-top{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border,#242b3a);background:var(--panel,#12161f)}',
'.gt-title{flex:1;min-width:0;font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.gt-title small{display:block;font-weight:500;color:var(--muted,#93a0b8);font-size:11.5px}',
'.gt-timer{font-variant-numeric:tabular-nums;font-weight:800;font-size:19px;padding:5px 12px;border-radius:10px;background:var(--panel2,#181d29);border:1px solid var(--border,#242b3a);min-width:84px;text-align:center}',
'.gt-timer.warn{color:#ffc978;border-color:#ffb45499}.gt-timer.crit{color:#ff8b8b;border-color:#ff6b6b99;animation:gtp 1s infinite}',
'@keyframes gtp{50%{opacity:.55}}@media (prefers-reduced-motion:reduce){.gt-timer.crit{animation:none}}',
'.gt-ib{border:1px solid var(--border,#242b3a);background:var(--panel2,#181d29);color:var(--text,#e6e9f0);border-radius:10px;padding:8px 11px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}',
'.gt-ib:hover,.gt-ib:focus-visible{border-color:var(--accent2,#7c9fff);outline:none}',
'.gt-ib.pri{background:var(--accent,#5ee6c8);border-color:var(--accent,#5ee6c8);color:#062019}',
'.gt-ib.pur{border-color:#b58cff99;color:#d4bcff}',
'.gt-ib.red{border-color:#ff6b6b88;color:#ff9b9b}',
'.gt-ib[disabled]{opacity:.45;cursor:default}',
'.gt-body{flex:1;overflow:auto;-webkit-overflow-scrolling:touch}',
'.gt-wrap{max-width:820px;margin:0 auto;padding:16px 16px 28px}',
'.gt-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;font-size:12.5px;color:var(--muted,#93a0b8)}',
'.gt-qn{font-weight:800;color:var(--text,#e6e9f0);font-size:14px;margin-right:4px}',
'.gt-chip{border:1px solid var(--border,#242b3a);border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;background:var(--panel2,#181d29)}',
'.gt-chip.t-MCQ{color:#9fb6ff}.gt-chip.t-MSQ{color:#d4bcff}.gt-chip.t-NAT{color:#7ee787}',
'.gt-chip.neg{color:#ff9b9b}',
'.gt-stem{font-size:16.5px;line-height:1.65;margin:4px 0 16px;white-space:pre-wrap;overflow-wrap:anywhere}',
'.gt-opt{display:flex;gap:11px;align-items:flex-start;padding:12px 13px;margin:9px 0;border:1px solid var(--border,#242b3a);border-radius:12px;background:var(--panel,#12161f);cursor:pointer}',
'.gt-opt:hover{border-color:var(--accent2,#7c9fff)}.gt-opt.sel{border-color:var(--accent,#5ee6c8);background:#5ee6c814}',
'.gt-opt input{margin-top:4px;accent-color:#5ee6c8;flex:none}',
'.gt-opt .l{font-weight:800;color:var(--muted,#93a0b8);flex:none;width:18px}',
'.gt-opt .tx{overflow-wrap:anywhere}',
'.gt-nat{display:block;width:100%;max-width:340px;font-size:22px;padding:12px 14px;border-radius:12px;border:1px solid var(--border,#242b3a);background:var(--panel,#12161f);color:var(--text,#e6e9f0);font-family:inherit;font-variant-numeric:tabular-nums}',
'.gt-nat:focus{outline:2px solid var(--accent,#5ee6c8);outline-offset:1px}',
'.gt-hint{font-size:12.5px;color:var(--muted,#93a0b8);margin-top:8px}',
'.gt-foot{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;border-top:1px solid var(--border,#242b3a);background:var(--panel,#12161f)}',
'.gt-foot .gt-ib{flex:1 1 auto}',
'.gt-pal{position:fixed;inset:0;z-index:99995;background:#000a;display:flex;align-items:flex-end;justify-content:center}',
'.gt-sheet{width:100%;max-width:640px;max-height:84%;overflow:auto;background:var(--panel,#12161f);border:1px solid var(--border,#242b3a);border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px))}',
'.gt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(42px,1fr));gap:7px;margin:8px 0 12px}',
'.gt-n{height:42px;border-radius:9px;border:1px solid var(--border,#242b3a);background:var(--panel2,#181d29);color:var(--text,#e6e9f0);font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;position:relative}',
'.gt-n.nv{color:var(--muted,#93a0b8)}.gt-n.na{background:#ff6b6b26;border-color:#ff6b6b88}.gt-n.a{background:#7ee78730;border-color:#7ee787aa}.gt-n.m{background:#b58cff30;border-color:#b58cffaa;border-radius:50%}.gt-n.am{background:#b58cff30;border-color:#b58cffaa;border-radius:50%}.gt-n.am:after{content:"";position:absolute;right:2px;bottom:2px;width:9px;height:9px;border-radius:50%;background:#7ee787;border:1px solid #0b0e14}',
'.gt-n.cur{outline:2px solid var(--accent,#5ee6c8);outline-offset:1px}',
'.gt-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--muted,#93a0b8);margin:6px 0 10px}',
'.gt-leg i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-right:5px;vertical-align:-2px;border:1px solid}',
'.gt-sh{font-size:12px;font-weight:800;color:var(--muted,#93a0b8);margin:12px 0 2px}',
'.gt-dlg{position:fixed;inset:0;z-index:99998;background:#000b;display:flex;align-items:center;justify-content:center;padding:18px}',
'.gt-card{background:var(--panel,#12161f);border:1px solid var(--border,#242b3a);border-radius:16px;padding:20px;max-width:460px;width:100%}',
'.gt-card h3{margin:0 0 8px;font-size:18px}.gt-card p{margin:6px 0;color:#c9d1e0;font-size:14px}',
'.gt-row{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}.gt-row .gt-ib{flex:1}',
'.gt-sum{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0}.gt-sum div{background:var(--panel2,#181d29);border:1px solid var(--border,#242b3a);border-radius:10px;padding:8px 10px;font-size:12.5px;color:var(--muted,#93a0b8)}.gt-sum b{display:block;font-size:20px;color:var(--text,#e6e9f0)}',
/* result */
'.gt-hero{padding:18px;border:1px solid var(--border,#242b3a);border-radius:16px;background:linear-gradient(135deg,var(--panel,#12161f),var(--panel2,#181d29));margin-bottom:14px}',
'.gt-score{font-size:44px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}.gt-score small{font-size:18px;font-weight:600;color:var(--muted,#93a0b8);margin-left:6px}',
'.gt-pct{margin-top:6px;color:var(--muted,#93a0b8);font-size:13.5px}',
'.gt-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px;margin:14px 0 0}',
'.gt-kpis div{background:#00000026;border:1px solid var(--border,#242b3a);border-radius:10px;padding:8px 10px;font-size:12px;color:var(--muted,#93a0b8)}.gt-kpis b{display:block;font-size:19px;color:var(--text,#e6e9f0);font-variant-numeric:tabular-nums}',
'.gt-kpis .g b{color:#7ee787}.gt-kpis .r b{color:#ff9b9b}',
'.gt-h{font-size:13px;font-weight:800;margin:20px 0 8px;color:var(--accent,#5ee6c8)}',
'.gt-ov table.gt-tbl{display:table!important;width:100%;max-width:none;border-collapse:collapse;font-size:13px;overflow:visible}.gt-ov .gt-tbl th{background:transparent!important;color:var(--muted,#93a0b8)!important;border-color:var(--border,#242b3a)!important}.gt-ov .gt-tbl td{background:transparent!important;border-color:var(--border,#242b3a)!important}.gt-ov .gt-tbl{font-size:13px}.gt-tbl th,.gt-tbl td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--border,#242b3a);font-variant-numeric:tabular-nums}.gt-tbl th{color:var(--muted,#93a0b8);font-weight:700;font-size:12px}.gt-tbl td.n,.gt-tbl th.n{text-align:right;white-space:nowrap}',
'.gt-bar{height:8px;border-radius:99px;background:#ffffff14;overflow:hidden;min-width:60px}.gt-bar i{display:block;height:100%;border-radius:99px}',
'.gt-rec{margin:12px 0;padding:12px 14px;border-left:3px solid var(--accent2,#7c9fff);background:#00000022;border-radius:0 10px 10px 0;font-size:13.5px;color:#c9d1e0}.gt-rec a{color:var(--accent,#5ee6c8);font-weight:700;text-decoration:none}.gt-rec a:hover{text-decoration:underline}.gt-rec div{margin:4px 0}',
'.gt-filt{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px}.gt-filt button{border:1px solid var(--border,#242b3a);background:var(--panel2,#181d29);color:var(--muted,#93a0b8);border-radius:9px;padding:6px 11px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit}.gt-filt button.on{background:var(--accent,#5ee6c8);color:#062019;border-color:var(--accent,#5ee6c8)}',
'.gt-rv{border:1px solid var(--border,#242b3a);border-radius:12px;padding:13px 14px;margin:10px 0;background:var(--panel,#12161f)}',
'.gt-rv.correct{border-left:4px solid #7ee787}.gt-rv.wrong{border-left:4px solid #ff6b6b}.gt-rv.unattempted{border-left:4px solid #6b7690}',
'.gt-rv .hd{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--muted,#93a0b8);margin-bottom:6px}',
'.gt-rv .sc{margin-left:auto;font-weight:800;font-variant-numeric:tabular-nums}.gt-rv .sc.p{color:#7ee787}.gt-rv .sc.n{color:#ff9b9b}',
'.gt-rv .st{white-space:pre-wrap;margin:4px 0 8px;overflow-wrap:anywhere}',
'.gt-rv .kv{font-size:13px;margin:4px 0;color:#c9d1e0}.gt-rv .kv span{color:var(--muted,#93a0b8);display:inline-block;min-width:92px;vertical-align:top}.gt-rv .kv div{display:inline-block}',
'.gt-rv .ex{margin-top:8px;padding-top:8px;border-top:1px dashed var(--border,#242b3a);font-size:13px;color:#c9d1e0}',
/* launcher */
'.gt-launch{margin:14px 0 18px;padding:16px;border:1px solid var(--border,#242b3a);border-radius:14px;background:linear-gradient(135deg,var(--panel,#12161f),var(--panel2,#181d29))}',
'.gt-launch h3{margin:0 0 4px;font-size:16px;color:var(--text,#e6e9f0)}.gt-launch p{margin:0 0 10px;font-size:13px;color:var(--muted,#93a0b8)}',
'.gt-fields{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}.gt-fields label{display:flex;flex-direction:column;gap:4px;font-size:11.5px;font-weight:700;color:var(--muted,#93a0b8)}',
'.gt-fields select{background:var(--panel2,#181d29);color:var(--text,#e6e9f0);border:1px solid var(--border,#242b3a);border-radius:9px;padding:8px 10px;font-size:13px;font-family:inherit;max-width:100%}',
'.gt-hist{margin-top:12px;font-size:12.5px;color:var(--muted,#93a0b8)}.gt-hist b{color:var(--text,#e6e9f0)}',
'.gt-scheme{font-size:12px;color:var(--muted,#93a0b8);margin-top:10px;line-height:1.5}',
'@media print{.gt-ov{position:static}}'
].join('\n');
function injectCSS(){ if(document.getElementById('gt-css')) return; var s=document.createElement('style'); s.id='gt-css'; s.textContent=CSS; document.head.appendChild(s); }

/* ---------- the exam session ---------- */
var S=null, OV=null, tick=null;

function newSession(cfg,qs){
  var now=Date.now();
  S={cfg:cfg,qids:qs.map(function(q){return q.id;}),qs:qs,resp:qs.map(function(){return null;}),st:qs.map(function(){return 'nv';}),
     marked:qs.map(function(){return false;}),times:qs.map(function(){return 0;}),
     total:qs.reduce(function(a,q){return a+q.marks;},0),cur:0,
     startedAt:now,endAt:now+cfg.minutes*60000,paused:false,pausedLeft:0,enter:now,done:false};
  S.st[0]='na'; persist();
}
function persist(){
  if(!S||S.done) return;
  save(STORE_ACTIVE,{cfg:S.cfg,qids:S.qids,resp:S.resp,st:S.st,marked:S.marked,times:S.times,cur:S.cur,startedAt:S.startedAt,endAt:S.endAt,paused:S.paused,pausedLeft:S.pausedLeft});
}
function resumeFromStore(){
  var a=load(STORE_ACTIVE,null); if(!a) return Promise.resolve(false);
  var keys={}; a.qids.forEach(function(id){keys[id.split(':')[0]]=1;});
  return loadMany(Object.keys(keys)).then(function(){
    var qs=a.qids.map(fromId); if(qs.some(function(q){return !q;})){drop(STORE_ACTIVE);return false;}
    S={cfg:a.cfg,qids:a.qids,qs:qs,resp:a.resp,st:a.st,marked:a.marked,times:a.times,cur:a.cur,startedAt:a.startedAt,endAt:a.endAt,
       paused:a.paused,pausedLeft:a.pausedLeft,total:qs.reduce(function(x,q){return x+q.marks;},0),enter:Date.now(),done:false};
    if(!S.paused && Date.now()>=S.endAt){ openOverlay(); submit(true); return true; }
    openOverlay(); renderQ(); startTick(); return true;
  }).catch(function(){return false;});
}
function hasActive(){var a=load(STORE_ACTIVE,null);return a&&a.qids&&a.qids.length?a:null;}

function remaining(){ return S.paused?S.pausedLeft:Math.max(0,S.endAt-Date.now()); }
function startTick(){
  stopTick();
  tick=setInterval(function(){
    if(!S||S.done) return stopTick();
    var r=remaining(), t=$('.gt-timer',OV); if(t){
      t.textContent=fmtTime(r/1000);
      var frac=r/(S.cfg.minutes*60000);
      t.className='gt-timer'+(frac<0.05?' crit':frac<0.15?' warn':'');
    }
    if(!S.paused && r<=0){ stopTick(); submit(true); }
  },250);
}
function stopTick(){ if(tick){clearInterval(tick);tick=null;} }
function bank(k){return window.GATE_BANK[k];}

function openOverlay(){
  injectCSS(); closeOverlay(true);
  OV=el('div','gt-ov'); OV.setAttribute('role','dialog'); OV.setAttribute('aria-modal','true'); OV.setAttribute('aria-label','GATE-style test');
  document.body.appendChild(OV); document.documentElement.classList.add('gt-lock');
}
function closeOverlay(keepLock){ if(OV&&OV.parentNode) OV.parentNode.removeChild(OV); OV=null; if(!keepLock) document.documentElement.classList.remove('gt-lock'); }

function visit(i){ // accumulate time on the question being left
  var now=Date.now(); if(!S.paused) S.times[S.cur]+=(now-S.enter)/1000; S.enter=now;
}
function go(i){
  if(i<0||i>=S.qs.length) return; captureNat(); visit();
  S.cur=i; if(S.st[i]==='nv') S.st[i]='na'; persist(); renderQ();
}
function answered(i){
  var q=S.qs[i], r=S.resp[i];
  if(q.type==='MCQ') return r!=null;
  if(q.type==='MSQ') return !!(r&&r.length);
  return r!=null&&String(r).trim()!=='';
}
function refreshStatus(i){
  var a=answered(i), m=S.marked[i];
  S.st[i]=a?(m?'am':'a'):(m?'m':(S.st[i]==='nv'?'nv':'na'));
}
function captureNat(){
  var inp=$('.gt-nat',OV); if(!inp||!S) return; var i=S.cur;
  if(S.qs[i].type!=='NAT') return;
  var v=inp.value; S.resp[i]=(v.trim()==='')?null:v; refreshStatus(i);
}

function renderTop(){
  var title=S.cfg.title, sub=S.cfg.sub||'';
  return '<div class="gt-top"><button class="gt-ib red" id="gtQuit" aria-label="Exit test">✕</button>'+
    '<div class="gt-title">'+esc(title)+'<small>'+esc(sub)+'</small></div>'+
    '<div class="gt-timer" id="gtTimer">'+fmtTime(remaining()/1000)+'</div>'+
    '<button class="gt-ib" id="gtPause" aria-label="Pause the clock"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style="display:block"><rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor"/></svg></button>'+
    '<button class="gt-ib pri" id="gtPal">☰ Q</button></div>';
}
function renderQ(){
  var q=S.qs[S.cur], i=S.cur, r=S.resp[i];
  var h=renderTop()+'<div class="gt-body" id="gtBody"><div class="gt-wrap">';
  h+='<div class="gt-meta"><span class="gt-qn">Q'+(i+1)+' <span style="color:var(--muted,#93a0b8);font-weight:600">of '+S.qs.length+'</span></span>'+
     '<span class="gt-chip t-'+q.type+'">'+(q.type==='MSQ'?'MSQ · select all':q.type==='NAT'?'NAT · numerical':'MCQ')+'</span>'+
     '<span class="gt-chip">+'+q.marks+' mark'+(q.marks>1?'s':'')+'</span>'+
     (q.type==='MCQ'?'<span class="gt-chip neg">−'+fmtMarks(negFor(q))+' if wrong</span>':'<span class="gt-chip">no negative</span>')+
     '<span class="gt-chip">'+esc(q.sname)+' · '+esc(q.tlabel)+'</span></div>';
  h+='<div class="gt-stem">'+q.stem+'</div>';
  if(q.type==='MCQ'){
    q.opts.forEach(function(o,k){h+='<label class="gt-opt'+(r===k?' sel':'')+'"><input type="radio" name="gto" value="'+k+'"'+(r===k?' checked':'')+'><span class="l">'+String.fromCharCode(65+k)+'</span><span class="tx">'+o+'</span></label>';});
  } else if(q.type==='MSQ'){
    q.opts.forEach(function(o,k){var on=r&&r.indexOf(k)>-1;h+='<label class="gt-opt'+(on?' sel':'')+'"><input type="checkbox" name="gto" value="'+k+'"'+(on?' checked':'')+'><span class="l">'+String.fromCharCode(65+k)+'</span><span class="tx">'+o+'</span></label>';});
    h+='<div class="gt-hint">All-or-nothing: you must pick exactly the correct set. No negative marking.</div>';
  } else {
    h+='<input class="gt-nat" id="gtNat" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer" value="'+esc(r==null?'':r)+'" aria-label="Numerical answer">'+
       '<div class="gt-hint">Enter a number'+(q.unit?' in '+esc(q.unit):'')+'. Use a decimal point, not a comma. No negative marking.</div>';
  }
  h+='</div></div>';
  h+='<div class="gt-foot"><button class="gt-ib" id="gtPrev"'+(i===0?' disabled':'')+'>‹ Prev</button>'+
     '<button class="gt-ib pur" id="gtMark">Mark for review &amp; next</button>'+
     '<button class="gt-ib" id="gtClear">Clear</button>'+
     '<button class="gt-ib pri" id="gtSave">'+(i===S.qs.length-1?'Save':'Save &amp; next')+(i===S.qs.length-1?'':' ›')+'</button></div>';
  OV.innerHTML=h;
  bindQ();
}
function bindQ(){
  var q=S.qs[S.cur], i=S.cur;
  $('#gtQuit',OV).onclick=quitDialog;
  $('#gtPal',OV).onclick=openPalette;
  $('#gtPause',OV).onclick=togglePause;
  $('#gtPrev',OV).onclick=function(){go(i-1);};
  $('#gtSave',OV).onclick=function(){captureNat();refreshStatus(i);persist(); if(i<S.qs.length-1) go(i+1); else {renderQ(); openPalette();}};
  $('#gtMark',OV).onclick=function(){captureNat();S.marked[i]=true;refreshStatus(i);persist(); if(i<S.qs.length-1) go(i+1); else {renderQ(); openPalette();}};
  $('#gtClear',OV).onclick=function(){S.resp[i]=null;S.marked[i]=false;refreshStatus(i);persist();renderQ();};
  if(q.type==='MCQ'){
    OV.querySelectorAll('input[name=gto]').forEach(function(inp){inp.onchange=function(){S.resp[i]=+inp.value;refreshStatus(i);persist();
      OV.querySelectorAll('.gt-opt').forEach(function(l){l.classList.toggle('sel',l.contains(inp)&&inp.checked);});};});
  } else if(q.type==='MSQ'){
    OV.querySelectorAll('input[name=gto]').forEach(function(inp){inp.onchange=function(){
      var a=[]; OV.querySelectorAll('input[name=gto]').forEach(function(x,k){if(x.checked)a.push(k);});
      S.resp[i]=a.length?a:null;refreshStatus(i);persist();
      OV.querySelectorAll('.gt-opt').forEach(function(l){l.classList.toggle('sel',l.querySelector('input').checked);});};});
  } else {
    var n=$('#gtNat',OV); n.oninput=function(){var v=n.value; S.resp[i]=v.trim()===''?null:v; refreshStatus(i); persist();};
  }
  var t=$('#gtTimer',OV); var r=remaining(); var frac=r/(S.cfg.minutes*60000); t.className='gt-timer'+(frac<0.05?' crit':frac<0.15?' warn':'');
  if(S.paused) showPause();
}
function counts(){
  var c={a:0,na:0,m:0,am:0,nv:0};
  S.st.forEach(function(s){c[s]++;}); return c;
}
function openPalette(){
  captureNat();
  var c=counts(), h='<div class="gt-pal" id="gtPalWrap"><div class="gt-sheet"><div style="display:flex;align-items:center;gap:10px"><b style="flex:1;font-size:16px">Question palette</b><button class="gt-ib" id="gtPalClose">Close</button></div>';
  h+='<div class="gt-leg"><span><i style="background:#7ee78730;border-color:#7ee787aa"></i>Answered '+(c.a)+'</span><span><i style="background:#ff6b6b26;border-color:#ff6b6b88"></i>Not answered '+c.na+'</span><span><i style="background:#b58cff30;border-color:#b58cffaa;border-radius:50%"></i>Marked '+(c.m)+'</span><span><i style="background:#b58cff30;border-color:#b58cffaa;border-radius:50%"></i>Answered + marked '+c.am+'</span><span><i style="border-color:var(--border,#242b3a)"></i>Not visited '+c.nv+'</span></div>';
  var lastSubj=null, group=S.cfg.mode==='full';
  h+='<div class="gt-grid">';
  S.qs.forEach(function(q,i){
    if(group&&q.subj!==lastSubj){ h+='</div><div class="gt-sh">'+esc(bank(q.subj).name)+'</div><div class="gt-grid">'; lastSubj=q.subj; }
    h+='<button class="gt-n '+S.st[i]+(i===S.cur?' cur':'')+'" data-i="'+i+'" aria-label="Question '+(i+1)+'">'+(i+1)+'</button>';
  });
  h+='</div><div class="gt-row"><button class="gt-ib pri" id="gtSubmit">Submit test</button></div></div></div>';
  var w=el('div',null,h); var node=w.firstChild; OV.appendChild(node);
  node.onclick=function(e){ if(e.target===node) node.remove(); };
  $('#gtPalClose',node).onclick=function(){node.remove();};
  node.querySelectorAll('.gt-n').forEach(function(b){b.onclick=function(){node.remove();go(+b.getAttribute('data-i'));};});
  $('#gtSubmit',node).onclick=function(){node.remove();confirmSubmit();};
}
function dialog(html){ var d=el('div','gt-dlg',''); d.innerHTML='<div class="gt-card">'+html+'</div>'; OV.appendChild(d); return d; }
function confirmSubmit(){
  captureNat(); persist();
  var c=counts(), ans=c.a+c.am, left=S.qs.length-ans;
  var d=dialog('<h3>Submit the test?</h3><div class="gt-sum"><div><b>'+ans+'</b>Answered</div><div><b>'+left+'</b>Not answered</div><div><b>'+(c.m+c.am)+'</b>Marked for review</div><div><b>'+fmtTime(remaining()/1000)+'</b>Time left</div></div><p>You cannot change answers after submitting.</p><div class="gt-row"><button class="gt-ib" id="gtNo">Keep working</button><button class="gt-ib pri" id="gtYes">Submit</button></div>');
  $('#gtNo',d).onclick=function(){d.remove();}; $('#gtYes',d).onclick=function(){d.remove();submit(false);};
}
function quitDialog(){
  captureNat(); persist();
  var d=dialog('<h3>Leave this test?</h3><p>Your progress is saved on this device and the clock keeps running unless you pause first. You can resume from the launcher.</p><div class="gt-row"><button class="gt-ib" id="gtStay">Stay</button><button class="gt-ib" id="gtLeave">Leave &amp; resume later</button><button class="gt-ib red" id="gtAbandon">Discard test</button></div>');
  $('#gtStay',d).onclick=function(){d.remove();};
  $('#gtLeave',d).onclick=function(){d.remove(); visit(); persist(); if(!S.paused){S.paused=true;S.pausedLeft=Math.max(0,S.endAt-Date.now());persist();} stopTick(); closeOverlay(); S=null; if(window.GateTest&&GateTest.onChange) GateTest.onChange();};
  $('#gtAbandon',d).onclick=function(){d.remove();stopTick();drop(STORE_ACTIVE);closeOverlay();S=null; if(window.GateTest&&GateTest.onChange) GateTest.onChange();};
}
function togglePause(){
  captureNat(); visit();
  if(S.paused){ S.paused=false; S.endAt=Date.now()+S.pausedLeft; S.enter=Date.now(); persist(); var p=$('.gt-pause',OV); if(p)p.remove(); }
  else { S.paused=true; S.pausedLeft=Math.max(0,S.endAt-Date.now()); persist(); showPause(); }
}
function showPause(){
  if($('.gt-pause',OV)) return;
  var d=el('div','gt-dlg gt-pause','<div class="gt-card"><h3>Test paused</h3><p>The clock is stopped and the question is hidden. In the real exam there is no pause, so use it only for real interruptions.</p><div class="gt-row"><button class="gt-ib pri" id="gtResume">Resume</button></div></div>');
  OV.appendChild(d); $('#gtResume',d).onclick=function(){d.remove();S.paused=false;S.endAt=Date.now()+S.pausedLeft;S.enter=Date.now();persist();};
}

/* ---------- submit & result ---------- */
function submit(auto){
  captureNat(); visit(); stopTick(); S.done=true; drop(STORE_ACTIVE);
  var res=S.qs.map(function(q,i){var g=grade(q,S.resp[i]);g.q=q;g.r=S.resp[i];g.t=S.times[i];g.marked=S.marked[i];return g;});
  var score=0,pos=0,neg=0,corr=0,wrong=0,un=0;
  res.forEach(function(g){score+=g.marks; if(g.marks>0)pos+=g.marks; if(g.marks<0)neg+=g.marks; if(g.state==='correct')corr++; else if(g.state==='wrong')wrong++; else un++;});
  var used=Math.min(S.cfg.minutes*60, (Math.min(Date.now(),S.endAt)-S.startedAt)/1000-(S.paused?0:0));
  var attempt={date:Date.now(),title:S.cfg.title,mode:S.cfg.mode,score:Math.round(score*100)/100,total:S.total,pct:Math.round(100*score/S.total),corr:corr,wrong:wrong,un:un,secs:Math.round(used)};
  var hist=load(STORE_HIST,[]); var prev=hist.filter(function(h){return h.title===attempt.title;}).slice(-1)[0]; hist.push(attempt); save(STORE_HIST,hist.slice(-40));
  S.result={res:res,score:score,pos:pos,neg:neg,corr:corr,wrong:wrong,un:un,used:used,prev:prev,auto:auto};
  renderResult();
  if(window.GateTest&&GateTest.onChange) GateTest.onChange();
}
function renderResult(){
  var R=S.result, h='<div class="gt-top"><button class="gt-ib" id="gtDone">✕ Close</button><div class="gt-title">Result<small>'+esc(S.cfg.title)+'</small></div></div><div class="gt-body"><div class="gt-wrap">';
  var pct=Math.round(100*R.score/S.total);
  h+='<div class="gt-hero">'+(R.auto?'<div class="gt-hint" style="margin:0 0 8px">Time ran out — the test was submitted automatically.</div>':'')+
     '<div class="gt-score">'+fmtMarks(R.score)+'<small>/ '+S.total+' marks</small></div>'+
     '<div class="gt-pct">'+pct+'% of the paper'+(R.prev?' · last attempt of this test: '+fmtMarks(R.prev.score)+' / '+R.prev.total+' ('+R.prev.pct+'%)':'')+'</div>'+
     '<div class="gt-kpis"><div class="g"><b>'+R.corr+'</b>Correct (+'+fmtMarks(R.pos)+')</div><div class="r"><b>'+R.wrong+'</b>Wrong</div><div><b>'+R.un+'</b>Not attempted</div><div class="r"><b>'+(R.neg?'−'+fmtMarks(-R.neg):'0')+'</b>Lost to negative marking</div><div><b>'+fmtTime(R.used)+'</b>of '+fmtTime(S.cfg.minutes*60)+'</div>'+
     '<div><b>'+(R.corr+R.wrong?Math.round(100*R.corr/(R.corr+R.wrong)):0)+'%</b>Accuracy (attempted)</div></div></div>';
  // by type
  var types=['MCQ','MSQ','NAT'], bt={};
  types.forEach(function(t){bt[t]={n:0,a:0,c:0,m:0,tot:0};});
  R.res.forEach(function(g){var b=bt[g.q.type];b.n++;b.tot+=g.q.marks;b.m+=g.marks;if(g.state!=='unattempted')b.a++;if(g.state==='correct')b.c++;});
  h+='<div class="gt-h">By question type</div><table class="gt-tbl"><tr><th>Type</th><th class="n">Qs</th><th class="n">Attempted</th><th class="n">Correct</th><th class="n">Marks</th></tr>';
  types.forEach(function(t){var b=bt[t]; if(b.n) h+='<tr><td>'+t+'</td><td class="n">'+b.n+'</td><td class="n">'+b.a+'</td><td class="n">'+b.c+'</td><td class="n">'+fmtMarks(b.m)+' / '+b.tot+'</td></tr>';});
  h+='</table>';
  // by subject (full) / by topic
  var byS={}, byT={};
  R.res.forEach(function(g){
    var s=byS[g.q.subj]=byS[g.q.subj]||{n:0,a:0,c:0,m:0,tot:0,name:bank(g.q.subj).name}; s.n++;s.tot+=g.q.marks;s.m+=g.marks;if(g.state!=='unattempted')s.a++;if(g.state==='correct')s.c++;
    var k=g.q.subj+'|'+g.q.topic, t=byT[k]=byT[k]||{subj:g.q.subj,topic:g.q.topic,label:g.q.tlabel,n:0,a:0,c:0,m:0,tot:0}; t.n++;t.tot+=g.q.marks;t.m+=g.marks;if(g.state!=='unattempted')t.a++;if(g.state==='correct')t.c++;
  });
  function bar(p){var col=p>=75?'#7ee787':p>=50?'#ffc978':'#ff6b6b';return '<div class="gt-bar"><i style="width:'+Math.max(0,Math.min(100,p))+'%;background:'+col+'"></i></div>';}
  if(S.cfg.mode==='full'){
    h+='<div class="gt-h">By subject</div><table class="gt-tbl"><tr><th>Subject</th><th>Score</th><th class="n">Marks</th></tr>';
    ORDER.forEach(function(k){var s=byS[k]; if(!s)return; var p=Math.round(100*Math.max(0,s.m)/s.tot); h+='<tr><td>'+esc(s.name)+'</td><td style="width:34%">'+bar(p)+'</td><td class="n">'+fmtMarks(s.m)+' / '+s.tot+'</td></tr>';});
    h+='</table>';
  }
  var tl=Object.keys(byT).map(function(k){return byT[k];});
  h+='<div class="gt-h">By topic</div><table class="gt-tbl"><tr><th>Topic</th><th></th><th class="n">Marks</th></tr>';
  tl.forEach(function(t){var p=Math.round(100*Math.max(0,t.m)/t.tot); h+='<tr><td>'+(S.cfg.mode==='full'?'<span style="color:var(--muted,#93a0b8)">'+esc(bank(t.subj).short)+' · </span>':'')+esc(t.label)+'</td><td style="width:30%">'+bar(p)+'</td><td class="n">'+fmtMarks(t.m)+' / '+t.tot+'</td></tr>';});
  h+='</table>';
  // recommendation: topics that lost most marks
  var weak=tl.map(function(t){return {t:t,lost:t.tot-t.m,p:t.m/t.tot};}).filter(function(x){return x.p<0.6;}).sort(function(a,b){return b.lost-a.lost;}).slice(0,4);
  h+='<div class="gt-rec"><b>Where to go next</b>';
  if(weak.length){
    weak.forEach(function(w){
      var b=bank(w.t.subj), cfg=(b.review||{})[w.t.topic], link=esc(w.t.label);
      if(cfg){ var href=cfg.href?cfg.href:(b.page+'#'+cfg.sec); link='<a href="'+esc(href)+'" data-gtlink="1">'+esc(cfg.label)+'</a>'+(cfg.h2&&cfg.h2[0]?' <span style="color:var(--muted,#93a0b8)">(start with '+esc(cfg.h2[0])+')</span>':''); }
      h+='<div>Review → '+(S.cfg.mode==='full'?esc(b.short)+' → ':'')+link+' <span style="color:var(--muted,#93a0b8)">· scored '+fmtMarks(w.t.m)+' of '+w.t.tot+' marks</span></div>';
    });
    h+='<div>Then redo the questions you missed (filter “Wrong” below) and attempt PYQs.</div>';
  } else h+='<div>No weak topics in this paper. Take a longer test or a full mock, then move on to PYQs.</div>';
  h+='</div>';
  // review
  h+='<div class="gt-h">Review every question</div><div class="gt-filt" id="gtFilt"><button class="on" data-f="all">All ('+R.res.length+')</button><button data-f="wrong">Wrong ('+R.wrong+')</button><button data-f="unattempted">Not attempted ('+R.un+')</button><button data-f="marked">Marked</button></div><div id="gtRev"></div>';
  h+='<div class="gt-row"><button class="gt-ib pri" id="gtAgain">Take another test</button><button class="gt-ib" id="gtDone2">Close</button></div>';
  h+='</div></div>';
  OV.innerHTML=h;
  function drawRev(f){
    var out='';
    R.res.forEach(function(g,i){
      if(f==='wrong'&&g.state!=='wrong')return; if(f==='unattempted'&&g.state!=='unattempted')return; if(f==='marked'&&!g.marked)return;
      var q=g.q, sc=g.marks>0?'<span class="sc p">+'+fmtMarks(g.marks)+'</span>':g.marks<0?'<span class="sc n">−'+fmtMarks(-g.marks)+'</span>':'<span class="sc">0</span>';
      out+='<div class="gt-rv '+g.state+'"><div class="hd"><b style="color:var(--text,#e6e9f0)">Q'+(i+1)+'</b><span class="gt-chip t-'+q.type+'">'+q.type+'</span><span>'+q.marks+' mark'+(q.marks>1?'s':'')+'</span><span>'+esc(q.sname)+' · '+esc(q.tlabel)+'</span><span>'+fmtTime(g.t)+'</span>'+sc+'</div>'+
        '<div class="st">'+q.stem+'</div><div class="kv"><span>Your answer</span><div>'+givenText(q,g.r)+'</div></div><div class="kv"><span>Correct answer</span><div>'+answerText(q)+'</div></div>'+(q.exp?'<div class="ex">'+q.exp+'</div>':'')+'</div>';
    });
    $('#gtRev',OV).innerHTML=out||'<p style="color:var(--muted,#93a0b8)">Nothing in this filter.</p>';
  }
  drawRev('all');
  OV.querySelectorAll('#gtFilt button').forEach(function(b){b.onclick=function(){OV.querySelectorAll('#gtFilt button').forEach(function(x){x.classList.toggle('on',x===b);});drawRev(b.getAttribute('data-f'));};});
  OV.querySelectorAll('a[data-gtlink]').forEach(function(a){a.addEventListener('click',function(){closeOverlay();S=null;});});
  var close=function(){closeOverlay();S=null; if(window.GateTest&&GateTest.onChange) GateTest.onChange();};
  $('#gtDone',OV).onclick=close; $('#gtDone2',OV).onclick=close;
  $('#gtAgain',OV).onclick=function(){var cfg=S.cfg; closeOverlay(); S=null; if(window.GateTest&&GateTest.onChange) GateTest.onChange(); if(window.GateTest&&GateTest.again) GateTest.again(cfg);};
  var b=$('.gt-body',OV); if(b) b.scrollTop=0;
}

/* ---------- public API ---------- */
function begin(cfg,qs){
  if(!qs.length){alert('Not enough questions for that selection.');return;}
  newSession(cfg,qs); openOverlay(); renderQ(); startTick();
}
function startSubject(key,opts){
  return loadSubject(key).then(function(b){
    var spec={quick:[4,6],standard:[8,12],long:[12,18]}[opts.size]||[8,12];
    var topic=opts.topic||'', n1=spec[0], n2=spec[1];
    if(topic){ // limit to what the topic can supply
      var avail=b.Q.filter(function(x){return x[0]===topic;}).length+b.NAT.filter(function(x){return x.t===topic;}).length;
      var want=n1+n2; if(avail<want){var r=avail/want; n1=Math.max(1,Math.floor(n1*r)); n2=Math.max(1,Math.floor(n2*r));}
    }
    var qs=compose(b,n1,n2,topic||null);
    var marks=qs.reduce(function(a,q){return a+q.marks;},0);
    var cfg={mode:'subject',subject:key,topic:topic,size:opts.size,title:b.name+(topic?' · '+(b.topics[topic]||topic):'')+' — GATE-style test',sub:qs.length+' questions · '+marks+' marks',minutes:Math.max(5,Math.ceil(marks*MIN_PER_MARK))};
    begin(cfg,qs);
  });
}
function startFull(){
  return loadMany(ORDER).then(function(){
    var qs=composeFull(), marks=qs.reduce(function(a,q){return a+q.marks;},0);
    begin({mode:'full',title:'Full mock — GATE CSE 2027',sub:qs.length+' questions · '+marks+' marks · 3 hours',minutes:180},qs);
  });
}
function history(){return load(STORE_HIST,[]);}


/* ---------- launcher card for a subject page ---------- */
function mountLauncher(key,beforeEl){
  injectCSS();
  var box=el('div','gt-launch'); box.id='gtLaunch';
  beforeEl.parentNode.insertBefore(box,beforeEl);
  var bk=null;
  function render(){
    var act=hasActive(), hist=history().filter(function(h){return h.mode==='subject'&&h.title.indexOf(bk?bk.name:'')===0;}).slice(-3).reverse();
    var topics=bk?Object.keys(bk.topics):[];
    var h='<h3>🎯 GATE-style test</h3><p>A timed paper with no instant answers: MCQs carry negative marking, MSQs are all-or-nothing, and numerical-answer (NAT) questions are typed in. Your result shows marks, time and where you lost them.</p>';
    h+='<div class="gt-fields"><label>Topic<select id="gtTopic"><option value="">All topics</option>'+topics.map(function(t){return '<option value="'+esc(t)+'">'+esc(bk.topics[t])+'</option>';}).join('')+'</select></label>'+
       '<label>Length<select id="gtSize"><option value="quick">Quick · 10 Qs · 16 marks · 29 min</option><option value="standard" selected>Standard · 20 Qs · 32 marks · 58 min</option><option value="long">Long · 30 Qs · 48 marks · 87 min</option></select></label>'+
       '<button class="gt-ib pri" id="gtGo"'+(bk?'':' disabled')+'>Start test</button>'+(act?'<button class="gt-ib pur" id="gtRes">Resume: '+esc(act.cfg.title.replace(/ — GATE-style test$/,''))+'</button>':'')+'</div>';
    h+='<div class="gt-scheme">Marking as in GATE: 1-mark MCQ −⅓ and 2-mark MCQ −⅔ for a wrong answer; MSQ and NAT have no negative marking. Time is 1.8 minutes per mark. Marks per question are assigned by length and effort (the more involved half of each subject’s bank counts 2 marks).</div>';
    if(hist.length) h+='<div class="gt-hist">Recent: '+hist.map(function(x){return '<b>'+fmtMarks(x.score)+'/'+x.total+'</b> ('+x.pct+'%)';}).join(' · ')+'</div>';
    box.innerHTML=h;
    var go=$('#gtGo',box); if(go) go.onclick=function(){startSubject(key,{size:$('#gtSize',box).value,topic:$('#gtTopic',box).value}).catch(function(e){alert(e.message);});};
    var rs=$('#gtRes',box); if(rs) rs.onclick=function(){resumeFromStore().then(function(ok){if(!ok)alert('That test could not be restored.');render();});};
  }
  render();
  loadSubject(key).then(function(b){bk=b;render();}).catch(function(){box.querySelector('p').textContent='Questions for the timed test are not available yet. Open the app once while online so they can be saved for offline use.';});
  var prev=GateTest.onChange; GateTest.onChange=function(){render();if(prev&&prev!==GateTest.onChange)prev();};
  return box;
}

window.GateTest={
  mountLauncher:mountLauncher,QUOTA:FULL_QUOTA,
  ORDER:ORDER,loadSubject:loadSubject,startSubject:startSubject,startFull:startFull,resume:resumeFromStore,
  hasActive:hasActive,history:history,fmtMarks:fmtMarks,fmtTime:fmtTime,injectCSS:injectCSS,
  again:function(cfg){ if(cfg.mode==='full') startFull(); else startSubject(cfg.subject,{size:cfg.size,topic:cfg.topic}); },
  onChange:null,
  _grade:grade,_natParse:natParse,_compose:compose,_composeFull:composeFull,_loadMany:loadMany
};
})();
