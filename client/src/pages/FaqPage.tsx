import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, X, Upload, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";

interface FAQItem {
  question: string;
  answer: string;
}

interface TicketFile {
  file: File;
  preview: string;
  type: "image" | "pdf" | "doc";
}

const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<TicketFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: "", type: "success" as "success" | "error" });
  const { user, token } = useAuth();

  const faqs: FAQItem[] = [
    {
      question: "What is SportSphere?",
      answer:
        "SportSphere is a sports ecosystem platform that helps players book venues, find teammates, and connect with certified coaches — all in one place.",
    },
    {
      question: "How do I register as a player?",
      answer:
        "You can sign up using your email, phone number (with OTP verification), or Google account. Registration takes less than a minute.",
    },
    {
      question: "Do I need to verify my account before using the platform?",
      answer:
        "Yes, verification ensures security and helps maintain trust among all users. Unverified accounts may have limited access to booking and review features.",
    },
    {
      question: "How can I search for venues to play?",
      answer:
        'Go to the "Find Venues" section and use filters such as sport type, location, price, and availability to get suitable results.',
    },
    {
      question: "Can I host my own game and invite players?",
      answer:
        "Yes! Players can host games by adding details like sport type, required number of players, and venue location. Other players nearby will receive notifications to join.",
    },
    {
      question: "How can I join games hosted by others?",
      answer:
        'Simply browse available games under "Join a Game." You can send a join request, and once the host approves, you\'ll receive a confirmation notification.',
    },
    {
      question: "How do I book a venue slot?",
      answer:
        "Select a venue, choose a date and time slot, and proceed to checkout. You can pay securely via UPI, cards, or digital wallets.",
    },
    {
      question: "What happens if I need to cancel my booking?",
      answer:
        'You can cancel through "My Bookings." Refunds are processed automatically if the cancellation follows the venue\'s refund policy.',
    },
    {
      question: "How will I be notified about my bookings and games?",
      answer:
        "You'll receive instant booking confirmations and reminder notifications before each scheduled game.",
    },
    {
      question: "Can I reschedule a booking?",
      answer:
        "Yes, you can reschedule through your booking dashboard as long as the new slot is available and within the allowed timeframe.",
    },
    {
      question: "How can I find and book a coach?",
      answer:
        'Use the "Find Coaches" tab to search by sport and experience. You can view their profiles, check ratings, and book available time slots.',
    },
    {
      question: "How are payments handled securely?",
      answer:
        "All transactions are encrypted and processed through verified payment gateways. Your card and UPI details are never stored on the platform.",
    },
    {
      question: "Can I rate or review a venue or coach?",
      answer:
        "Yes, after completing a session or game, you can leave a rating and written review that helps other players make informed choices.",
    },
    {
      question: "What if I have an issue or need help?",
      answer:
        "Visit the in-app Help & Support section, which includes a detailed FAQ and an option to contact customer service for further assistance.",
    },
    {
      question: "Does SportSphere have an AI assistant?",
      answer:
        "Yes, SportSphere includes an AI assistant that can instantly answer your queries, guide you through booking steps, and provide game recommendations based on your activity.",
    },
  ];

  const filteredFaqs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const allowed = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB

    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    let processedCount = 0;
    const totalFiles = selectedFiles.length;

    selectedFiles.forEach((file) => {
      if (!allowed.has(file.type)) {
        setToast({ isVisible: true, message: 'Invalid file type. Allowed: PDF, JPG, JPEG, PNG', type: 'error' });
        processedCount++;
        if (processedCount === totalFiles) setIsUploading(false);
        return;
      }
      if (file.size > MAX_BYTES) {
        setToast({ isVisible: true, message: 'File too large. Maximum size is 5MB', type: 'error' });
        processedCount++;
        if (processedCount === totalFiles) setIsUploading(false);
        return;
      }

      const fileType = file.type;
      let type: "image" | "pdf" | "doc" = "doc";
      if (fileType.startsWith("image/")) type = "image";
      else if (fileType === "application/pdf") type = "pdf";

      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        setFiles((prev) => [...prev, { file, preview, type }]);
        processedCount++;
        if (processedCount === totalFiles) {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setToast({ isVisible: true, message: 'Error reading file', type: 'error' });
        processedCount++;
        if (processedCount === totalFiles) {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitTicket = async () => {
    if (!subject || !category || !description) {
      setToast({
        isVisible: true,
        message: "Please fill in all required fields",
        type: "error",
      });
      return;
    }

    if (isUploading) {
      setToast({
        isVisible: true,
        message: "Please wait for the file to finish uploading",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Use FormData to include multiple optional files
      const form = new FormData();
      form.append('subject', subject);
      form.append('category', category);
      form.append('description', description);
      form.append('userName', user?.username || 'Guest User');
      form.append('userEmail', user?.email || 'guest@example.com');
      // Append all files - multer.any() will handle multiple files with any field name
      files.forEach((fileItem) => {
        if (fileItem.file) {
          form.append('attachments', fileItem.file, fileItem.file.name);
        }
      });

      // Use BASE_URL from environment or relative path
      const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
      const apiUrl = `${API_BASE}/api/tickets`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          // Do NOT set Content-Type; browser will set multipart boundary automatically
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errorMessage = err.message || err.errors?.message || 'Failed to submit ticket';
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      // Reset form
      setSubject('');
      setCategory('');
      setDescription('');
      setFiles([]);
      setIsTicketModalOpen(false);
      setIsSubmitting(false);

      // Show success toast
      setToast({ isVisible: true, message: 'Ticket submitted successfully!', type: 'success' });
    } catch (err: any) {
      setIsSubmitting(false);
      console.error('Ticket submission error:', err);
      const errorMessage = err.message || 'Submission failed. Please try again.';
      setToast({ isVisible: true, message: errorMessage, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-8 md:px-16 py-20 max-w-4xl mx-auto">
        {/* Title with fade-in animation */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-black text-foreground text-center mb-12"
        >
          Frequently Asked <span className="text-primary">Questions</span>
        </motion.h1>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60 transition-all duration-300"
            />
          </div>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-4 mb-8"
        >
          <AnimatePresence>
            {filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all shadow-md shadow-gray-800/30"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-primary/5 transition-all duration-300 ease-in-out group relative z-10"
                  >
                    <span className="text-foreground font-black text-lg pr-4 group-hover:text-primary transition-colors duration-300">
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden relative z-10"
                      >
                        <div className="px-6 pb-4">
                          <p className="text-muted-foreground text-base leading-relaxed mt-3">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* No results message */}
          {filteredFaqs.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-muted-foreground text-lg">
                No FAQs found matching your search.
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Raise Support Ticket Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsTicketModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-background px-6 py-3 font-bold rounded-2xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Raise a Support Ticket
          </motion.button>
        </motion.div>
      </div>

      {/* Support Ticket Modal */}
      <AnimatePresence>
        {isTicketModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTicketModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e : any) => e.stopPropagation()}
                className="bg-gradient-to-br from-primary/10 to-background border border-primary/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-8">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-foreground">
                      Raise a Support Ticket
                    </h2>
                    <button
                      onClick={() => setIsTicketModalOpen(false)}
                      className="p-2 hover:bg-muted rounded-xl transition-colors border border-primary/20 hover:border-primary/60"
                    >
                      <X className="w-5 h-5 text-foreground" />
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-muted text-foreground border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60 transition-all"
                        placeholder="Enter ticket subject"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-muted text-foreground border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60 transition-all"
                      >
                        <option value="">Select a category</option>
                        <option value="Booking Issue">Booking Issue</option>
                        <option value="Payment">Payment</option>
                        <option value="Coach">Coach</option>
                        <option value="Venue">Venue</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Description *
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl bg-muted text-foreground border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60 transition-all resize-none"
                        placeholder="Describe your issue in detail..."
                      />
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Upload Files (Optional)
                      </label>
                      <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                        isUploading 
                          ? 'border-primary/60 bg-primary/10' 
                          : 'border-primary/20 hover:border-primary/60 bg-muted/30'
                      }`}>
                        <input
                          type="file"
                          multiple
                          accept=".pdf, image/jpeg, image/jpg, image/png"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                          disabled={isUploading}
                        />
                        <label
                          htmlFor="file-upload"
                          className={`flex flex-col items-center gap-2 ${
                            isUploading ? 'cursor-wait' : 'cursor-pointer'
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-8 h-8 text-primary animate-spin" />
                              <span className="text-sm text-primary font-medium">
                                Uploading file...
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Please wait while your file is being processed
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Click to upload or drag and drop
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Allowed file types: PDF, JPG, JPEG, PNG — Maximum size: 5MB
                              </span>
                            </>
                          )}
                        </label>
                      </div>

                      {/* File Preview List */}
                      {files.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {files.map((fileItem, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-gradient-to-br from-primary/10 to-background rounded-xl border border-primary/20"
                            >
                              {fileItem.type === "image" ? (
                                <ImageIcon className="w-5 h-5 text-primary" />
                              ) : (
                                <FileText className="w-5 h-5 text-primary" />
                              )}
                              <span className="flex-1 text-sm text-foreground truncate">
                                {fileItem.file.name}
                              </span>
                              <button
                                onClick={() => removeFile(index)}
                                disabled={isUploading}
                                className="p-1 hover:bg-primary/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <X className="w-4 h-4 text-foreground" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 mt-6">
                    <button
                      onClick={handleSubmitTicket}
                      disabled={isUploading || isSubmitting}
                      className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-background rounded-xl font-bold hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Ticket'
                      )}
                    </button>
                    <button
                      onClick={() => setIsTicketModalOpen(false)}
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-muted text-foreground hover:bg-muted/80 rounded-xl font-semibold transition-all duration-200 border border-primary/20 hover:border-primary/60 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
};

export default FaqPage;