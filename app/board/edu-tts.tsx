"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "idle" | "playing" | "paused";

/**
 * Lector de texto a voz en español con la voz del sistema.
 * @returns Reproductor con caja de texto, elección de voz y velocidad.
 */
export default function TtsEs() {
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState("");
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
      setVoiceUri((current) => current
        || list.find((voice) => voice.lang.toLowerCase().startsWith("es"))?.voiceURI
        || list[0]?.voiceURI
        || "");
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const sortedVoices = useMemo(
    () => [...voices].sort((a, b) => Number(b.lang.toLowerCase().startsWith("es")) - Number(a.lang.toLowerCase().startsWith("es"))),
    [voices],
  );

  const speak = () => {
    if (!supported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find((item) => item.voiceURI === voiceUri);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "es-ES";
    utterance.rate = rate;
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    window.speechSynthesis.speak(utterance);
    setStatus("playing");
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setStatus("paused");
  };

  const resume = () => {
    window.speechSynthesis.resume();
    setStatus("playing");
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setStatus("idle");
  };

  if (!supported) {
    return <p className="pt-empty">Este navegador no permite leer texto en voz alta.</p>;
  }

  return (
    <div className="tts">
      <label className="tts-text">
        <span className="tts-label">Texto</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribe o pega aquí el texto que quieres escuchar…"
          rows={10}
        />
      </label>

      <div className="tts-controls">
        <label className="tts-field">
          <span className="tts-label">Voz</span>
          <select value={voiceUri} onChange={(event) => setVoiceUri(event.target.value)}>
            {sortedVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>

        <label className="tts-field tts-rate">
          <span className="tts-label">Velocidad: {rate.toFixed(1)}×</span>
          <input type="range" min="0.6" max="1.6" step="0.1" value={rate} onChange={(event) => setRate(Number(event.target.value))} />
        </label>

        <div className="tts-actions">
          <button type="button" className="tts-primary" onClick={status === "paused" ? resume : speak} disabled={!text.trim()}>
            {status === "paused" ? "Reanudar" : "Leer"}
          </button>
          <button type="button" onClick={pause} disabled={status !== "playing"}>Pausar</button>
          <button type="button" onClick={stop} disabled={status === "idle"}>Detener</button>
        </div>

        <span className="tts-count" role="status">{text.trim() ? `${text.trim().split(/\s+/).length} palabras` : "Sin texto"}</span>
      </div>
    </div>
  );
}
