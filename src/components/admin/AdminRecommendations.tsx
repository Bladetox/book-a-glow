import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageCircle, Send, ArrowRight, TrendingUp, AlertTriangle, UserCheck, Clock, X } from "lucide-react";
import { useNextyInsights, NextyInsight } from "@/hooks/useNextyInsights";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  insight?: NextyInsight;
  timestamp: Date;
}

export default function AdminRecommendations({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { data: insights, isLoading } = useNextyInsights();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && messages.length === 0) {
      initialiseChat();
    }
  }, [isLoading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const initialiseChat = async () => {
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 1500));
    
    const welcome: Message = {
      id: "welcome",
      role: "assistant",
      content: "I've analyzed your business data. Here are the most impactful growth opportunities I've found for you right now.",
      timestamp: new Date()
    };
    
    setMessages([welcome]);
    setIsTyping(false);

    if (insights && insights.length > 0) {
      for (const insight of insights) {
        setIsTyping(true);
        await new Promise(r => setTimeout(r, 1000));
        setMessages(prev => [...prev, {
          id: insight.id,
          role: "assistant",
          content: insight.message,
          insight,
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Nexty AI</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.1em]">Business Growth Advisor</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex w-full",
                msg.role === "assistant" ? "justify-start" : "justify-end"
              )}
            >
              <div className={cn(
                "max-w-[85%] rounded-2xl p-4 shadow-sm",
                msg.role === "assistant" 
                  ? "bg-white/[0.03] border border-white/[0.06] text-white/90" 
                  : "bg-violet-600 text-white"
              )}>
                {msg.insight && (
                  <div className="flex items-center gap-2 mb-2">
                    {msg.insight.priority === "critical" && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    {msg.insight.type === "margin" && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    {msg.insight.type === "retention" && <UserCheck className="w-4 h-4 text-blue-400" />}
                    {msg.insight.type === "capacity" && <Clock className="w-4 h-4 text-amber-400" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      {msg.insight.title}
                    </span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                
                {msg.insight?.actionLabel && (
                  <button
                    onClick={() => onNavigate(msg.insight!.actionView || "Dashboard")}
                    className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition-all text-xs font-medium group"
                  >
                    {msg.insight.actionLabel}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex gap-1">
              <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer input (Static placeholder for visual completeness) */}
      <div className="p-4 bg-white/[0.02] border-t border-white/[0.06]">
        <div className="relative group">
          <input
            disabled
            placeholder="Ask Nexty anything about your business..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/40 cursor-not-allowed group-hover:border-white/[0.12] transition-colors"
          />
          <div className="absolute right-2 top-1.5 p-1.5 rounded-lg bg-white/[0.05] text-white/20">
            <Send className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-2 text-[9px] text-center text-white/20 uppercase tracking-widest font-medium">
          Powered by NextSlot Intelligence Engine
        </p>
      </div>
    </div>
  );
}
