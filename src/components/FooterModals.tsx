import React, { useState } from 'react';
import { X, Shield, FileText, Lock, Code2, Mail, CheckCircle2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type FooterModalType = 'terms' | 'privacy' | 'copyright' | 'api' | 'contact' | null;

interface FooterModalsProps {
  activeModal: FooterModalType;
  onClose: () => void;
}

export const FooterModals: React.FC<FooterModalsProps> = ({ activeModal, onClose }) => {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', role: 'Label Owner', message: '' });

  if (!activeModal) return null;

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08060d]/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-3xl max-h-[85vh] bg-[#120e1b] rounded-2xl border border-[#342847] shadow-2xl flex flex-col overflow-hidden text-[#f5efe6]"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#241c33] bg-[#0d0a14]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#241c33] text-[#f2542d]">
                {activeModal === 'terms' && <FileText className="w-5 h-5 text-[#ffd48a]" />}
                {activeModal === 'privacy' && <Lock className="w-5 h-5 text-[#43c9a0]" />}
                {activeModal === 'copyright' && <Shield className="w-5 h-5 text-[#f2542d]" />}
                {activeModal === 'api' && <Code2 className="w-5 h-5 text-[#ffd48a]" />}
                {activeModal === 'contact' && <Mail className="w-5 h-5 text-[#43c9a0]" />}
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#f5efe6]">
                  {activeModal === 'terms' && 'Terms of Service & Usage Governance'}
                  {activeModal === 'privacy' && 'Privacy Policy & Data Security'}
                  {activeModal === 'copyright' && 'Copyright Act Compliance & Licensing'}
                  {activeModal === 'api' && 'GHARANA API & DDEX Integration'}
                  {activeModal === 'contact' && 'Contact GHARANA Label Support'}
                </h3>
                <p className="font-mono text-xs text-[#a294b8]">
                  GHARANA Autonomous Studio OS • Official Legal & Technical Documentation
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-[#a294b8] hover:text-[#f5efe6] hover:bg-[#241c33] rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs font-sans text-[#d0c8dc] leading-relaxed">
            {activeModal === 'terms' && (
              <>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#ffd48a]">1. Acceptance of Terms</h4>
                  <p>
                    By accessing or using GHARANA OS, you agree to bound by these terms. GHARANA is designed specifically for music labels, artist managers, and independent creators executing master recordings, prosody analysis, and split governance.
                  </p>
                </section>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#ffd48a]">2. AI Agent Processing & Determinism</h4>
                  <p>
                    All agent computations (A&R assessments, Lyric Prosody checks, DSP Master QC, and Split sheets) operate under human-in-the-loop checkpoints. Final release decisions remain strictly under human artist/label sign-off.
                  </p>
                </section>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#ffd48a]">3. Royalty & Ownership Guarantees</h4>
                  <p>
                    GHARANA claims 0% ownership of intellectual property processed through the system. Masters, compositions, lyrics, and metadata belong entirely to the respective rights holders registered in the Split Governance engine.
                  </p>
                </section>
              </>
            )}

            {activeModal === 'privacy' && (
              <>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#43c9a0]">1. Audio & Lyric Data Confidentiality</h4>
                  <p>
                    Unreleased audio stems, master mixes, and lyrics uploaded to GHARANA are processed in isolated encrypted instances. Zero audio data is used to train public machine learning models without explicit written opt-in.
                  </p>
                </section>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#43c9a0]">2. Encryption & Key Management</h4>
                  <p>
                    All API keys, DDEX partner payloads, and WhatsApp phone credentials are encrypted at rest using AES-256 and transmitted over TLS 1.3 endpoints.
                  </p>
                </section>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#43c9a0]">3. Data Retention & Erasure</h4>
                  <p>
                    You maintain full control to wipe unreleased track data, stem metrics, and draft lyrics permanently from GHARANA's active cache at any time.
                  </p>
                </section>
              </>
            )}

            {activeModal === 'copyright' && (
              <>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#f2542d]">1. Indian Copyright Act 1957 Compliance</h4>
                  <p>
                    GHARANA split sheets strictly segregate Composition Copyright (under Section 13(1)(a)) and Recording Sound Master Copyright (under Section 13(1)(c)). Both shares must equal mathematically 100.00% prior to release payload export.
                  </p>
                </section>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#f2542d]">2. Performance Rights Organizations (PROs)</h4>
                  <p>
                    Supports auto-generated registrations for IPRS (Indian Performing Right Society), PPL India, ISRA (Indian Singers Rights Association), and global PROs (BMI, ASCAP, PRS for Music).
                  </p>
                </section>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#f2542d]">3. ISWC & ISRC Allocation</h4>
                  <p>
                    GHARANA validates international standard recording codes (ISRC) and international standard musical work codes (ISWC) to prevent catalog collision across DSP distributors.
                  </p>
                </section>
              </>
            )}

            {activeModal === 'api' && (
              <>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#ffd48a]">1. REST & GraphQL Endpoints</h4>
                  <p className="font-mono text-[11px] text-[#43c9a0] bg-[#08060d] p-2 rounded-lg border border-[#241c33]">
                    POST https://api.gharana.studio/v1/tracks/analyze-mix<br />
                    GET https://api.gharana.studio/v1/splits/wire-json
                  </p>
                  <p>
                    Integrate GHARANA agent pipelines into existing studio DAWs, distributor dashboards, or label web portals via standard JSON payloads.
                  </p>
                </section>
                <section className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-[#ffd48a]">2. DDEX ERN 4.3 XML Standard</h4>
                  <p>
                    All delivery bundles export fully formatted DDEX Electronic Release Notification XML files compatible with Spotify, Apple Music, YouTube Content ID, and JioSaavn.
                  </p>
                </section>
              </>
            )}

            {activeModal === 'contact' && (
              <div>
                {contactSubmitted ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="inline-flex p-3 rounded-full bg-[#43c9a0]/10 text-[#43c9a0] border border-[#43c9a0]/30">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="font-serif text-lg font-bold text-[#f5efe6]">Message Dispatched!</h4>
                    <p className="font-mono text-xs text-[#a294b8]">
                      Our GHARANA Label Engineering team will respond within 4 business hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-mono text-[11px] text-[#a294b8] mb-1">Your Name</label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="AR Director / Producer"
                          className="w-full px-3 py-2 rounded-xl bg-[#08060d] border border-[#241c33] text-xs text-[#f5efe6] focus:outline-none focus:border-[#f2542d]"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[11px] text-[#a294b8] mb-1">Work Email</label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="label@music.com"
                          className="w-full px-3 py-2 rounded-xl bg-[#08060d] border border-[#241c33] text-xs text-[#f5efe6] focus:outline-none focus:border-[#f2542d]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-[#a294b8] mb-1">Organization Role</label>
                      <select
                        value={contactForm.role}
                        onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#08060d] border border-[#241c33] text-xs text-[#f5efe6] focus:outline-none focus:border-[#f2542d]"
                      >
                        <option value="Label Owner">Independent Music Label</option>
                        <option value="A&R Manager">A&R / Catalog Director</option>
                        <option value="Mixing Engineer">Mixing & Mastering Engineer</option>
                        <option value="Artist">Independent Recording Artist</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] text-[#a294b8] mb-1">How can we support your catalog pipeline?</label>
                      <textarea
                        rows={3}
                        required
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Detail your label's annual release volume or custom agent requirements..."
                        className="w-full px-3 py-2 rounded-xl bg-[#08060d] border border-[#241c33] text-xs text-[#f5efe6] focus:outline-none focus:border-[#f2542d]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white font-mono text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Message to Label Team</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 border-t border-[#241c33] bg-[#0d0a14] flex justify-between items-center text-xs text-[#a294b8] font-mono">
            <span>GHARANA v2.4 • Music OS</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#241c33] hover:bg-[#342847] text-[#f5efe6] font-bold transition-colors"
            >
              Close Window
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
