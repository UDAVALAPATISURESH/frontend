import React, { useState, useRef, useEffect } from 'react';
import './AIAgentWidget.css';

const AIAgentWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Hello! I'm your AI logistics assistant. How can I help you today?\n\nIf you need direct assistance, please contact our Founder & Developer:\nUDAVALAPATI SURESH\nluckysuresh494@gmail.com", isBot: true }
    ]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    const toggleChat = () => setIsOpen(!isOpen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        // Add user message
        const newUserMsg = { id: Date.now(), text: inputValue, isBot: false };
        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');

        // Mock bot response
        setTimeout(() => {
            const botResponse = {
                id: Date.now() + 1,
                text: "I'm a demo AI agent. In the future, I can help you track shipments and manage the platform!",
                isBot: true
            };
            setMessages(prev => [...prev, botResponse]);
        }, 1000);
    };

    return (
        <div className="ai-agent-container">
            {isOpen && (
                <div className="ai-chat-window">
                    <div className="ai-chat-header">
                        <div className="ai-header-info">
                            <div className="ai-avatar">🤖</div>
                            <div>
                                <h3>Nova AI</h3>
                                <span className="ai-status">Online</span>
                            </div>
                        </div>
                        <button className="ai-close-btn" onClick={toggleChat}>✕</button>
                    </div>

                    <div className="ai-chat-messages">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`ai-message-wrapper ${msg.isBot ? 'bot' : 'user'}`}>
                                {msg.isBot && <div className="ai-message-avatar">🤖</div>}
                                <div className={`ai-message ${msg.isBot ? 'ai-message-bot' : 'ai-message-user'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="ai-chat-input-area">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask Nova anything..."
                            className="ai-chat-input"
                        />
                        <button type="submit" className="ai-send-btn">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                </div>
            )}

            <button
                className={`ai-fab-button ${isOpen ? 'active' : ''}`}
                onClick={toggleChat}
                aria-label="Open AI Assistant"
            >
                {isOpen ? '✕' : '🤖'}
            </button>
        </div>
    );
};

export default AIAgentWidget;
