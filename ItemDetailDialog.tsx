import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { MapPin, Calendar, User, MessageCircle, Send } from 'lucide-react@0.487.0';
import { api } from '../utils/api';
import { authService } from '../utils/auth';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ItemDetail {
  id: string;
  type: 'lost' | 'found';
  category: string;
  title: string;
  description: string;
  location: string;
  date: string;
  imageUrl?: string;
  status: string;
  userId: string;
  userName: string;
  userEmail: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

interface ItemDetailDialogProps {
  itemId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ItemDetailDialog({ itemId, open, onClose }: ItemDetailDialogProps) {
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (itemId && open) {
      loadItem();
      loadCurrentUser();
    }
  }, [itemId, open]);

  useEffect(() => {
    if (showChat && conversationId) {
      loadMessages();
      // Poll for new messages every 3 seconds
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [showChat, conversationId]);

  const loadCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUserId(user?.id || null);
    } catch (err) {
      console.error('Failed to get current user:', err);
    }
  };

  const loadItem = async () => {
    if (!itemId) return;
    setIsLoading(true);
    try {
      const { item } = await api.getItem(itemId);
      setItem(item);
    } catch (err: any) {
      console.error('Failed to load item:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!itemId) return;
    try {
      const { conversation } = await api.createConversation(itemId);
      setConversationId(conversation.id);
      setShowChat(true);
      await loadMessages();
    } catch (err: any) {
      console.error('Failed to start chat:', err);
      alert(err.message || 'Failed to start chat');
    }
  };

  const loadMessages = async () => {
    if (!conversationId) return;
    try {
      const { messages } = await api.getMessages(conversationId);
      setMessages(messages);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId || !newMessage.trim()) return;

    try {
      await api.sendMessage(conversationId, newMessage);
      setNewMessage('');
      await loadMessages();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert(err.message || 'Failed to send message');
    }
  };

  const isOwnItem = item?.userId === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center">Loading...</div>
        ) : item ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <DialogTitle className="flex-1">{item.title}</DialogTitle>
                <Badge variant={item.type === 'lost' ? 'destructive' : 'default'}>
                  {item.type === 'lost' ? 'Lost' : 'Found'}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {item.imageUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                  <ImageWithFallback
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm text-gray-500 mb-1">Description</h4>
                  <p>{item.description}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm text-gray-500 mb-1">Category</h4>
                    <Badge variant="outline">{item.category}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 mb-1">Status</h4>
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h4>
                  <p>{item.location}</p>
                </div>

                <div>
                  <h4 className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date {item.type === 'lost' ? 'Lost' : 'Found'}
                  </h4>
                  <p>{new Date(item.date).toLocaleDateString()}</p>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Posted By
                  </h4>
                  <p>{item.userName}</p>
                </div>
              </div>

              {!isOwnItem && !showChat && (
                <Button onClick={handleStartChat} className="w-full">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Owner
                </Button>
              )}

              {showChat && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Chat
                  </h4>
                  <ScrollArea className="h-64 border rounded p-3">
                    <div className="space-y-3">
                      {messages.map((msg) => {
                        const isOwn = msg.senderId === currentUserId;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-3 py-2 ${
                                isOwn
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{msg.text}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
