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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08060d]/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-3xl max-h-[85vh] glass-panel rounded-2xl border border-[#342847] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#342847]/60 bg-[#0d0a14]/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#241c33] text-[#f5b544]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-[#f5efe6]">{title}</h3>
                  <p className="text-xs text-[#a294b8] font-mono-num">
                    GHARANA Agent Raw Output Payload Inspection
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 text-[#a294b8] hover:text-[#f5efe6] hover:bg-[#241c33] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* JSON Content Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-[#08060d]/90 font-mono-num text-xs text-[#f5efe6]">
              <div className="flex justify-between items-center mb-3 text-[#a294b8] text-xs pb-2 border-b border-[#241c33]">
                <span className="flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-[#43c9a0]" />
                  JSON Representation (Unfiltered Agent State)
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#191324] hover:bg-[#241c33] border border-[#342847] text-[#f5efe6] transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#43c9a0]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#a294b8]" />
                      <span>Copy Payload</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-[#0d0a14] border border-[#241c33] overflow-x-auto text-[#f5efe6] leading-relaxed select-all">
                {jsonString}
              </pre>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[#342847]/60 bg-[#0d0a14]/80 flex justify-between items-center text-xs text-[#a294b8]">
              <span>Every GHARANA agent output is fully deterministic and inspectable.</span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-[#241c33] hover:bg-[#342847] text-[#f5efe6] font-medium transition-colors"
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
