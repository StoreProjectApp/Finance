import {useEffect,useState,useCallback} from 'react'
import {sb} from './supabase'
import {Icon} from './icons'
import {ThemePicker,Modal,PrefsPicker,getPrefs,savePrefs} from './theme'
import {Budget,Report,More,runRecurring} from './Extra'
const rp=(n:number)=>'Rp'+new Intl.NumberFormat('id-ID').format(n||0)
const tgl=(d:string)=>new Date(d+'T00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})
const today=()=>new Date().toLocaleDateString('sv-SE')
const inp='w-full rounded-xl border border-slate-300/70 dark:border-zinc-700 bg-white/70 dark:bg-transparent p-3'
const btn='w-full rounded-xl text-white p-3 font-semibold active:scale-[.98] transition btn-grad disabled:opacity-50'
const card='rounded-2xl bg-white dark:bg-[#111827] ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-4'

function Auth(){
  const [e,setE]=useState(''),[p,setP]=useState(''),[m,setM]=useState('masuk'),[err,setErr]=useState('')
  const go=async()=>{setErr('')
    if(!e.includes('@'))return setErr('email tidak valid')
    if(p.length<6)return setErr('kata sandi minimal 6 karakter')
    const r=m==='masuk'?await sb.auth.signInWithPassword({email:e,password:p}):await sb.auth.signUp({email:e,password:p})
    if(r.error)setErr(r.error.message)}
  return <div className="p-6 space-y-3 max-w-sm mx-auto pt-20">
    <h1 className="text-2xl font-semibold">keuangan keluarga</h1>
    <input className={inp} placeholder="email" type="email" value={e} onChange={x=>setE(x.target.value)}/>
    <input className={inp} placeholder="kata sandi" type="password" value={p} onChange={x=>setP(x.target.value)}/>
    {err&&<p className="text-red-500 text-sm">{err}</p>}
    <button className={btn} onClick={go}>{m}</button>
    <button className="w-full text-brand-600 p-2" onClick={()=>setM(m==='masuk'?'daftar':'masuk')}>{m==='masuk'?'belum punya akun? daftar':'sudah punya akun? masuk'}</button>
  </div>}

function Setup({done}:{done:()=>void}){
  const [name,setName]=useState('keluarga kita'),[bal,setBal]=useState(''),[code,setCode]=useState(''),[err,setErr]=useState('')
  const make=async()=>{const r=await sb.rpc('create_family',{p_name:name.trim(),p_opening:Number(bal)||0});r.error?setErr(r.error.message):done()}
  const join=async()=>{const r=await sb.rpc('join_family',{p_code:code});r.error?setErr(r.error.message):done()}
  return <div className="p-6 space-y-6 max-w-sm mx-auto pt-12">
    <div className="space-y-3"><h2 className="font-semibold text-lg">buat keluarga baru</h2>
      <input className={inp} placeholder="nama keluarga" value={name} onChange={x=>setName(x.target.value)}/>
      <input className={inp} placeholder="saldo awal (rupiah)" inputMode="numeric" value={bal} onChange={x=>setBal(x.target.value.replace(/\D/g,''))}/>
      <button className={btn} onClick={make}>buat</button></div>
    <div className="space-y-3"><h2 className="font-semibold text-lg">gabung dengan kode</h2>
      <input className={inp} placeholder="kode undangan" value={code} onChange={x=>setCode(x.target.value)}/>
      <button className={btn} onClick={join}>gabung</button></div>
    {err&&<p className="text-red-500 text-sm">{err}</p>}
    <button className="text-sm text-zinc-500" onClick={()=>sb.auth.signOut()}>keluar</button>
  </div>}

function AddTx({uid,cats,onClose,edit}:any){
  const [type,setType]=useState(edit?.type||'expense'),[amt,setAmt]=useState(String(edit?.amount||'')),[cat,setCat]=useState(edit?.category_id||''),[date,setDate]=useState(edit?.date||today()),[note,setNote]=useState(edit?.note||''),[err,setErr]=useState('')
  const list=cats.filter((c:any)=>c.type===type)
  const save=async()=>{const a=Number(amt)
    if(!a||a<=0)return setErr('isi nominal')
    if(!cat)return setErr('pilih kategori')
    const body={type,amount:a,date,category_id:cat,note:note.trim()}
    let r:any
    if(edit)r=await sb.from('transactions').update(body).eq('id',edit.id)
    else{const {data:f}=await sb.rpc('current_family_id');r=await sb.from('transactions').insert({...body,family_id:f,member_id:uid})}
    r.error?setErr(r.error.message):onClose(true)}
  const rm=async()=>{if(confirm('hapus transaksi ini?')){await sb.from('transactions').delete().eq('id',edit.id);onClose(true)}}
  return <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end z-20" onClick={()=>onClose(false)}>
    <div className="bg-white dark:bg-[#111827] w-full rounded-t-3xl p-5 pb-8 space-y-3 animate-slideUp" onClick={e=>e.stopPropagation()}>
      <div className="mx-auto h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700"/>
      <div className="grid grid-cols-2 gap-2">{[['expense','pengeluaran'],['income','pemasukan']].map(([v,l])=>
        <button key={v} onClick={()=>{setType(v);setCat('')}} className={'rounded-xl p-2 '+(type===v?(v==='income'?'bg-income text-white':'bg-expense text-white'):'bg-zinc-100 dark:bg-zinc-800')}>{l}</button>)}</div>
      <input autoFocus className={inp+' text-2xl'} placeholder="nominal" inputMode="numeric" value={amt?new Intl.NumberFormat('id-ID').format(Number(amt)):''} onChange={x=>setAmt(x.target.value.replace(/\D/g,''))}/>
      <div className="flex flex-wrap gap-2">{list.map((c:any)=><button key={c.id} onClick={()=>setCat(c.id)} className={'rounded-full px-3 py-1 border '+(cat===c.id?'bg-brand-600 text-white border-brand-600':'border-slate-300/70 dark:border-zinc-700')}>{c.name}</button>)}</div>
      <input type="date" className={inp} value={date} onChange={x=>setDate(x.target.value)}/>
      <input className={inp} placeholder="catatan" maxLength={200} value={note} onChange={x=>setNote(x.target.value)}/>
      {err&&<p className="text-red-500 text-sm">{err}</p>}
      <button className={btn} onClick={save}>{edit?'simpan perubahan':'simpan'}</button>
      {edit&&<button className="w-full text-expense p-2" onClick={rm}>hapus transaksi</button>}
    </div></div>}

const COL=['bg-blue-500','bg-amber-500','bg-violet-500']
const EMO:any={gaji:'💼',lainnya:'✨',makan:'🍽️',transportasi:'🚗',listrik:'💡',internet:'📶',sekolah:'🎓',cicilan:'🏦',belanja:'🛍️',kesehatan:'💊'}
const dayLabel=(d:string)=>d===today()?'hari ini':d===new Date(Date.now()-864e5).toLocaleDateString('sv-SE')?'kemarin':tgl(d)
const dayTot=(a:any[])=>{const n=a.reduce((s,t)=>s+(t.type==='income'?1:-1)*Number(t.amount),0);return (n<0?'-':'+')+rp(Math.abs(n))}
const jt=(n:number)=>n>=1e6?'Rp'+(n/1e6).toFixed(1).replace('.',',')+'jt':rp(n)
const sparkPath=(a:number[])=>{const mn=Math.min(...a),h=Math.max(...a)-mn||1;const p=a.map((v,i)=>[i*100/(a.length-1),28-(v-mn)/h*24]);return p.map((q,i)=>i?`C${(p[i-1][0]+q[0])/2} ${p[i-1][1]} ${(p[i-1][0]+q[0])/2} ${q[1]} ${q[0]} ${q[1]}`:`M${q[0]} ${q[1]}`).join(' ')}
const Row=({t,cn,who,ico,onClick}:any)=>{const inc=t.type==='income';return <div className="flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-white/5 active:opacity-60" onClick={onClick}>
  <span className={'relative w-11 h-11 rounded-2xl grid place-items-center text-xl font-semibold shrink-0 '+(inc?'bg-income-bg text-income':'bg-expense-bg text-expense')}>{ico==='inisial'?(cn||'?')[0].toUpperCase():EMO[(cn||'').toLowerCase()]||(cn||'?')[0].toUpperCase()}
    {who&&<span className={'absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-white dark:ring-[#111827] text-white text-[9px] font-bold grid place-items-center '+COL[who.i%3]}>{who.name[0].toUpperCase()}</span>}</span>
  <div className="flex-1 min-w-0"><div className="font-semibold">{cn||'tanpa kategori'}</div><div className="text-xs text-zinc-500 truncate">{t.note||tgl(t.date)}</div></div>
  <div className="font-semibold tnum" style={{color:inc?'#0b8585':'#e05540'}}>{inc?'+':'-'}{rp(t.amount)}</div></div>}
function HeroCard({amount,badge,hide,onToggle,points}:any){
  return <div className="relative overflow-hidden rounded-3xl p-6 text-white" style={{background:'linear-gradient(135deg,#164a82,#1e5fa8 55%,#0ea5a5)',boxShadow:'0 20px 40px -16px rgba(30,95,168,.5)'}}>
    <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl"/>
    <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-teal-400/30 blur-2xl"/>
    <div className="absolute inset-0 opacity-[.08]" style={{backgroundImage:'radial-gradient(#fff 1px,transparent 1px)',backgroundSize:'14px 14px'}}/>
    <div className="relative">
      <div className="flex items-center justify-between text-sm text-white/80"><span>saldo utama</span><button aria-label="sembunyikan saldo" onClick={onToggle}><Icon n={hide?'eyeoff':'eye'} s={22}/></button></div>
      <div className="mt-1 text-[2.6rem] leading-tight font-extrabold tabular-nums">{amount}</div>
      <div className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium tabular-nums">{badge}</div>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-4 h-10 w-full"><path d={points} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"/></svg>
    </div></div>}

function Shell({uid}:{uid:string}){
  const [tab,setTab]=useState('beranda'),[fam,setFam]=useState<any>({}),[cats,setCats]=useState<any[]>([]),[tx,setTx]=useState<any[]>([]),[add,setAdd]=useState<any>(false),[pf,setPf]=useState<any[]>([]),[mo,setMo]=useState<any>(null),[sv,setSv]=useState(0),[prf,setPrf]=useState(getPrefs),[hide,setHide]=useState(()=>{try{return localStorage.getItem('hide')==='1'}catch{return false}})
  const [q,setQ]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[fc,setFc]=useState('')
  const [nn,setNn]=useState(''),[nt,setNt]=useState('expense')
  const load=useCallback(async()=>{
    const [f,c,t,pr,gl]=await Promise.all([sb.from('families').select('*').single(),sb.from('categories').select('*').order('name'),sb.from('transactions').select('*').order('date',{ascending:false}).order('created_at',{ascending:false}).limit(2000),sb.from('profiles').select('id,display_name').order('created_at'),sb.from('savings_goals').select('saved_amount')])
    setFam(f.data||{});setCats(c.data||[]);setTx(t.data||[]);setPf(pr.data||[]);setSv((gl.data||[]).reduce((a:number,g:any)=>a+Number(g.saved_amount),0))},[])
  useEffect(()=>{runRecurring(uid).then(load)},[load])
  const cn=(id:string)=>cats.find(c=>c.id===id)?.name
  const who=(id:string)=>{const i=pf.findIndex(p=>p.id===id);return i<0?null:{i,name:pf[i].display_name||'?'}}
  const mk=(n:number)=>hide?'Rp•••••••':rp(n)
  const sum=(a:any[],ty:string)=>a.filter(t=>t.type===ty).reduce((s,t)=>s+Number(t.amount),0)
  const mon=today().slice(0,7),mt=tx.filter(t=>t.date.startsWith(mon))
  const sisa=Number(fam.opening_balance||0)+sum(tx,'income')-sum(tx,'expense')-sv
  const net=sum(mt,'income')-sum(mt,'expense')
  const pts=sparkPath([5,4,3,2,1,0].map(i=>{const e=new Date();e.setDate(1);e.setMonth(e.getMonth()-i+1);const k=e.toLocaleDateString('sv-SE');const b=tx.filter(t=>t.date<k);return Number(fam.opening_balance||0)+sum(b,'income')-sum(b,'expense')-sv}))
  const top=Object.entries(mt.filter(t=>t.type==='expense').reduce((o:any,t)=>{const k=cn(t.category_id)||'tanpa kategori';o[k]=(o[k]||0)+Number(t.amount);return o},{})).sort((a:any,b:any)=>b[1]-a[1]).slice(0,5)
  const del=async(t:any)=>{if(confirm('hapus transaksi ini?')){await sb.from('transactions').delete().eq('id',t.id);load()}}
  const filtered=tx.filter(t=>(prf.jenis==='all'||t.type===prf.jenis)&&(!fc||t.category_id===fc)&&(!from||t.date>=from)&&(!to||t.date<=to)&&(!q||(t.note+' '+(cn(t.category_id)||'')).toLowerCase().includes(q.toLowerCase())))
  const groups:any[]=Object.entries(filtered.reduce((o:any,t)=>{(o[t.date]=o[t.date]||[]).push(t);return o},{})).sort((a,b)=>b[0].localeCompare(a[0]))
  const csv=()=>{const esc=(s:any)=>'"'+String(s??'').replace(/"/g,'""')+'"'
    const rows=[['tanggal','jenis','kategori','nominal','catatan'],...filtered.map(t=>[t.date,t.type==='income'?'pemasukan':'pengeluaran',cn(t.category_id)||'',t.amount,t.note])]
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(esc).join(',')).join('\n')],{type:'text/csv'}));a.download='transaksi.csv';a.click()}
  const addCat=async()=>{if(!nn.trim())return;const {data:f}=await sb.rpc('current_family_id');await sb.from('categories').insert({family_id:f,name:nn.trim(),type:nt});setNn('');load()}
  const renCat=(c:any)=>setMo({title:'ubah kategori',fields:[{label:'nama',value:c.name}],onSubmit:async(v:string[])=>{if(!v[0]?.trim())return false;await sb.from('categories').update({name:v[0].trim()}).eq('id',c.id);load()}})
  const delCat=(c:any)=>setMo({title:'hapus kategori?',text:'transaksinya tetap ada',danger:true,onSubmit:async()=>{await sb.from('categories').delete().eq('id',c.id);load()}})
  return <div className="max-w-md mx-auto pb-44 p-4 space-y-4">
    {tab==='beranda'&&<>
      <h1 className="text-xl font-semibold">dashboard</h1>
      <div className={card}><div className="text-sm text-zinc-500">sisa bulan ini</div><div className={'text-3xl font-extrabold tnum '+(net<0?'text-expense':'text-income')}>{(net<0?'-':'')+rp(Math.abs(net))}</div></div>
      <div className="grid grid-cols-2 gap-3">
        <div className={card}><div className="text-sm text-zinc-500">pemasukan bulan ini</div><div className="text-xl text-income">{rp(sum(mt,'income'))}</div></div>
        <div className={card}><div className="text-sm text-zinc-500">pengeluaran bulan ini</div><div className="text-xl text-expense">{rp(sum(mt,'expense'))}</div></div></div>
      <div className={card}><h2 className="font-medium mb-2">pengeluaran terbesar</h2>{top.length?top.map(([k,v]:any)=><div key={k} className="flex justify-between py-1"><span>{k}</span><span>{rp(v)}</span></div>):<p className="text-sm text-zinc-500">belum ada pengeluaran</p>}</div>
      <div className={card}><h2 className="font-medium">transaksi terakhir</h2>{tx.slice(0,5).map(t=><Row key={t.id} t={t} cn={cn(t.category_id)} who={who(t.member_id)} ico={prf.ikon} onClick={()=>setAdd(t)}/>)}</div>
      </>}
    {tab==='transaksi'&&<>
      <input className={inp} placeholder="cari catatan atau kategori" value={q} onChange={e=>setQ(e.target.value)}/>
      <div className="grid grid-cols-2 gap-2"><input type="date" className={inp} value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" className={inp} value={to} onChange={e=>setTo(e.target.value)}/></div>
      <select className={inp} value={fc} onChange={e=>setFc(e.target.value)}><option value="">semua kategori</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button className="text-brand-600 text-sm" onClick={csv}>ekspor csv</button>{prf.jenis!=='all'&&<button className="text-sm text-zinc-500 ml-3" onClick={()=>{const p={...prf,jenis:'all' as const};savePrefs(p);setPrf(p)}}>hanya {prf.jenis==='income'?'pemasukan':'pengeluaran'} · tampilkan semua</button>}
      <div>{groups.map(([d,a]:any)=><div key={d}><div className="flex justify-between text-xs text-zinc-500 pt-4 pb-1"><span className="font-medium">{dayLabel(d)}</span><span>{dayTot(a)}</span></div>{a.map((t:any)=><Row key={t.id} t={t} cn={cn(t.category_id)} who={who(t.member_id)} ico={prf.ikon} onClick={()=>setAdd(t)}/>)}</div>)}{!filtered.length&&<p className="text-sm text-zinc-500 pt-4">belum ada transaksi, ketuk + untuk mulai</p>}</div>
      <p className="text-xs text-zinc-500">ketuk transaksi untuk mengubah atau menghapus</p></>}
    {tab==='anggaran'&&<Budget cats={cats} tx={tx}/>}
    {tab==='laporan'&&<Report cats={cats} tx={tx}/>}
    {tab==='profil'&&<>
      <div className="flex justify-between items-center"><div><h1 className="text-xl font-semibold">profil</h1><div className="text-sm text-zinc-500">{fam.name}</div></div><button className="text-sm text-zinc-500" onClick={()=>sb.auth.signOut()}>keluar</button></div>
      <HeroCard amount={mk(sisa)} hide={hide} points={pts} badge={hide?'•••':(net<0?'-':'+')+jt(Math.abs(net))+' bulan ini'} onToggle={()=>{const v=!hide;setHide(v);try{localStorage.setItem('hide',v?'1':'0')}catch{}}}/>
      <div className={card+' flex justify-between items-center'}><span className="text-sm text-zinc-500">tersisih di dana tabungan</span><span className="font-semibold tnum">{rp(sv)}</span></div>
      <div className={card+' flex justify-between items-center'}><span className="text-sm text-zinc-500">kode undangan</span><span className="font-mono font-semibold tracking-wider">{fam.invite_code}</span></div>
      <ThemePicker/>
      <PrefsPicker value={prf} onChange={setPrf}/>
      <div className="flex gap-2"><input className={inp} placeholder="kategori baru" value={nn} onChange={e=>setNn(e.target.value)}/>
        <select className="rounded-xl border border-slate-300/70 dark:border-zinc-700 bg-white/70 dark:bg-transparent p-3" value={nt} onChange={e=>setNt(e.target.value)}><option value="expense">keluar</option><option value="income">masuk</option></select></div>
      <button className={btn} onClick={addCat}>tambah</button>
      {cats.map(c=><div key={c.id} className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800"><span>{c.name} <span className="text-xs text-zinc-500">{c.type==='income'?'masuk':'keluar'}</span></span>
        <span className="space-x-3 text-sm"><button className="text-brand-600" onClick={()=>renCat(c)}>ubah</button><button className="text-expense" onClick={()=>delCat(c)}>hapus</button></span></div>)}<More cats={cats} avail={sisa} onChange={load}/></>}
    <button onClick={()=>setAdd(true)} aria-label="tambah transaksi" className="fixed right-5 bottom-28 w-16 h-16 rounded-full btn-grad text-white z-10 flex items-center justify-center active:scale-95"><Icon n="plus" s={30}/></button>
    <nav className="fixed bottom-0 inset-x-0 z-10 bg-white/90 dark:bg-[#111827]/90 backdrop-blur border-t border-zinc-200 dark:border-zinc-800 rounded-t-3xl grid grid-cols-5 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),10px)]">
      {[['beranda','dashboard','dash'],['transaksi','transaksi','swap'],['anggaran','anggaran','pie'],['laporan','laporan','chart'],['profil','profil','user']].map(([v,l,i])=><button key={v} onClick={()=>setTab(v)} className={'flex flex-col items-center gap-1 py-1 '+(tab===v?'text-brand-600 dark:text-brand-500 font-semibold':'text-zinc-500 font-medium')}>
        <span className={'rounded-full px-5 py-1.5 transition-colors '+(tab===v?'bg-brand-100 dark:bg-brand-600/25':'')}><Icon n={i} s={26}/></span><span className="text-xs">{l}</span></button>)}</nav>
    {mo&&<Modal {...mo} onClose={()=>setMo(null)}/>}
    {add&&<AddTx uid={uid} cats={cats} edit={add===true?null:add} onClose={(ok:boolean)=>{setAdd(false);ok&&load()}}/>}
  </div>}

export default function App(){
  const [s,setS]=useState<any>(undefined),[fid,setFid]=useState<any>(undefined)
  useEffect(()=>{sb.auth.getSession().then(({data})=>setS(data.session));const {data}=sb.auth.onAuthStateChange((_e,x)=>setS(x));return()=>data.subscription.unsubscribe()},[])
  const loadP=useCallback(async()=>{if(!s){setFid(undefined);return}const {data}=await sb.from('profiles').select('family_id').eq('id',s.user.id).single();setFid(data?.family_id??null)},[s])
  useEffect(()=>{loadP()},[loadP])
  if(s===undefined||(s&&fid===undefined))return <p className="p-6">memuat</p>
  if(!s)return <Auth/>
  if(!fid)return <Setup done={loadP}/>
  return <Shell uid={s.user.id}/>}
