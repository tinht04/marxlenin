import React from 'react';

export const Explainer: React.FC = () => (
    <div className="text-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-blue-700 mb-2">Tôi có thể sử dụng AI Studio để huấn luyện chatbot trên file PDF không?</h2>
        <p className="text-gray-600 max-w-3xl mx-auto">
            Có, bạn có thể! Thay vì "huấn luyện" lại một mô hình từ đầu, bạn sử dụng một kỹ thuật gọi là "Retrieval-Augmented Generation" (RAG). Bạn cung cấp cho mô hình (như Gemini) nội dung từ PDF của bạn làm ngữ cảnh, và nó sẽ trả lời câu hỏi dựa trên thông tin đó. Ứng dụng này là một bản demo về cách nó hoạt động.
        </p>
    </div>
);
