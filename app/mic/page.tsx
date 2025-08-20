"use client";
import { useEffect, useRef, useState } from "react";
import { firehoseUrl } from "../page";

const companionId = "bebf00bb-8a43-488d-9c23-93c40b84d30e";

export default function VoiceChatPage() {
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [status, setStatus] = useState("Disconnected");
  const [transcripts, setTranscripts] = useState<string[]>([]);

  useEffect(() => {
    const ws = new WebSocket(firehoseUrl);
    wsRef.current = ws;

    ws.onopen = () => setStatus("Connected");
    ws.onclose = () => setStatus("Disconnected");
    ws.onerror = (e) => console.error("WebSocket error", e);

    ws.onmessage = (evt) => {
      const json = JSON.parse(evt.data);
      console.log("Received:", json);
    };

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("このブラウザはSpeechRecognitionをサポートしていません");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript.trim();
      setTranscripts((prev) => [...prev, transcript]);
      if (transcript.length < 5) return;
      console.log("Recognized:", transcript);
      ws.send(
        JSON.stringify({
          from: "user",
          message: transcript,
          target: companionId,
        })
      );
    };
    recognition.start();
    return () => {
      recognition.stop();
      ws.close();
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Voice Chat</h1>
      <p>Status: {status}</p>
      <button
        onClick={() => recognitionRef.current?.start()}
        style={{ marginRight: "10px" }}
      >
        Start Recognition
      </button>
      <button onClick={() => recognitionRef.current?.stop()}>
        Stop Recognition
      </button>

      <div style={{ marginTop: "20px" }}>
        <h2>Recognized Speech</h2>
        <ul>
          {transcripts.map((t, idx) => (
            <li key={idx}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
