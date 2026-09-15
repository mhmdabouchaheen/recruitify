import { useState } from 'react'
import { AppShell } from './layouts/AppShell'
import { Overview } from './pages/Overview'
import './App.css'
export default function App(){const[mobileNavOpen,setMobileNavOpen]=useState(false);return <AppShell mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen}><Overview/></AppShell>}
