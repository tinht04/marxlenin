import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { Loader } from './Loader';
import { IconSend, IconFile } from './Icons';

interface ChatBubbleProps {
    message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
    const isModel = message.role === 'model';
    return (
        <div className={`flex items-start gap-3 my-4 ${isModel ? 'justify-start' : 'justify-end'}`}>
            {isModel && <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">AI</div>}
            <div className={`p-3 md:p-4 rounded-2xl max-w-md lg:max-w-lg shadow-sm ${isModel ? 'bg-gray-200 text-gray-800 rounded-tl-none' : 'bg-blue-600 text-white rounded-br-none'}`}>
                <p className="whitespace-pre-wrap text-sm md:text-base break-words">{message.content}</p>
            </div>
             {!isModel && <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">You</div>}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[80vh] max-h-[800px]">
            <h3 className="text-lg font-semibold p-4 border-b flex-shrink-0">Cửa sổ trò chuyện</h3>
            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto">
                {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <IconFile />
                        <p className="mt-2">Vui lòng tải lên một tệp PDF để bắt đầu cuộc trò chuyện.</p>
                    </div>
                )}
                {chatHistory.map((msg, index) => <ChatBubble key={index} message={msg} />)}
                {status === 'querying' && <Loader message="AI đang suy nghĩ..." />}
            </div>
            <div className="p-4 border-t mt-auto flex-shrink-0">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={status === 'ready' ? "Đặt câu hỏi về tài liệu..." : "Vui lòng tải lên một tệp PDF trước"}
                        disabled={status !== 'ready'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                        aria-label="Chat input"
                    />
                    <button type="submit" disabled={status !== 'ready' || !question.trim()} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                        <IconSend />
                    </button>
                </form>
            </div>
        </div>
    );
};
