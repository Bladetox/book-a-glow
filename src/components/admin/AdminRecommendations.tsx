import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, TrendingUp, AlertTriangle, UserCheck, Clock } from "lucide-react";
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
  const [messages, setMessages]       = useState<Message[]>([]);
  const [isTyping, setIsTyping]       = useState(false);
  const hasInitialised                = useRef(false);
  const scrollRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading || hasInitialised.current) return;
    hasInitialised.current = true;
    initialiseChat(insights ?? []);
  }, [isLoading, insights]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const initialiseChat = async (resolvedInsights: NextyInsight[]) => {
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 1500));

    if (resolvedInsights.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "I've reviewed your business data, but there isn't enough activity yet to surface specific recommendations. Keep taking bookings — once you have more completed appointments I'll start finding opportunities for you.",
        timestamp: new Date(),
      }]);
      setIsTyping(false);
      return;
    }

    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "I've analysed your business data. Here are the most impactful growth opportunities I've found for you right now.",
      timestamp: new Date(),
    }]);
    setIsTyping(false);

    for (const insight of resolvedInsights) {
      setIsTyping(true);
      await new Promise(r => setTimeout(r, 1000));
      setMessages(prev => [...prev, {
        id: insight.id,
        role: "assistant",
        content: insight.message,
        insight,
        timestamp: new Date(),
      }]);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">Nexty AI</h2>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.1em]">Business Growth Advisor</p>
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
                    {msg.insight.type === "margin"       && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    {msg.insight.type === "retention"    && <UserCheck className="w-4 h-4 text-blue-400" />}
                    {msg.insight.type === "capacity"     && <Clock className="w-4 h-4 text-amber-400" />}
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
              <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
