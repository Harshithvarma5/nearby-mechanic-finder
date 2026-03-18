import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageCircle, Loader2 } from 'lucide-react';
import { sendMessage, getMessages } from '../services/api';

const ChatBox = ({ requestId, senderPhone, receiverName, isMechanic }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const prevMessagesLen = useRef(0);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    const fetchMessages = async () => {
        try {
            const data = await getMessages(requestId);
            setMessages(data);
        } catch (err) {
            console.error("Failed to fetch messages:", err);
        }
    };

    useEffect(() => {
        // Fetch historical messages once on mount
        fetchMessages();

        // Connect to the WebSocket room for this specific request
        const wsUrl = import.meta.env.VITE_API_BASE_URL 
            ? import.meta.env.VITE_API_BASE_URL.replace('http', 'ws')
            : 'ws://localhost:8000';
            
        const socket = new WebSocket(`${wsUrl}/ws/requests/${requestId}`);

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message') {
                    // Instantly append the broadcasted message to chat
                    setMessages(prev => {
                        // Prevent duplicates if same message ID arrives
                        if (prev.some(m => m._id === data.message._id)) return prev;
                        return [...prev, data.message];
                    });
                }
            } catch (err) {
                console.error("WS Parse Error:", err);
            }
        };

        return () => {
            socket.close();
        };
    }, [requestId]);

    useEffect(() => {
        if (messages.length > prevMessagesLen.current) {
            scrollToBottom();
            prevMessagesLen.current = messages.length;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            await sendMessage(requestId, {
                requestId,
                senderPhone,
                content: newMessage.trim()
            });
            setNewMessage('');
            // The message will be instantly received via WebSocket broadcast, 
            // no need to re-fetch the entire history.
        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="chat-user-info">
                    <div className="chat-avatar">
                        <User size={16} />
                    </div>
                    <div>
                        <span className="chat-with-label">Chatting with</span>
                        <h4 className="chat-user-name">{receiverName || 'Support'}</h4>
                    </div>
                </div>
                <div className="chat-status-indicator">
                    <span className="dot"></span> Online
                </div>
            </div>

            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="empty-chat">
                        <MessageCircle size={32} />
                        <p>No messages yet. Say hi!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div 
                            key={index} 
                            className={`message-bubble ${msg.senderPhone === senderPhone ? 'sent' : 'received'}`}
                        >
                            <div className="message-content">{msg.content}</div>
                            <div className="message-time">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
                <input 
                    type="text" 
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                />
                <button type="submit" className="chat-send-btn" disabled={sending || !newMessage.trim()}>
                    {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                </button>
            </form>
        </div>
    );
};

export default ChatBox;
