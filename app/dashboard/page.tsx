"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
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
      content: "Hi I'm the ProfEval assistant, how can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [responseMessage, setResponseMessage] = useState("");
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);

  useEffect(() => {
    if (responseMessage) {
      alert(responseMessage);
      setResponseMessage(""); // Clear the message after showing the alert
    }
  }, [responseMessage]);

  const sendUrl = async () => {
    setIsLoadingUrls(true);
    const urls = url.split(",").map((url) => url.trim());
    if (urls.length === 0) {
      setResponseMessage("Please enter a URL to add.");
      setIsLoadingUrls(false);
      return;
    }

    try {
      const response = await fetch("/api/webscrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls }), // Change this line
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResponseMessage(data.message || "Failed to get response message!");
      setUrl("");
    } catch (error) {
      console.error("Error adding URLs:", error);
      setResponseMessage("Error adding URLs. Please try again.");
    }
    setIsLoadingUrls(false);
  };

  const sendMessage = async () => {
    if (!message) {
      return;
    }

    setIsLoadingMessage(true);
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
    setIsLoadingMessage(false);
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null); // Ref for scrolling to the bottom of the chat

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message when Enter is pressed (without Shift)
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 p-5">
      <h1 className="sm:text-5xl text-2xl text-primary font-bold">ProfEval</h1>

      <Card className="w-[90vw] h-[60vh] flex flex-col">
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
              placeholder="Enter message"
              value={message}
              onKeyDown={handleKeyPress}
              onChange={(e) => setMessage(e.target.value)}
            />

            <Button onClick={sendMessage} disabled={isLoadingMessage}>
              {isLoadingMessage ? "Sending..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="w-[90vw] flex flex-col bg-background border-0 flex-grow">
        <CardContent className="flex-grow">
          <div className="flex flex-col w-full h-full gap-2 p-2 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <CircleAlert className="w-6 h-6 sm:w-10 sm:h-10" />
              <h2 className="text-base sm:text-lg md:text-2xl text-primary font-extrabold">
                Don&apos;t find your professor&apos;s information from our
                assistant?
              </h2>
            </div>
            <p className="text-secondary text-sm sm:text-base">
              Insert the url with your professor&apos;s information (reviews,
              ratings, subject, etc.) below to add your professor&apos;s data to
              our system!
            </p>
            <div className="flex flex-row gap-2 mt-4">
              <Input
                className="flex-grow bg-white"
                type="text"
                placeholder="Enter URLs separated by commas"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button onClick={sendUrl} disabled={isLoadingUrls}>
                {isLoadingUrls ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
