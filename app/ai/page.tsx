"use client";

import { useState } from "react";

export default function Page() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const sendMessage = async () => {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    setReply(data.reply);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>AI Tool 🤖</h1>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Bir şey yaz..."
      />

      <button onClick={sendMessage}>Send</button>

      <p>{reply}</p>
    </div>
  );
}