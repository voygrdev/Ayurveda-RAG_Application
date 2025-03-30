'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import 'katex/dist/katex.min.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MarkdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';

    return !inline && language ? (
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className="bg-gray-800 rounded px-1 py-0.5" {...props}>
        {children}
      </code>
    );
  },
  h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
  p: ({ children }: any) => <p className="mb-4 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc ml-6 mb-4 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal ml-6 mb-4 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="mb-1">{children}</li>,
  table: ({ children }: any) => (
    <div className="overflow-x-auto w-full mb-4">
      <table className="w-full border-collapse border border-gray-700 bg-gray-800/40">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-gray-700/50">{children}</thead>
  ),
  th: ({ children }: any) => (
    <th className="border border-gray-700 px-4 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-gray-700 px-4 py-2 whitespace-normal">
      {children}
    </td>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-gray-700/30 transition-colors">
      {children}
    </tr>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-gray-500 pl-4 italic my-4">
      {children}
    </blockquote>
  ),
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentStreamingMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          chatHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.data) {
                fullMessage += parsed.data;
                setCurrentStreamingMessage(fullMessage);
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fullMessage
      }]);
      setCurrentStreamingMessage('');

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="flex flex-col h-screen bg-[#343541]">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-700" id="chat-container" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-gray-300 px-4"
            >
              <h1 className="text-4xl font-bold mb-8">MedBot AI</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {[
                  'What are the side effects of Aspirin?',
                  'Compare allopathic and ayurvedic treatments for diabetes',
                  'Tell me about common cold remedies',
                  'What are drug interactions with Metformin?',
                  'Recommended dosage for Paracetamol',
                  'Ayurvedic alternatives for pain management'
                ].map((text, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-4 rounded-xl border border-gray-600 hover:bg-gray-700 transition-colors duration-200"
                    onClick={() => handleExampleClick(text)}
                  >
                    {text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-6 py-8 px-4">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-3xl mx-auto flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className={`flex items-start gap-3 max-w-[80%] ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    message.role === 'assistant' ? 'bg-teal-500' : 'bg-blue-500'
                  }`}>
                    {message.role === 'assistant' ? (
                      <Bot size={20} className="text-white" />
                    ) : (
                      <User size={20} className="text-white" />
                    )}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.role === 'assistant'
                      ? 'bg-[#444654] text-gray-100'
                      : 'bg-blue-500 text-white'
                  }`}>
                    {message.role === 'assistant' ? (
                      <div className="prose prose-invert max-w-none">
                        <div className="overflow-x-auto">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex, rehypeRaw]}
                            components={MarkdownComponents}
                          >
                          {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {currentStreamingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto flex justify-start"
              >
                <div className="flex items-start gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-500">
                    <Bot size={20} className="text-white" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-[#444654] text-gray-100">
                    <div className="prose prose-invert max-w-none">
                      <div className="overflow-x-auto">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm]}
                          rehypePlugins={[rehypeKatex, rehypeRaw]}
                          components={MarkdownComponents}
                        >
                          {currentStreamingMessage}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {isLoading && !currentStreamingMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="max-w-3xl mx-auto flex justify-start"
                >
                  <div className="flex items-start gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-500">
                      <Loader2 size={20} className="text-white animate-spin" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-[#444654] text-gray-100">
                      Thinking...
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="border-t border-gray-600 bg-[#343541] p-4">
        <motion.form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative bg-[#40414f] rounded-xl shadow-xl"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message MedBot..."
            className="w-full bg-transparent text-white p-4 pr-12 focus:outline-none rounded-xl"
            disabled={isLoading}
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </motion.button>
        </motion.form>
        <div className="text-xs text-center mt-4 text-gray-400">
          MedBot can make mistakes. Consider checking important information.
        </div>
      </div>
    </div>
  );
}
