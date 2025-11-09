import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { Loader } from './Loader';
import { IconSend, IconFile } from './Icons';

interface ChatBubbleProps {
    message: ChatMessage;
}

// Format markdown-style text to HTML
const formatMessage = (text: string): React.ReactElement => {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let codeBlock: string[] = [];
    let inCodeBlock = false;

    const flushList = (key: number) => {
        if (listItems.length > 0 && listType) {
            const ListTag = listType;
            elements.push(
                <ListTag key={`list-${key}`} className="my-3 ml-4 space-y-1">
                    {listItems.map((item, i) => (
                        <li key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
                    ))}
                </ListTag>
            );
            listItems = [];
            listType = null;
        }
    };

    const flushCodeBlock = (key: number) => {
        if (codeBlock.length > 0) {
            elements.push(
                <pre key={`code-${key}`} className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-3 overflow-x-auto">
                    <code className="text-xs md:text-sm text-amber-900 font-mono">
                        {codeBlock.join('\n')}
                    </code>
                </pre>
            );
            codeBlock = [];
        }
    };

    const formatInline = (text: string): string => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-amber-900">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono text-amber-800">$1</code>');
    };

    lines.forEach((line, index) => {
        // Code block detection
        if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
                flushCodeBlock(index);
                inCodeBlock = false;
            } else {
                flushList(index);
                inCodeBlock = true;
            }
            return;
        }

        if (inCodeBlock) {
            codeBlock.push(line);
            return;
        }

        // Heading detection
        if (line.startsWith('### ')) {
            flushList(index);
            elements.push(
                <h3 key={index} className="text-base md:text-lg font-bold text-amber-900 mt-4 mb-2">
                    {line.substring(4)}
                </h3>
            );
            return;
        }
        if (line.startsWith('## ')) {
            flushList(index);
            elements.push(
                <h2 key={index} className="text-lg md:text-xl font-bold text-amber-900 mt-4 mb-2">
                    {line.substring(3)}
                </h2>
            );
            return;
        }
        if (line.startsWith('# ')) {
            flushList(index);
            elements.push(
                <h1 key={index} className="text-xl md:text-2xl font-bold text-amber-900 mt-4 mb-3">
                    {line.substring(2)}
                </h1>
            );
            return;
        }

        // Bullet list detection
        if (line.match(/^[-*+]\s/)) {
            if (listType !== 'ul') {
                flushList(index);
                listType = 'ul';
            }
            listItems.push(line.substring(2).trim());
            return;
        }

        // Numbered list detection
        if (line.match(/^\d+\.\s/)) {
            if (listType !== 'ol') {
                flushList(index);
                listType = 'ol';
            }
            listItems.push(line.replace(/^\d+\.\s/, '').trim());
            return;
        }

        // Regular paragraph
        flushList(index);
        if (line.trim()) {
            elements.push(
                <p key={index} className="text-sm md:text-base leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
            );
        } else if (elements.length > 0) {
            elements.push(<br key={`br-${index}`} />);
        }
    });

    flushList(lines.length);
    flushCodeBlock(lines.length);

    return <div className="space-y-1">{elements}</div>;
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
    const isModel = message.role === 'model';
    return (
        <div className={`flex items-start gap-3 my-4 ${isModel ? 'justify-start' : 'justify-end'}`}>
            {isModel && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    AI
                </div>
            )}
            <div className={`p-3 md:p-4 rounded-2xl max-w-md lg:max-w-2xl shadow-lg ${
                isModel 
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900 rounded-tl-none border-2 border-amber-200' 
                    : 'bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-br-none border-2 border-amber-800'
            }`}>
                {isModel ? formatMessage(message.content) : (
                    <p className="whitespace-pre-wrap text-sm md:text-base break-words leading-relaxed">
                        {message.content}
                    </p>
                )}
            </div>
            {!isModel && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-800 to-amber-900 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    Bạn
                </div>
            )}
        </div>
    );
};

interface ChatWindowProps {
    status: 'idle' | 'processing' | 'ready' | 'querying';
    chatHistory: ChatMessage[];
    onSubmitQuestion: (question: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ status, chatHistory, onSubmitQuestion }) => {
    const [question, setQuestion] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, status]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmitQuestion(question);
        setQuestion('');
    };

    return (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 rounded-xl shadow-lg border-2 border-amber-200 flex flex-col h-[80vh] max-h-[800px]">
            <h3 className="text-lg font-bold p-4 border-b-2 border-amber-200 flex-shrink-0 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900">
                💬 Cửa sổ trò chuyện
            </h3>
            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto bg-white">
                {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-amber-700">
                        <IconFile />
                        <p className="mt-2 font-medium">Vui lòng tải lên một tệp PDF để bắt đầu cuộc trò chuyện.</p>
                    </div>
                )}
                {chatHistory.map((msg, index) => <ChatBubble key={index} message={msg} />)}
                {status === 'querying' && <Loader message="AI đang suy nghĩ..." />}
            </div>
            <div className="p-4 border-t-2 border-amber-200 mt-auto flex-shrink-0 bg-gradient-to-r from-amber-50 to-orange-50">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={status === 'ready' ? "Đặt câu hỏi về tài liệu..." : "Vui lòng tải lên một tệp PDF trước"}
                        disabled={status !== 'ready'}
                        className="w-full px-4 py-3 border-2 border-amber-300 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:border-gray-300 transition-all text-amber-900 placeholder-amber-600"
                        aria-label="Chat input"
                    />
                    <button 
                        type="submit" 
                        disabled={status !== 'ready' || !question.trim()} 
                        className="p-3 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-full hover:from-amber-700 hover:to-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-none"
                    >
                        <IconSend />
                    </button>
                </form>
            </div>
        </div>
    );
};
