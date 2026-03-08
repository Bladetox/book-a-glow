import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isBefore, isToday, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { availableTimes } from "@/data/bookingData";

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
      <div className="glass-card-service rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-display text-base font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <ChevronRight className="w-5 h-5" />
          </button>
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
            const isSunday = getDay(day) === 0;
            const isDisabled = isPast || isSunday;
            const isActive = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                disabled={isDisabled}
                onClick={() => onSelectDate(day)}
                className={`w-full aspect-square rounded-lg text-sm font-medium transition-all duration-150
                  ${isDisabled ? "text-muted-foreground/30 cursor-not-allowed" : "hover:bg-muted cursor-pointer"}
                  ${isActive ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground"}
                `}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
            Available times
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {availableTimes.map((time) => (
              <button
                key={time}
                onClick={() => onSelectTime(time)}
                className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${selectedTime === time
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "glass-card-service hover:border-primary/40 text-foreground"
                  }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleStep;
