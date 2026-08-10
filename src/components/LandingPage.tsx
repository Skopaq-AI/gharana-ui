import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Sparkles, 
  Sliders, 
  BookOpen, 
  Shield, 
  Rocket, 
  TrendingUp, 
  Store, 
  ArrowRight, 
  CheckCircle2, 
  Disc, 
  Music, 
  Volume2, 
  Layers, 
  Activity, 
  Globe, 
  Terminal, 
  Check, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Radio,
  FileText,
  Lock,
  Code2,
  Mail
} from 'lucide-react';
import { motion } from 'motion/react';
import { FooterModals, FooterModalType } from './FooterModals';

interface LandingPageProps {
  onLaunchStudio: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchStudio }) => {
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [activeModal, setActiveModal] = useState<FooterModalType>(null);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'ar' | 'lyrics' | 'qc' | 'splits'>('ar');

  // Animated Waveform Bars state for demo player
  const [waveHeights, setWaveHeights] = useState<number[]>(
    Array.from({ length: 28 }, () => Math.floor(Math.random() * 60) + 20)
  );

  useEffect(() => {
    let interval: any;
    if (isPlayingDemo) {
      interval = setInterval(() => {
        setWaveHeights(
          Array.from({ length: 28 }, () => Math.floor(Math.random() * 75) + 15)
        );
      }, 120);
    } else {
      setWaveHeights(Array.from({ length: 28 }, () => 20));
    }
    return () => clearInterval(interval);
  }, [isPlayingDemo]);

  // Framer Motion animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#08060d] text-[#f5efe6] font-sans selection:bg-[#f2542d] selection:text-white overflow-x-hidden">
      
      {/* 1. TOP NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#08060d]/85 backdrop-blur-xl border-b border-[#241c33]/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f2542d] via-[#ffd48a] to-[#43c9a0] p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(242,84,45,0.3)]">
            <div className="w-full h-full bg-[#08060d] rounded-[10px] flex items-center justify-center">
              <Disc className="w-5 h-5 text-[#f2542d] animate-spin-slow" />
            </div>
          </div>
          <div>
            <span className="font-serif text-lg font-bold tracking-tight text-[#f5efe6]">
              GHARANA
            </span>
            <span className="ml-2 font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#241c33] text-[#ffd48a] border border-[#342847]">
              Studio OS 2.4
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 font-mono text-xs text-[#a294b8]">
          <a href="#features" className="hover:text-[#f5efe6] transition-colors">Core Features</a>
          <a href="#demo" className="hover:text-[#f5efe6] transition-colors">Interactive Engine</a>
          <a href="#agents" className="hover:text-[#f5efe6] transition-colors">Agent Ecosystem</a>
          <a href="#compliance" className="hover:text-[#f5efe6] transition-colors">Rights & DDEX</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLaunchStudio}
            className="px-4 py-2 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white font-mono text-xs font-bold transition-all shadow-lg hover:shadow-[#f2542d]/30 flex items-center gap-2 group"
          >
            <span>Launch Studio App</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-24 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#f2542d]/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[250px] bg-[#ffd48a]/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="space-y-6 max-w-4xl relative z-10"
        >
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#120e1b] border border-[#342847] text-xs font-mono text-[#ffd48a]">
            <Sparkles className="w-4 h-4 text-[#ffd48a]" />
            <span>Autonomous AI Music Operating System for Independent Labels</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#43c9a0] animate-pulse" />
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl font-bold leading-[1.12] text-[#f5efe6] tracking-tight">
            From Raw Audio Master to <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#f2542d] via-[#ffd48a] to-[#43c9a0]">
              100% Cleared Global Release
            </span>
          </h1>

          <p className="font-sans text-base sm:text-lg text-[#a294b8] max-w-2xl mx-auto leading-relaxed">
            GHARANA replaces fragmented studio checklists with specialized AI agents for <strong className="text-[#f5efe6] font-medium">Telugu Prosody, A&R Direction, DSP Loudness QC, and Copyright Split Governance</strong>.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onLaunchStudio}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white font-mono text-sm font-bold transition-all shadow-xl hover:shadow-[#f2542d]/40 flex items-center justify-center gap-2.5 group"
            >
              <Zap className="w-4 h-4 fill-current text-white" />
              <span>Enter GHARANA Studio</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#demo"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#120e1b] hover:bg-[#191324] border border-[#241c33] text-[#f5efe6] font-mono text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4 text-[#ffd48a]" />
              <span>Test Audio Engine Demo</span>
            </a>
          </div>

          {/* Key Stats Bar */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-[#120e1b]/80 border border-[#241c33]">
              <div className="font-mono text-2xl font-bold text-[#43c9a0]">100%</div>
              <div className="font-mono text-[11px] text-[#a294b8]">Split Sheet Enforcement</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#120e1b]/80 border border-[#241c33]">
              <div className="font-mono text-2xl font-bold text-[#ffd48a]">-0.5 dBTP</div>
              <div className="font-mono text-[11px] text-[#a294b8]">DSP True Peak QC</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#120e1b]/80 border border-[#241c33]">
              <div className="font-mono text-2xl font-bold text-[#f2542d]">12+</div>
              <div className="font-mono text-[11px] text-[#a294b8]">Indic Prosody Engines</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#120e1b]/80 border border-[#241c33]">
              <div className="font-mono text-2xl font-bold text-[#f5efe6]">DDEX 4.3</div>
              <div className="font-mono text-[11px] text-[#a294b8]">XML Export Format</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. INTERACTIVE AUDIO & WAVEFORM DEMO SECTION */}
      <section id="demo" className="py-20 px-4 sm:px-8 bg-[#0d0a14] border-y border-[#241c33] relative">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-center space-y-3 max-w-2xl mx-auto"
          >
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#f2542d]/10 text-[#f2542d] border border-[#f2542d]/30 font-bold">
              REAL-TIME MASTER AUDIO QC
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#f5efe6]">
              Live DSP Waveform & LUFS Analyzer
            </h2>
            <p className="font-mono text-xs text-[#a294b8]">
              Test GHARANA's real-time audio analysis engine. Simulates integrated LUFS, True Peak ceiling, and stereo phase correlation.
            </p>
          </motion.div>

          {/* Interactive Player Component */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#120e1b] border border-[#342847] shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#241c33]">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                  className="w-14 h-14 rounded-2xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white flex items-center justify-center transition-all shadow-lg hover:scale-105"
                >
                  {isPlayingDemo ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#f5efe6]">
                    Neeve Evvaro (Telugu Synth Fusion Master)
                  </h3>
                  <p className="font-mono text-xs text-[#a294b8]">
                    Artist: Gharana Session Band • 24-bit / 48kHz WAV • Integrated: -14.2 LUFS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#08060d] border border-[#241c33] font-mono text-xs text-[#43c9a0]">
                <ShieldCheck className="w-4 h-4" />
                <span>Spotify & Apple Music Compliant</span>
              </div>
            </div>

            {/* Dynamic Waveform Display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#a294b8]">
                <span>DSP Spectrum Analyzer</span>
                <span className="text-[#ffd48a]">True Peak: -1.1 dBTP (Limit: -0.5)</span>
              </div>
              <div className="h-28 bg-[#08060d] rounded-2xl border border-[#241c33] p-4 flex items-center justify-between gap-1.5 overflow-hidden">
                {waveHeights.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full transition-all duration-150"
                    style={{
                      height: `${h}%`,
                      backgroundColor: i % 3 === 0 ? '#f2542d' : i % 2 === 0 ? '#ffd48a' : '#43c9a0',
                      opacity: isPlayingDemo ? 0.9 : 0.4
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-[#08060d] border border-[#241c33]">
                <div className="text-[10px] font-mono text-[#a294b8]">INTEGRATED LUFS</div>
                <div className="font-mono text-sm font-bold text-[#43c9a0]">-14.2 LUFS</div>
              </div>
              <div className="p-3 rounded-xl bg-[#08060d] border border-[#241c33]">
                <div className="text-[10px] font-mono text-[#a294b8]">DYNAMIC RANGE</div>
                <div className="font-mono text-sm font-bold text-[#ffd48a]">8.5 LU</div>
              </div>
              <div className="p-3 rounded-xl bg-[#08060d] border border-[#241c33]">
                <div className="text-[10px] font-mono text-[#a294b8]">STEREO WIDTH</div>
                <div className="font-mono text-sm font-bold text-[#f2542d]">1.00 (Balanced)</div>
              </div>
              <div className="p-3 rounded-xl bg-[#08060d] border border-[#241c33]">
                <div className="text-[10px] font-mono text-[#a294b8]">PROSODY SCORE</div>
                <div className="font-mono text-sm font-bold text-[#43c9a0]">96% Match</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURE PILLARS WITH SCROLL ANIMATION */}
      <section id="features" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="text-center space-y-3 max-w-3xl mx-auto"
        >
          <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#ffd48a]/10 text-[#ffd48a] border border-[#ffd48a]/30 font-bold">
            END-TO-END MUSIC OS ARCHITECTURE
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#f5efe6]">
            5 Autonomous Pillars of GHARANA
          </h2>
          <p className="font-mono text-xs text-[#a294b8]">
            Designed specifically to eliminate friction between South Asian independent artists and global digital distribution networks.
          </p>
        </motion.div>

        {/* Features Staggered Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Feature 1 */}
          <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-4 hover:border-[#f2542d]/50 transition-all group">
            <div className="p-3 rounded-xl bg-[#f2542d]/10 border border-[#f2542d]/30 text-[#f2542d] w-fit">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#f5efe6] group-hover:text-[#f2542d] transition-colors">
              AI A&R & Cultural Analysis
            </h3>
            <p className="font-sans text-xs text-[#a294b8] leading-relaxed">
              Provides commercial positioning, lyric mood mapping, and genre alignment before submitting audio to streaming playlist editors.
            </p>
            <ul className="space-y-1.5 font-mono text-[11px] text-[#d0c8dc]">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> Commercial & Sync Potential Scoring</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> Lyric Narrative Summary Engine</li>
            </ul>
          </motion.div>

          {/* Feature 2 */}
          <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-4 hover:border-[#ffd48a]/50 transition-all group">
            <div className="p-3 rounded-xl bg-[#ffd48a]/10 border border-[#ffd48a]/30 text-[#ffd48a] w-fit">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#f5efe6] group-hover:text-[#ffd48a] transition-colors">
              Indic Language Prosody Engine
            </h3>
            <p className="font-sans text-xs text-[#a294b8] leading-relaxed">
              Evaluates poetic rhythm, syllable stress (Chandas meter), and pronunciation accuracy across Telugu, Tamil, Hindi, Punjabi, and Malayalam.
            </p>
            <ul className="space-y-1.5 font-mono text-[11px] text-[#d0c8dc]">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> Guru / Laghu Syllabic Counting</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> Dialect & Pronunciation Guidance</li>
            </ul>
          </motion.div>

          {/* Feature 3 */}
          <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-4 hover:border-[#43c9a0]/50 transition-all group">
            <div className="p-3 rounded-xl bg-[#43c9a0]/10 border border-[#43c9a0]/30 text-[#43c9a0] w-fit">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#f5efe6] group-hover:text-[#43c9a0] transition-colors">
              DSP Master Audio QC
            </h3>
            <p className="font-sans text-xs text-[#a294b8] leading-relaxed">
              Automates technical validation for Spotify, Apple Music, and YouTube Audio specifications to prevent distortion or rejection.
            </p>
            <ul className="space-y-1.5 font-mono text-[11px] text-[#d0c8dc]">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> Integrated LUFS & True Peak Check</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> Frequency Spectrum Analysis</li>
            </ul>
          </motion.div>

          {/* Feature 4 */}
          <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-4 hover:border-[#43c9a0]/50 transition-all group">
            <div className="p-3 rounded-xl bg-[#43c9a0]/10 border border-[#43c9a0]/30 text-[#43c9a0] w-fit">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#f5efe6] group-hover:text-[#43c9a0] transition-colors">
              Rights & Split Governance
            </h3>
            <p className="font-sans text-xs text-[#a294b8] leading-relaxed">
              Calculates legally sound split sheets separating Composition Copyright and Master Recording Copyright to exactly 100%.
            </p>
            <ul className="space-y-1.5 font-mono text-[11px] text-[#d0c8dc]">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> Copyright Act 1957 Compliance</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> Inspectable Wire Payload Export</li>
            </ul>
          </motion.div>

          {/* Feature 5 */}
          <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-4 hover:border-[#f2542d]/50 transition-all group">
            <div className="p-3 rounded-xl bg-[#f2542d]/10 border border-[#f2542d]/30 text-[#f2542d] w-fit">
              <Rocket className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#f5efe6] group-hover:text-[#f2542d] transition-colors">
              DDEX Release Delivery
            </h3>
            <p className="font-sans text-xs text-[#a294b8] leading-relaxed">
              Orchestrates editorial pitches, artwork aspect ratio compliance, and automated release pipeline checklists.
            </p>
            <ul className="space-y-1.5 font-mono text-[11px] text-[#d0c8dc]">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> DDEX ERN 4.3 Standard XML</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> Human Sign-Off Checkpoints</li>
            </ul>
          </motion.div>

          {/* Feature 6 */}
          <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-4 hover:border-[#ffd48a]/50 transition-all group">
            <div className="p-3 rounded-xl bg-[#ffd48a]/10 border border-[#ffd48a]/30 text-[#ffd48a] w-fit">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#f5efe6] group-hover:text-[#ffd48a] transition-colors">
              Agent Ecosystem Marketplace
            </h3>
            <p className="font-sans text-xs text-[#a294b8] leading-relaxed">
              Extend your label's studio with third-party agents for Gazal Prosody, WhatsApp Nudge Bots, and Royalty Accounting.
            </p>
            <ul className="space-y-1.5 font-mono text-[11px] text-[#d0c8dc]">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> Verified Agent Provenance</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#43c9a0]" /> One-Click Studio Installation</li>
            </ul>
          </motion.div>
        </motion.div>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="py-20 px-4 sm:px-8 max-w-6xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#120e1b] via-[#191324] to-[#0d0a14] border border-[#342847] text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f2542d]/10 rounded-full blur-[80px] pointer-events-none" />
          
          <span className="font-mono text-xs px-3.5 py-1.5 rounded-full bg-[#f2542d]/10 text-[#f2542d] border border-[#f2542d]/30 font-bold">
            READY FOR DEPLOYMENT
          </span>

          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#f5efe6] max-w-2xl mx-auto leading-tight">
            Accelerate Your Independent Music Catalog
          </h2>

          <p className="font-sans text-sm text-[#a294b8] max-w-xl mx-auto">
            Experience the full autonomous studio pipeline with instant track ingestion, real-time waveform inspection, and human checkpoint governance.
          </p>

          <button
            onClick={onLaunchStudio}
            className="px-8 py-4 rounded-2xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white font-mono text-sm font-bold transition-all shadow-xl hover:shadow-[#f2542d]/40 inline-flex items-center gap-3 group"
          >
            <span>Launch GHARANA Studio OS</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* 6. MANDATORY FOOTER WITH ALL LEGAL & TECHNICAL PAGES */}
      <footer className="border-t border-[#241c33] bg-[#050409] text-[#a294b8] font-mono text-xs pt-16 pb-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-[#241c33]">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f2542d] to-[#43c9a0] p-0.5 flex items-center justify-center">
                <Disc className="w-4 h-4 text-[#08060d]" />
              </div>
              <span className="font-serif text-base font-bold text-[#f5efe6]">GHARANA</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#a294b8]">
              Autonomous Music Operating System & Rights Engine for Independent Labels in South Asia.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-[#43c9a0]">
              <span className="w-2 h-2 rounded-full bg-[#43c9a0] animate-pulse" />
              <span>DDEX ERN Tier 1 Systems Operational</span>
            </div>
          </div>

          {/* Col 2: Mandatory Pages */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-bold text-[#f5efe6]">Mandatory Legal Pages</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button
                  onClick={() => setActiveModal('terms')}
                  className="hover:text-[#ffd48a] transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#ffd48a]" />
                  <span>Terms of Service</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveModal('privacy')}
                  className="hover:text-[#43c9a0] transition-colors flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-[#43c9a0]" />
                  <span>Privacy Policy & Data Security</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveModal('copyright')}
                  className="hover:text-[#f2542d] transition-colors flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-[#f2542d]" />
                  <span>Copyright Act 1957 Compliance</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Technical & API Docs */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-bold text-[#f5efe6]">Technical & API Docs</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button
                  onClick={() => setActiveModal('api')}
                  className="hover:text-[#ffd48a] transition-colors flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5 text-[#ffd48a]" />
                  <span>REST API & DDEX Integration</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveModal('contact')}
                  className="hover:text-[#43c9a0] transition-colors flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-[#43c9a0]" />
                  <span>Label Support & Contact</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Studio Direct Access */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-bold text-[#f5efe6]">Studio Navigation</h4>
            <p className="text-[11px] text-[#a294b8]">
              Switch into the live workspace to manage tracks, DSP mix QC, and agent marketplace.
            </p>
            <button
              onClick={onLaunchStudio}
              className="px-4 py-2 rounded-xl bg-[#241c33] hover:bg-[#342847] text-[#f5efe6] font-bold text-xs transition-colors flex items-center gap-2 border border-[#342847]"
            >
              <span>Launch Studio App</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#f2542d]" />
            </button>
          </div>

        </div>

        {/* Bottom Copyright Bar */}
        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            © {new Date().getFullYear()} GHARANA Autonomous Studio OS. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[#a294b8]">
            <span>Deterministic AI Pipeline</span>
            <span>•</span>
            <span>Indian Copyright Act Compliant</span>
          </div>
        </div>
      </footer>

      {/* Render Footer Modals */}
      <FooterModals activeModal={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
};
