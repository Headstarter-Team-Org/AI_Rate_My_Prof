"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ReactMarkdown from "react-markdown"; //to render markdown in the assistant's responses
import remarkGfm from "remark-gfm"; //to enable GitHub Flavored Markdown

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

  const messagesEndRef = useRef<HTMLDivElement | null>(null); // Ref for scrolling to the bottom of the chat

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 p-5">
      <h1 className="sm:text-5xl text-2xl text-primary font-bold">ProfEval</h1>
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
                  {message.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => (
                          <p className="mb-2 sm:text-base text-sm" {...props} />
                        ),
                        h1: ({ node, ...props }) => (
                          <h1 className="text-2xl font-bold mb-2" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-xl font-bold mb-2" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-lg font-bold mb-2" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc pl-8 mb-2" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal pl-8 mb-2" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="mb-1" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a
                            className="text-blue-500 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="sm:text-base text-sm">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />
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
