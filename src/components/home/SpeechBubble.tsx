import { C } from "./tokens";

export const SpeechBubble = ({ type, speaker, label, message, action, delay }: {
  type: "critical" | "growth" | "retention" | "ops";
  speaker: string; label: string; message: string; action: string; delay: number;
}) => (
  <div className={`speech-bubble speech-bubble--${type}`} style={{ animationDelay: `${delay}s` }}>
    <span className="speech-bubble__tail speech-bubble__tail--outer" aria-hidden="true" />
    <span className="speech-bubble__tail speech-bubble__tail--inner" aria-hidden="true" />
    <div className="speech-bubble__header">
      <span className="speech-bubble__avatar" aria-hidden="true">nx</span>
      <div className="speech-bubble__identity">
        <span className="speech-bubble__speaker">{speaker}</span>
        <span className="speech-bubble__timestamp">· just now</span>
      </div>
      <span className="speech-bubble__label">{label}</span>
    </div>
    <p className="speech-bubble__message">“{message}”</p>
    <div className="speech-bubble__action">{action} <span aria-hidden="true">→</span></div>
  </div>
);
