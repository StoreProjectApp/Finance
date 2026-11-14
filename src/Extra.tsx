import {useEffect,useState,useCallback} from 'react'
import {sb} from './supabase'
const rp=(n:number)=>'Rp'+new Intl.NumberFormat('id-ID').format(n||0)
const inp='w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-3'
const btn='w-full rounded-xl bg-blue-600 text-white p-3 font-medium'
const card='rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4'
const ymd=(d:Date)=>d.toLocaleDateString('sv-SE')
const fid=async()=>(await sb.rpc('current_family_id')).data
const num=(s:any)=>Number(String(s||'').replace(/\D/g,''))
const mkey=(d:Date)=>ymd(d).slice(0,7)
const spent=(tx:any[],ty:string,m:string,cat?:string)=>tx.filter(t=>t.type===ty&&t.date.startsWith(m)&&(!cat||t.category_id===cat)).reduce((s,t)=>s+Number(t.amount),0)
const Bar=({v,max,c='bg-blue-600'}:any)=><div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800"><div className={'h-2 rounded-full '+c} style={{width:Math.min(100,max?v/max*100:0)+'%'}}/></div>
const Sec=({t,children}:any)=><details className={card}><summary className="font-medium">{t}</summary><div className="space-y-3 pt-3">{children}</div></details>
const Lk=({onClick,c='text-blue-600',children}:any)=><button className={'text-sm '+c} onClick={onClick}>{children}</button>

export async function runRecurring(uid:string){
  const {data}=await sb.from('recurring').select('*').eq('active',true).lte('next_run',ymd(new Date()))
  for(const r of data||[]){
    let d=r.next_run
    while(d<=ymd(new Date())){
      const [y,m]=d.split('-').map(Number)
      const n=ymd(new Date(y,m,r.day_of_month))
      const lock=await sb.from('recurring').update({next_run:n}).eq('id',r.id).eq('next_run',d).select()
      if(!lock.data?.length)break
      await sb.from('transactions').insert({family_id:r.family_id,type:r.type,amount:r.amount,date:d,category_id:r.category_id,member_id:uid,note:r.note,recurring_id:r.id})
      d=n}}}

export function Budget({cats,tx}:any){
  const m=mkey(new Date()),m1=m+'-01'
  const [b,setB]=useState<any[]>([])
  const load=useCallback(async()=>{const {data}=await sb.from('budgets').select('*').eq('month',m1);setB(data||[])},[m1])
  useEffect(()=>{load()},[load])
  const set=async(c:any)=>{const cur=b.find(x=>x.category_id===c.id)
    const v=prompt('anggaran '+c.name+' bulan ini (rupiah, kosongkan untuk hapus)',cur?.amount||'');if(v===null)return
    const a=num(v)
    if(!a){if(cur)await sb.from('budgets').delete().eq('id',cur.id)}
    else await sb.from('budgets').upsert({family_id:await fid(),category_id:c.id,month:m1,amount:a},{onConflict:'category_id,month'})
    load()}
  const rows=cats.filter((c:any)=>c.type==='expense').map((c:any)=>{const bu=b.find(x=>x.category_id===c.id);const sp=spent(tx,'expense',m,c.id);return {c,bu,sp,p:bu?sp/bu.amount:0}})
  return <div className="space-y-3">
    <h1 className="text-xl font-semibold">anggaran bulan ini</h1>
    {rows.filter((r:any)=>r.p>=0.8).map((r:any)=><div key={r.c.id} className={'rounded-xl p-3 text-sm '+(r.p>=1?'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300':'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300')}>{r.c.name}: {r.p>=1?'melebihi anggaran':'sudah mencapai 80%'}</div>)}
    {rows.map((r:any)=><div key={r.c.id} className={card+' space-y-2'}>
      <div className="flex justify-between"><span className="font-medium">{r.c.name}</span><Lk onClick={()=>set(r.c)}>{r.bu?'ubah':'atur'}</Lk></div>
      {r.bu?<><Bar v={r.sp} max={r.bu.amount} c={r.p>=1?'bg-rose-500':r.p>=0.8?'bg-amber-500':'bg-blue-600'}/><div className="text-sm text-zinc-500">{rp(r.sp)} dari {rp(r.bu.amount)} ({Math.round(r.p*100)}%)</div></>:<div className="text-sm text-zinc-500">terpakai {rp(r.sp)} · belum ada anggaran</div>}
    </div>)}</div>}

export function Report({cats,tx}:any){
  const [o,setO]=useState(0)
  const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+o)
  const m=mkey(d),p=new Date(d);p.setMonth(p.getMonth()-1);const pm=mkey(p)
  const label=d.toLocaleDateString('id-ID',{month:'long',year:'numeric'})
  const ex=spent(tx,'expense',m),inc=spent(tx,'income',m),pex=spent(tx,'expense',pm),pin=spent(tx,'income',pm)
  const per=cats.filter((c:any)=>c.type==='expense').map((c:any)=>({c,v:spent(tx,'expense',m,c.id),pv:spent(tx,'expense',pm,c.id)})).filter((x:any)=>x.v||x.pv).sort((a:any,b:any)=>b.v-a.v)
  const mx=Math.max(1,...per.map((x:any)=>x.v))
  const six=[5,4,3,2,1,0].map(i=>{const x=new Date(d);x.setMonth(x.getMonth()-i);const k=mkey(x);return {l:x.toLocaleDateString('id-ID',{month:'short'}),i:spent(tx,'income',k),e:spent(tx,'expense',k)}})
  const m6=Math.max(1,...six.flatMap(x=>[x.i,x.e]))
  const diff=(a:number,b:number)=>a===b?'sama dengan bulan lalu':(a>b?'naik ':'turun ')+rp(Math.abs(a-b))+' dari bulan lalu'
  return <div className="space-y-3">
    <div className="flex items-center justify-between"><button className="p-2 text-xl" onClick={()=>setO(o-1)}>‹</button><h1 className="font-semibold capitalize">{label}</h1><button className="p-2 text-xl disabled:opacity-30" disabled={o>=0} onClick={()=>setO(o+1)}>›</button></div>
    <div className="grid grid-cols-2 gap-3">
      <div className={card}><div className="text-sm text-zinc-500">pemasukan</div><div className="text-lg text-emerald-600">{rp(inc)}</div><div className="text-xs text-zinc-500">{diff(inc,pin)}</div></div>
      <div className={card}><div className="text-sm text-zinc-500">pengeluaran</div><div className="text-lg text-rose-600">{rp(ex)}</div><div className="text-xs text-zinc-500">{diff(ex,pex)}</div></div></div>
    <div className={card+' space-y-3'}><h2 className="font-medium">pengeluaran per kategori</h2>
      {per.length?per.map((x:any)=><div key={x.c.id} className="space-y-1"><div className="flex justify-between text-sm"><span>{x.c.name}</span><span>{rp(x.v)}</span></div><Bar v={x.v} max={mx} c="bg-rose-400"/><div className="text-xs text-zinc-500">bulan lalu {rp(x.pv)}</div></div>):<p className="text-sm text-zinc-500">belum ada data</p>}</div>
    <div className={card}><h2 className="font-medium mb-3">6 bulan terakhir</h2>
      <div className="flex items-end justify-between h-28">{six.map((x,i)=><div key={i} className="flex flex-col items-center gap-1 flex-1"><div className="flex items-end gap-1 h-24"><div className="w-3 rounded-t bg-emerald-400" style={{height:x.i/m6*100+'%'}}/><div className="w-3 rounded-t bg-rose-400" style={{height:x.e/m6*100+'%'}}/></div><span className="text-xs text-zinc-500">{x.l}</span></div>)}</div>
      <p className="text-xs text-zinc-500 mt-2">hijau pemasukan, merah pengeluaran</p></div>
  </div>}

function Goals(){
  const [g,setG]=useState<any[]>([]),[n,setN]=useState(''),[t,setT]=useState('')
  const load=useCallback(async()=>{const {data}=await sb.from('savings_goals').select('*').order('created_at');setG(data||[])},[])
  useEffect(()=>{load()},[load])
  const add=async()=>{if(!n.trim()||!num(t))return;await sb.from('savings_goals').insert({family_id:await fid(),name:n.trim(),target_amount:num(t)});setN('');setT('');load()}
  const dep=async(x:any)=>{const v=num(prompt('tambah dana (rupiah)'));if(v){await sb.from('savings_goals').update({saved_amount:Number(x.saved_amount)+v}).eq('id',x.id);load()}}
  const del=async(x:any)=>{if(confirm('hapus target ini?')){await sb.from('savings_goals').delete().eq('id',x.id);load()}}
  return <Sec t="target tabungan">
    {g.map(x=><div key={x.id} className="space-y-1"><div className="flex justify-between"><span>{x.name}</span><span className="space-x-3"><Lk onClick={()=>dep(x)}>tambah</Lk><Lk c="text-rose-600" onClick={()=>del(x)}>hapus</Lk></span></div>
      <Bar v={x.saved_amount} max={x.target_amount} c="bg-emerald-500"/><div className="text-xs text-zinc-500">{rp(x.saved_amount)} dari {rp(x.target_amount)} ({Math.round(x.saved_amount/x.target_amount*100)}%)</div></div>)}
    <input className={inp} placeholder="nama target, mis. dana darurat" value={n} onChange={e=>setN(e.target.value)}/>
    <input className={inp} placeholder="jumlah target" inputMode="numeric" value={t} onChange={e=>setT(e.target.value.replace(/\D/g,''))}/>
    <button className={btn} onClick={add}>tambah target</button></Sec>}

function Debts(){
  const [g,setG]=useState<any[]>([]),[k,setK]=useState('utang'),[p,setP]=useState(''),[a,setA]=useState('')
  const load=useCallback(async()=>{const {data}=await sb.from('debts').select('*').order('created_at',{ascending:false});setG(data||[])},[])
  useEffect(()=>{load()},[load])
  const add=async()=>{if(!p.trim()||!num(a))return;await sb.from('debts').insert({family_id:await fid(),kind:k,person:p.trim(),amount:num(a)});setP('');setA('');load()}
  const pay=async(x:any)=>{const v=num(prompt('jumlah dibayar (rupiah)'));if(v){await sb.from('debts').update({paid_amount:Math.min(Number(x.amount),Number(x.paid_amount)+v)}).eq('id',x.id);load()}}
  const del=async(x:any)=>{if(confirm('hapus catatan ini?')){await sb.from('debts').delete().eq('id',x.id);load()}}
  return <Sec t="utang dan piutang">
    {g.map(x=><div key={x.id} className="flex justify-between items-center"><div><div>{x.person} <span className="text-xs text-zinc-500">{x.kind==='utang'?'saya berutang':'berutang ke saya'}</span></div>
      <div className="text-xs text-zinc-500">{Number(x.paid_amount)>=Number(x.amount)?'lunas':'sisa '+rp(x.amount-x.paid_amount)+' dari '+rp(x.amount)}</div></div>
      <span className="space-x-3">{Number(x.paid_amount)<Number(x.amount)&&<Lk onClick={()=>pay(x)}>bayar</Lk>}<Lk c="text-rose-600" onClick={()=>del(x)}>hapus</Lk></span></div>)}
    <select className={inp} value={k} onChange={e=>setK(e.target.value)}><option value="utang">saya berutang</option><option value="piutang">orang berutang ke saya</option></select>
    <input className={inp} placeholder="nama orang" value={p} onChange={e=>setP(e.target.value)}/>
    <input className={inp} placeholder="jumlah" inputMode="numeric" value={a} onChange={e=>setA(e.target.value.replace(/\D/g,''))}/>
    <button className={btn} onClick={add}>tambah catatan</button></Sec>}

function Recurring({cats}:any){
  const [g,setG]=useState<any[]>([]),[ty,setTy]=useState('expense'),[a,setA]=useState(''),[c,setC]=useState(''),[nt,setNt]=useState(''),[day,setDay]=useState('1')
  const load=useCallback(async()=>{const {data}=await sb.from('recurring').select('*').order('day_of_month');setG(data||[])},[])
  useEffect(()=>{load()},[load])
  const nextRun=(dd:number)=>{const n=new Date();let d=new Date(n.getFullYear(),n.getMonth(),dd);if(d<new Date(n.getFullYear(),n.getMonth(),n.getDate()))d=new Date(n.getFullYear(),n.getMonth()+1,dd);return ymd(d)}
  const add=async()=>{const dd=Math.min(28,Math.max(1,Number(day)||1));if(!num(a)||!c)return alert('isi nominal dan kategori')
    await sb.from('recurring').insert({family_id:await fid(),type:ty,amount:num(a),category_id:c,note:nt.trim(),day_of_month:dd,next_run:nextRun(dd)});setA('');setNt('');load()}
  const del=async(x:any)=>{if(confirm('hapus transaksi berulang ini?')){await sb.from('recurring').delete().eq('id',x.id);load()}}
  return <Sec t="transaksi berulang">
    {g.map(x=><div key={x.id} className="flex justify-between items-center"><div><div>{cats.find((k:any)=>k.id===x.category_id)?.name||'tanpa kategori'} · {rp(x.amount)}</div><div className="text-xs text-zinc-500">tiap tanggal {x.day_of_month}{x.note?' · '+x.note:''}</div></div><Lk c="text-rose-600" onClick={()=>del(x)}>hapus</Lk></div>)}
    <select className={inp} value={ty} onChange={e=>{setTy(e.target.value);setC('')}}><option value="expense">pengeluaran</option><option value="income">pemasukan</option></select>
    <input className={inp} placeholder="nominal" inputMode="numeric" value={a} onChange={e=>setA(e.target.value.replace(/\D/g,''))}/>
    <select className={inp} value={c} onChange={e=>setC(e.target.value)}><option value="">pilih kategori</option>{cats.filter((k:any)=>k.type===ty).map((k:any)=><option key={k.id} value={k.id}>{k.name}</option>)}</select>
    <input className={inp} placeholder="tanggal tiap bulan (1-28)" inputMode="numeric" value={day} onChange={e=>setDay(e.target.value.replace(/\D/g,''))}/>
    <input className={inp} placeholder="catatan, mis. cicilan motor" value={nt} onChange={e=>setNt(e.target.value)}/>
    <button className={btn} onClick={add}>tambah</button>
    <p className="text-xs text-zinc-500">transaksi dibuat otomatis saat aplikasi dibuka pada atau setelah tanggalnya</p></Sec>}

export function More({cats}:any){return <div className="space-y-3 pt-4"><Recurring cats={cats}/><Goals/><Debts/></div>}
