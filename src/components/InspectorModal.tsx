import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  payload: any;
}

export const InspectorModal: React.FC<InspectorModalProps> = ({
  isOpen,
  onClose,
  title,
  payload
}) => {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(payload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-3xl max-h-[85vh] glass-panel rounded-2xl border border-line-strong shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line-strong/60 bg-bg/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-line text-caution">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-ink">{title}</h3>
                  <p className="text-xs text-muted font-mono-num">
                    GHARANA Agent Raw Output Payload Inspection
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 text-muted hover:text-ink hover:bg-line rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* JSON Content Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-bg/90 font-mono-num text-xs text-ink">
              <div className="flex justify-between items-center mb-3 text-muted text-xs pb-2 border-b border-line">
                <span className="flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-accent" />
                  JSON Representation (Unfiltered Agent State)
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface hover:bg-line border border-line-strong text-ink transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-accent" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-muted" />
                      <span>Copy Payload</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-bg border border-line overflow-x-auto text-ink leading-relaxed select-all">
                {jsonString}
              </pre>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-line-strong/60 bg-bg/80 flex justify-between items-center text-xs text-muted">
              <span>Every GHARANA agent output is fully deterministic and inspectable.</span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-line hover:bg-line-strong text-ink font-medium transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
