import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

type Action = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
};

const AdminModal: React.FC<{
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
  actions?: Action[];
}> = ({ isOpen, title, onClose, children, actions }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="rounded-xl bg-[#0d0d0d] border border-[#ff7a19]/20 shadow-lg p-6 max-w-md w-full"
            onClick={(e:any) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-modal-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="admin-modal-title" className="text-lg font-semibold text-white">
                {title}
              </h3>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 rounded-full bg-white/6 hover:bg-white/8 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="mb-4 text-gray-200">{children}</div>

            {actions && (
              <div className="flex items-center justify-end gap-3">
                {actions.map((a, idx) => (
                  <button
                    key={idx}
                    onClick={a.onClick}
                    disabled={a.disabled}
                    className={`px-4 py-2 rounded-md font-medium transition ${
                      a.variant === 'primary'
                        ? 'bg-[#ff8c00] text-black'
                        : a.variant === 'danger'
                        ? 'bg-red-600 text-white'
                        : 'bg-white/6 text-white'
                    } ${a.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminModal;
