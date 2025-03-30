'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

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

      const data = await response.json();
      setMessages(prev => [...prev, data]);
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
      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto" id="chat-container">
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
                    {message.content}
                  </div>
                </div>
              </motion.div>
            ))}
            {/* Loading indicator */}
            <AnimatePresence>
              {isLoading && (
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

      {/* Input Area */}
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
