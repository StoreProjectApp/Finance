import {useEffect,useState,useCallback} from 'react'
import {sb} from './supabase'
import {Budget,Report,More,runRecurring} from './Extra'
const rp=(n:number)=>'Rp'+new Intl.NumberFormat('id-ID').format(n||0)
const tgl=(d:string)=>new Date(d+'T00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})
const today=()=>new Date().toLocaleDateString('sv-SE')
const inp='w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-3'
const btn='w-full rounded-xl bg-blue-600 text-white p-3 font-medium disabled:opacity-50'
const card='rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4'

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
    <button className="w-full text-blue-600 p-2" onClick={()=>setM(m==='masuk'?'daftar':'masuk')}>{m==='masuk'?'belum punya akun? daftar':'sudah punya akun? masuk'}</button>
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

function AddTx({uid,cats,onClose}:any){
  const [type,setType]=useState('expense'),[amt,setAmt]=useState(''),[cat,setCat]=useState(''),[date,setDate]=useState(today()),[note,setNote]=useState(''),[err,setErr]=useState('')
  const list=cats.filter((c:any)=>c.type===type)
  const save=async()=>{const a=Number(amt)
    if(!a||a<=0)return setErr('isi nominal')
    if(!cat)return setErr('pilih kategori')
    const {data:f}=await sb.rpc('current_family_id')
    const r=await sb.from('transactions').insert({family_id:f,type,amount:a,date,category_id:cat,member_id:uid,note:note.trim()})
    r.error?setErr(r.error.message):onClose(true)}
  return <div className="fixed inset-0 bg-black/40 flex items-end z-20" onClick={()=>onClose(false)}>
    <div className="bg-white dark:bg-zinc-900 w-full rounded-t-3xl p-5 space-y-3" onClick={e=>e.stopPropagation()}>
      <div className="grid grid-cols-2 gap-2">{[['expense','pengeluaran'],['income','pemasukan']].map(([v,l])=>
        <button key={v} onClick={()=>{setType(v);setCat('')}} className={'rounded-xl p-2 '+(type===v?(v==='income'?'bg-emerald-600 text-white':'bg-rose-600 text-white'):'bg-zinc-100 dark:bg-zinc-800')}>{l}</button>)}</div>
      <input autoFocus className={inp+' text-2xl'} placeholder="nominal" inputMode="numeric" value={amt?new Intl.NumberFormat('id-ID').format(Number(amt)):''} onChange={x=>setAmt(x.target.value.replace(/\D/g,''))}/>
      <div className="flex flex-wrap gap-2">{list.map((c:any)=><button key={c.id} onClick={()=>setCat(c.id)} className={'rounded-full px-3 py-1 border '+(cat===c.id?'bg-blue-600 text-white border-blue-600':'border-zinc-300 dark:border-zinc-700')}>{c.name}</button>)}</div>
      <input type="date" className={inp} value={date} onChange={x=>setDate(x.target.value)}/>
      <input className={inp} placeholder="catatan" maxLength={200} value={note} onChange={x=>setNote(x.target.value)}/>
      {err&&<p className="text-red-500 text-sm">{err}</p>}
      <button className={btn} onClick={save}>simpan</button>
    </div></div>}

const Row=({t,cn,onDel}:any)=><div className="flex justify-between items-center py-3 border-b border-zinc-100 dark:border-zinc-800" onClick={onDel}>
  <div><div className="font-medium">{cn||'tanpa kategori'}</div><div className="text-xs text-zinc-500">{tgl(t.date)}{t.note?' · '+t.note:''}</div></div>
  <div className={t.type==='income'?'text-emerald-600':'text-rose-600'}>{t.type==='income'?'+':'-'}{rp(t.amount)}</div></div>

function Shell({uid}:{uid:string}){
  const [tab,setTab]=useState('beranda'),[fam,setFam]=useState<any>({}),[cats,setCats]=useState<any[]>([]),[tx,setTx]=useState<any[]>([]),[add,setAdd]=useState(false)
  const [q,setQ]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[fc,setFc]=useState('')
  const [nn,setNn]=useState(''),[nt,setNt]=useState('expense')
  const load=useCallback(async()=>{
    const [f,c,t]=await Promise.all([sb.from('families').select('*').single(),sb.from('categories').select('*').order('name'),sb.from('transactions').select('*').order('date',{ascending:false}).order('created_at',{ascending:false}).limit(2000)])
    setFam(f.data||{});setCats(c.data||[]);setTx(t.data||[])},[])
  useEffect(()=>{runRecurring(uid).then(load)},[load])
  const cn=(id:string)=>cats.find(c=>c.id===id)?.name
  const sum=(a:any[],ty:string)=>a.filter(t=>t.type===ty).reduce((s,t)=>s+Number(t.amount),0)
  const mon=today().slice(0,7),mt=tx.filter(t=>t.date.startsWith(mon))
  const sisa=Number(fam.opening_balance||0)+sum(tx,'income')-sum(tx,'expense')
  const top=Object.entries(mt.filter(t=>t.type==='expense').reduce((o:any,t)=>{const k=cn(t.category_id)||'tanpa kategori';o[k]=(o[k]||0)+Number(t.amount);return o},{})).sort((a:any,b:any)=>b[1]-a[1]).slice(0,5)
  const del=async(t:any)=>{if(confirm('hapus transaksi ini?')){await sb.from('transactions').delete().eq('id',t.id);load()}}
  const filtered=tx.filter(t=>(!fc||t.category_id===fc)&&(!from||t.date>=from)&&(!to||t.date<=to)&&(!q||(t.note+' '+(cn(t.category_id)||'')).toLowerCase().includes(q.toLowerCase())))
  const csv=()=>{const esc=(s:any)=>'"'+String(s??'').replace(/"/g,'""')+'"'
    const rows=[['tanggal','jenis','kategori','nominal','catatan'],...filtered.map(t=>[t.date,t.type==='income'?'pemasukan':'pengeluaran',cn(t.category_id)||'',t.amount,t.note])]
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(esc).join(',')).join('\n')],{type:'text/csv'}));a.download='transaksi.csv';a.click()}
  const addCat=async()=>{if(!nn.trim())return;const {data:f}=await sb.rpc('current_family_id');await sb.from('categories').insert({family_id:f,name:nn.trim(),type:nt});setNn('');load()}
  const renCat=async(c:any)=>{const n=prompt('nama baru',c.name);if(n?.trim()){await sb.from('categories').update({name:n.trim()}).eq('id',c.id);load()}}
  const delCat=async(c:any)=>{if(confirm('hapus kategori ini? transaksinya tetap ada')){await sb.from('categories').delete().eq('id',c.id);load()}}
  return <div className="max-w-md mx-auto pb-28 p-4 space-y-4">
    {tab==='beranda'&&<>
      <div className="flex justify-between items-center"><h1 className="text-xl font-semibold">{fam.name}</h1><button className="text-sm text-zinc-500" onClick={()=>sb.auth.signOut()}>keluar</button></div>
      <div className={card}><div className="text-sm text-zinc-500">sisa uang</div><div className="text-4xl font-semibold">{rp(sisa)}</div></div>
      <div className="grid grid-cols-2 gap-3">
        <div className={card}><div className="text-sm text-zinc-500">pemasukan bulan ini</div><div className="text-xl text-emerald-600">{rp(sum(mt,'income'))}</div></div>
        <div className={card}><div className="text-sm text-zinc-500">pengeluaran bulan ini</div><div className="text-xl text-rose-600">{rp(sum(mt,'expense'))}</div></div></div>
      <div className={card}><h2 className="font-medium mb-2">pengeluaran terbesar</h2>{top.length?top.map(([k,v]:any)=><div key={k} className="flex justify-between py-1"><span>{k}</span><span>{rp(v)}</span></div>):<p className="text-sm text-zinc-500">belum ada pengeluaran</p>}</div>
      <div className={card}><h2 className="font-medium">transaksi terakhir</h2>{tx.slice(0,5).map(t=><Row key={t.id} t={t} cn={cn(t.category_id)}/>)}</div>
      <p className="text-xs text-zinc-500">kode undangan: {fam.invite_code}</p></>}
    {tab==='transaksi'&&<>
      <input className={inp} placeholder="cari catatan atau kategori" value={q} onChange={e=>setQ(e.target.value)}/>
      <div className="grid grid-cols-2 gap-2"><input type="date" className={inp} value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" className={inp} value={to} onChange={e=>setTo(e.target.value)}/></div>
      <select className={inp} value={fc} onChange={e=>setFc(e.target.value)}><option value="">semua kategori</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button className="text-blue-600 text-sm" onClick={csv}>ekspor csv</button>
      <div>{filtered.map(t=><Row key={t.id} t={t} cn={cn(t.category_id)} onDel={()=>del(t)}/>)}{!filtered.length&&<p className="text-sm text-zinc-500">tidak ada transaksi</p>}</div>
      <p className="text-xs text-zinc-500">ketuk transaksi untuk menghapus</p></>}
    {tab==='anggaran'&&<Budget cats={cats} tx={tx}/>}
    {tab==='laporan'&&<Report cats={cats} tx={tx}/>}
    {tab==='lainnya'&&<>
      <div className="flex gap-2"><input className={inp} placeholder="kategori baru" value={nn} onChange={e=>setNn(e.target.value)}/>
        <select className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-3" value={nt} onChange={e=>setNt(e.target.value)}><option value="expense">keluar</option><option value="income">masuk</option></select></div>
      <button className={btn} onClick={addCat}>tambah</button>
      {cats.map(c=><div key={c.id} className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800"><span>{c.name} <span className="text-xs text-zinc-500">{c.type==='income'?'masuk':'keluar'}</span></span>
        <span className="space-x-3 text-sm"><button className="text-blue-600" onClick={()=>renCat(c)}>ubah</button><button className="text-rose-600" onClick={()=>delCat(c)}>hapus</button></span></div>)}<More cats={cats}/></>}
    <button onClick={()=>setAdd(true)} aria-label="tambah transaksi" className="fixed right-5 bottom-20 w-14 h-14 rounded-full bg-blue-600 text-white text-3xl z-10">+</button>
    <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
      {[['beranda','beranda'],['transaksi','transaksi'],['anggaran','anggaran'],['laporan','laporan'],['lainnya','lainnya']].map(([v,l])=><button key={v} onClick={()=>setTab(v)} className={'p-3 text-sm '+(tab===v?'text-blue-600 font-medium':'text-zinc-500')}>{l}</button>)}</nav>
    {add&&<AddTx uid={uid} cats={cats} onClose={(ok:boolean)=>{setAdd(false);ok&&load()}}/>}
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
