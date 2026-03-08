import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isBefore, isToday, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAvailableSlotsForDate, isDayAvailable } from "@/data/availabilityStore";
import { motion, AnimatePresence } from "framer-motion";

interface ScheduleStepProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
}

const ScheduleStep = ({ selectedDate, selectedTime, onSelectDate, onSelectTime }: ScheduleStepProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Choose date & time
      </h3>

      {/* Calendar */}
      <div className="glass-card-service rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted/50">
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <span className="font-display text-base font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted/50">
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <span key={d} className="text-[10px] font-semibold text-muted-foreground uppercase">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const isPast = isBefore(day, today) && !isToday(day);
            const isAvailable = isDayAvailable(day);
            const isDisabled = isPast || !isAvailable;
            const isActive = selectedDate && isSameDay(day, selectedDate);

            return (
              <motion.button
                key={day.toISOString()}
                whileTap={!isDisabled ? { scale: 0.85 } : undefined}
                disabled={isDisabled}
                onClick={() => onSelectDate(day)}
                className={`w-full aspect-square rounded-xl text-sm font-medium transition-all duration-200
                  ${isDisabled ? "text-muted-foreground/25 cursor-not-allowed" : "hover:bg-muted/50 cursor-pointer active:bg-muted"}
                  ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-foreground"}
                `}
              >
                {format(day, "d")}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
              Available times
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {getAvailableSlotsForDate(selectedDate).map((time, i) => (
                <motion.button
                  key={time}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSelectTime(time)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${selectedTime === time
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "glass-card-service text-foreground"
                    }`}
                >
                  {time}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleStep;
