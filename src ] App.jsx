import React, { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Vote, Plus, Check, X as XIcon, HelpCircle, BarChart2, Send, Phone, Lock, Play, IdCard } from 'lucide-react'
import { Button } from './components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card.jsx'
import { Input } from './components/ui/input.jsx'
import { Textarea } from './components/ui/textarea.jsx'
import { Badge } from './components/ui/badge.jsx'

// Supabase client (lazy)
let supabase = null;
async function initSupabase() {
  if (supabase) return supabase
  const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  const mod = await import('@supabase/supabase-js').catch(() => ({}))
  if (!mod.createClient) return null
  supabase = mod.createClient(url, key, { auth: { persistSession: true } })
  return supabase
}

// Firebase auth (lazy)
let firebaseApp = null, firebaseAuth = null, firebaseConfirmResult = null
async function initFirebase() {
  if (firebaseApp && firebaseAuth) return { firebaseApp, firebaseAuth }
  try {
    const app = await import('firebase/app')
    const auth = await import('firebase/auth')
    const cfg = {
      apiKey: import.meta.env.NEXT_PUBLIC_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.NEXT_PUBLIC_FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID,
      messagingSenderId: import.meta.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    }
    firebaseApp = app.initializeApp(cfg)
    firebaseAuth = (await import('firebase/auth')).getAuth(firebaseApp)
    return { app, auth }
  } catch (e) { return {} }
}

async function firebaseSendSms(phone) {
  const { auth } = await initFirebase()
  if (!auth) throw new Error('Firebase not ready')
  try {
    const containerId = 'recaptcha-container'
    if (!document.getElementById(containerId)) {
      const div = document.createElement('div')
      div.id = containerId
      div.style.position = 'fixed'
      div.style.bottom = '-2000px'
      document.body.appendChild(div)
    }
    const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth')
    const verifier = new RecaptchaVerifier(firebaseAuth, containerId, { size: 'invisible' })
    firebaseConfirmResult = await signInWithPhoneNumber(firebaseAuth, phone, verifier)
    return true
  } catch (e) {
    firebaseConfirmResult = { confirm: async () => ({ user: { uid: 'demo' } }) }
    return true
  }
}

async function firebaseVerifyCode(code) {
  if (!firebaseConfirmResult) return code.trim().length >= 4
  try {
    const res = await firebaseConfirmResult.confirm(code)
    return !!res?.user
  } catch (e) { return false }
}

// DB helpers
async function saveVote(issueId, choice) {
  const client = await initSupabase()
  if (!client) return true
  await client.from('votes').insert({ issue_id: issueId, choice })
  return true
}
async function saveProposal(title, summary, category) {
  const client = await initSupabase()
  if (!client) return true
  await client.from('proposals').insert({ title, summary, category })
  return true
}

const initialIssues = [
  { id: 'federal-term-limits', title: 'Should Congress have 12-year total term limits?', detail: 'Proposed reform: Max 12 total years across the House/Senate. Existing members phase in after current term.', tags: ['Reform','Congress'], stats: { yes:1842, no:623, unsure:211 } },
  { id: 'single-subject-rule', title: 'Adopt a nationwide Single-Subject Rule for federal bills?', detail: 'Each bill must be one subject with a clear title — no hidden riders or unrelated spending.', tags: ['Transparency','Process'], stats: { yes:2215, no:188, unsure:97 } },
  { id: 'ban-corporate-donations', title: 'Ban direct corporate & PAC donations to members of Congress?', detail: 'Shift to small-dollar, individual contributions with real-time disclosure.', tags: ['Anti-Corruption'], stats: { yes:1999, no:301, unsure:155 } },
]

export default function App() {
  const [introDone, setIntroDone] = useState(false)
  useEffect(() => { const t = setTimeout(() => setIntroDone(true), 1200); return () => clearTimeout(t) }, [])

  const [verified, setVerified] = useState(false)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [idScanned, setIdScanned] = useState(false)
  const phoneOk = phone.replace(/\D/g, '').length >= 10
  const codeOk = code.trim().length >= 4

  async function simulateSmsSend() {
    try { await firebaseSendSms(phone); alert('Code sent via SMS (demo mode). In production, users receive a text.') }
    catch (e) { alert('Could not initialize SMS right now. Using demo mode.') }
  }
  function simulateScan() { setIdScanned(true) }
  async function completeVerify() {
    const codeOkNow = await firebaseVerifyCode(code)
    if (phoneOk && codeOkNow && idScanned) setVerified(true)
  }

  const [issues, setIssues] = useState(initialIssues)
  const [proposal, setProposal] = useState({ title:'', summary:'', category:'General' })
  const [submitting, setSubmitting] = useState(false)

  const totals = useMemo(() => issues.reduce((a,i)=>({ yes:a.yes+i.stats.yes, no:a.no+i.stats.no, unsure:a.unsure+i.stats.unsure }), {yes:0,no:0,unsure:0}), [issues])

  const [showAd, setShowAd] = useState(false)
  const [adAfterAction, setAdAfterAction] = useState(null)
  const [adSeconds, setAdSeconds] = useState(5)
  useEffect(()=>{ if(!showAd) return; setAdSeconds(5); const iv=setInterval(()=>setAdSeconds(s=>s>0?s-1:0),1000); return ()=>clearInterval(iv)},[showAd])
  function queueAdThen(run){ setAdAfterAction(()=>run); setShowAd(true) }
  function closeAd(){ setShowAd(false); const run = adAfterAction; setAdAfterAction(null); if(run) run() }

  function recordVote(id, choice){
    queueAdThen(()=>{
      setIssues(prev=>prev.map(i=>i.id===id?{...i, stats: {...i.stats, [choice]: i.stats[choice]+1 }}:i))
      saveVote(id, choice)
    })
  }
  function submitProposal(){
    if(!proposal.title.trim() || !proposal.summary.trim()) return
    setSubmitting(true)
    queueAdThen(()=>{
      const id = proposal.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
      const newIssue = { id, title: proposal.title.trim(), detail: proposal.summary.trim(), tags:[proposal.category], stats:{yes:0,no:0,unsure:0} }
      setIssues(prev=>[newIssue, ...prev])
      saveProposal(newIssue.title, newIssue.detail, proposal.category)
      setProposal({ title:'', summary:'', category:'General' })
      setSubmitting(false)
    })
  }

  return (
    <div>
      <header className="header">
        <div className="header-inner">
          <div style={{display:'flex', gap:12, alignItems:'center'}}>
            <Shield size={28} />
            <div>
              <div style={{fontWeight:600}}>WE THE PEOPLE</div>
              <div style={{fontSize:12, color:'var(--muted)'}}>One Nation. One Voice. One Vote.</div>
            </div>
          </div>
          <div>{!verified ? <span className="badge">Unverified</span> : <span className="badge" style={{background:'rgba(16,185,129,0.15)', borderColor:'rgba(16,185,129,0.35)'}}>Verified</span>}</div>
        </div>
      </header>

      <AnimatePresence>
        {!introDone && (
          <motion.section initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.6}} className="center" style={{position:'fixed', inset:0}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:28, fontWeight:700}}>WE THE PEOPLE</div>
              <div style={{fontSize:14, color:'var(--muted)', marginTop:8}}>One Nation. One Voice. One Vote.</div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <main className="container">
        <div className="panel" style={{marginBottom:16}}>
          <div style={{fontSize:18, fontWeight:600}}>Together, we shape our nation.</div>
          <div style={{fontSize:13, color:'var(--muted)', marginTop:6}}>Non‑partisan • Secure • Citizen‑led</div>
        </div>

        {!verified && (
          <div className="row row-2">
            <Card>
              <CardHeader><CardTitle><span style={{display:'inline-flex', alignItems:'center', gap:8}}><Phone size={18}/> Phone Verification</span></CardTitle></CardHeader>
              <CardContent>
                <Input placeholder="Your mobile number" value={phone} onChange={e=>setPhone(e.target.value)} />
                <div style={{height:8}}/>
                <div style={{display:'flex', gap:8}}>
                  <Button onClick={simulateSmsSend}>Send Code</Button>
                  <Input placeholder="Enter code" value={code} onChange={e=>setCode(e.target.value)} />
                </div>
                <div id="recaptcha-container"></div>
                <div style={{fontSize:12, color:'var(--muted)', marginTop:6}}>We use your phone to ensure one person = one vote.</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle><span style={{display:'inline-flex', alignItems:'center', gap:8}}><IdCard size={18}/> Driver’s License Scan</span></CardTitle></CardHeader>
              <CardContent>
                <div style={{fontSize:14, color:'rgba(255,255,255,0.8)'}}>Quickly scan the barcode on the back of your state ID. We verify, we don’t store.</div>
                <div style={{height:8}}/>
                <Button onClick={()=>setIdScanned(true)}><span style={{display:'inline-flex', alignItems:'center', gap:8}}><Play size={16}/> Scan ID (Demo)</span></Button>
                <div style={{fontSize:12, color:'var(--muted)', marginTop:6}}>We only confirm you’re a real US resident; we don’t keep images.</div>
              </CardContent>
            </Card>

            <div className="panel" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div style={{display:'inline-flex', alignItems:'center', gap:8, color:'rgba(255,255,255,0.8)', fontSize:14}}><Lock size={16}/> Complete both steps to continue.</div>
              <Button className="btn-green" disabled={!phoneOk || !codeOk || !idScanned} onClick={completeVerify}>Complete Verification</Button>
            </div>
          </div>
        )}

        {verified && (
          <div className="row row-3">
            <div style={{display:'grid', gap:16}}>
              {issues.map(i => (
                <Card key={i.id}>
                  <CardHeader><CardTitle><span style={{display:'inline-flex', alignItems:'center', gap:8}}><Vote size={16}/>{i.title}</span></CardTitle></CardHeader>
                  <CardContent>
                    <div style={{fontSize:14, color:'rgba(255,255,255,0.85)'}}>{i.detail}</div>
                    <div style={{height:8}}/>
                    <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                      {i.tags.map(t => <Badge key={t}>{t}</Badge>)}
                    </div>
                    <div style={{height:8}}/>
                    <div style={{display:'flex', gap:8}}>
                      <Button className="btn-green" onClick={()=>recordVote(i.id, 'yes')}><span style={{display:'inline-flex', alignItems:'center', gap:6}}><Check size={16}/> Yes</span></Button>
                      <Button className="btn-red" onClick={()=>recordVote(i.id, 'no')}><span style={{display:'inline-flex', alignItems:'center', gap:6}}><XIcon size={16}/> No</span></Button>
                      <Button onClick={()=>recordVote(i.id, 'unsure')}><span style={{display:'inline-flex', alignItems:'center', gap:6}}><HelpCircle size={16}/> Unsure</span></Button>
                    </div>
                    <div style={{fontSize:12, color:'var(--muted)', marginTop:6}}>Live totals update as Americans vote nationwide.</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div style={{display:'grid', gap:16}}>
              <Card>
                <CardHeader><CardTitle><span style={{display:'inline-flex', alignItems:'center', gap:8}}><BarChart2 size={16}/> National Totals</span></CardTitle></CardHeader>
                <CardContent>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, textAlign:'center'}}>
                    <div className="panel"><div style={{fontSize:12, color:'var(--muted)'}}>Yes</div><div style={{fontSize:22, fontWeight:600}}>{totals.yes.toLocaleString()}</div></div>
                    <div className="panel"><div style={{fontSize:12, color:'var(--muted)'}}>No</div><div style={{fontSize:22, fontWeight:600}}>{totals.no.toLocaleString()}</div></div>
                    <div className="panel"><div style={{fontSize:12, color:'var(--muted)'}}>Unsure</div><div style={{fontSize:22, fontWeight:600}}>{totals.unsure.toLocaleString()}</div></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle><span style={{display:'inline-flex', alignItems:'center', gap:8}}><Plus size={16}/> Submit a Proposal</span></CardTitle></CardHeader>
                <CardContent>
                  <Input placeholder="Proposal title (short & clear)" value={proposal.title} onChange={e=>setProposal({...proposal, title:e.target.value})} />
                  <div style={{height:8}}/>
                  <Textarea placeholder="Explain your idea in 2–3 sentences." value={proposal.summary} onChange={e=>setProposal({...proposal, summary:e.target.value})} />
                  <div style={{height:10}}/>
                  <div style={{display:'flex', justifyContent:'end'}}>
                    <Button disabled={submitting || !proposal.title || !proposal.summary} onClick={submitProposal}><span style={{display:'inline-flex', alignItems:'center', gap:6}}><Send size={16}/> Submit</span></Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showAd && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="overlay">
            <div className="card" style={{width:'560px', maxWidth:'92vw', background:'rgba(0,0,0,0.7)'}}>
              <div style={{padding:'16px'}}><strong><span style={{display:'inline-flex', alignItems:'center', gap:8}}><Play size={18}/>Sponsored Message</span></strong></div>
              <div style={{padding:'0 16px 16px'}}>
                <div className="aspect-video"><div>[ Skippable video ad placeholder ]</div></div>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', color:'var(--muted)', fontSize:12, marginTop:8}}>
                  <div>Ad ends in {adSeconds}s</div>
                  <Button onClick={closeAd}>{adSeconds > 0 ? 'Skip' : 'Close'}</Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="footer">© {new Date().getFullYear()} We The People. The People’s Voices Will Be Heard.</footer>
      <div id="recaptcha-container"></div>
    </div>
  )
}
