"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SAMPLE_PROMPTS = [
  "今の株価動向をどう見る？",
  "直近の決算で注目すべき点は？",
  "監視を続ける判断材料は？",
];

export function TickerChat({ ticker }: { ticker: string }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    id: `ticker-chat-${ticker}`,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { ticker, messages },
      }),
    }),
  });

  const isStreaming = status === "streaming" || status === "submitted";

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleSample = (text: string) => {
    if (isStreaming) return;
    sendMessage({ text });
  };

  return (
    <div className="space-y-3">
      <div
        ref={scrollRef}
        className="h-80 overflow-y-auto rounded-md border border-gray-100 bg-gray-50 p-3"
      >
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              この銘柄について AI に質問できます。例えば:
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSample(p)}
                  disabled={isStreaming}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const text = m.parts
                .filter((p) => p.type === "text")
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              return (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-gray-900 text-white whitespace-pre-wrap"
                        : "bg-white text-gray-800 border border-gray-100"
                    }`}
                  >
                    {m.role === "user" ? (
                      text
                    ) : (
                      <div className="prose prose-sm prose-gray max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-pre:my-2 prose-pre:bg-gray-50 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm text-gray-400">
                  <Sparkles className="inline h-3 w-3 animate-pulse" /> 回答を生成中...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">
          エラーが発生しました: {error.message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="銘柄について質問する..."
          disabled={isStreaming}
          className="flex-1"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isStreaming || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
