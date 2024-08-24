"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Dashboard() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi I'm the ProfEval assitant, how can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("chat");

  const sendMessage = async () => {
    if (mode === "chat") {
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
    } else if (mode === "scrape") {
      const urls = message.split(",").map((url) => url.trim());
      const response = await fetch("/api/webscrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls }),
      });

      const data = await response.json();
      setMessages([
        ...messages,
        { role: "user", content: `Scraping URLs: ${message}` },
        { role: "assistant", content: JSON.stringify(data, null, 2) },
      ]);
    }
    setMessage("");
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 p-5">
      <h1>Dashboard</h1>
      <Card className="w-[80vw] h-[60vh] flex flex-col">
        <CardContent className="flex-grow overflow-auto p-4">
          <div className="flex flex-col space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`${
                    message.role === "assistant"
                      ? "bg-background text-black"
                      : "bg-primary text-white"
                  } p-2 rounded-md max-w-[70%]`}
                >
                  <p className="sm:text-base text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardContent className="p-4 ">
          <div className="flex flex-row gap-2">
            <Input
              className="flex-grow"
              type="text"
              placeholder={
                mode === "chat"
                  ? "Enter message"
                  : "Enter URLs separated by commas"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Popover>
              <PopoverTrigger asChild>
                <div className="cursor-pointer">
                  <Button variant="outline" className="p-2">
                    <ChevronDown />
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-30 bg-primary">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    className="text-white"
                    onClick={() => setMode("chat")}
                  >
                    Chat
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-white"
                    onClick={() => setMode("scrape")}
                  >
                    Scrape URL
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={sendMessage}>
              {mode === "chat" ? "Send" : "Scrape"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
