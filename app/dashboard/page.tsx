"use client";
import { useState } from "react";

export default function Dashboard() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi I'm the ProfEval assitant, how can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    setMessages([
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      if (!res.body) {
        throw new Error("Response body is null");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let result = "";
      return reader
        .read()
        .then(function processText({ done, value }): Promise<string> {
          if (done) {
            return Promise.resolve(result);
          }
          const text = decoder.decode(value || new Uint8Array(), {
            stream: true,
          });
          setMessages((messages) => {
            let lastMessage = messages[messages.length - 1];
            let otherMessages = messages.slice(0, messages.length - 1);

            return [
              ...otherMessages,
              { ...lastMessage, content: lastMessage.content + text },
            ];
          });

          return reader.read().then(processText);
        });
    });

    setMessage("");
  };

  return (
    <main>
      <h1>Dashboard</h1>
    </main>
  );
}
