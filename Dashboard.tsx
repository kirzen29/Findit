import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ItemCard } from './ItemCard';
import { ReportItemDialog } from './ReportItemDialog';
import { ItemDetailDialog } from './ItemDetailDialog';
import { MessageSquare, LogOut, Package } from 'lucide-react@0.487.0';
import { api } from '../utils/api';
import { authService } from '../utils/auth';

interface Item {
  id: string;
  type: 'lost' | 'found';
  category: string;
  title: string;
  description: string;
  location: string;
  date: string;
  imageUrl?: string;
  status: string;
}

interface Conversation {
  id: string;
  itemId: string;
  lastMessageAt: string;
  item?: Item;
  otherUser?: {
    name: string;
  };
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('lost');
  const [category, setCategory] = useState('all');
  const [items, setItems] = useState<Item[]>([]);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadItems();
    loadUserInfo();
  }, [activeTab, category]);

  useEffect(() => {
    if (activeTab === 'messages') {
      loadConversations();
    } else if (activeTab === 'my-items') {
      loadMyItems();
    }
  }, [activeTab]);

  const loadUserInfo = async () => {
    try {
      const user = await authService.getCurrentUser();
      setUserName(user?.user_metadata?.name || user?.email || 'User');
    } catch (err) {
      console.error('Failed to load user info:', err);
    }
  };

  const loadItems = async () => {
    if (activeTab === 'messages' || activeTab === 'my-items') return;
    
    setIsLoading(true);
    try {
      const type = activeTab === 'lost' ? 'lost' : 'found';
      console.log('Fetching items with:', { type, category });
      const { items } = await api.getItems(type, category !== 'all' ? category : undefined);
      console.log('Received items:', items);
      setItems(items);
    } catch (err: any) {
      console.error('Failed to load items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyItems = async () => {
    setIsLoading(true);
    try {
      const { items } = await api.getMyItems();
      setMyItems(items);
    } catch (err: any) {
      console.error('Failed to load my items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const { conversations } = await api.getConversations();
      setConversations(conversations);
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      localStorage.removeItem('accessToken');
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to sign out:', err);
    }
  };

  const handleItemClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setShowItemDetail(true);
  };

  const CATEGORIES = [
    'all',
    'Electronics',
    'Books & Stationery',
    'Clothing & Accessories',
    'Keys & Cards',
    'Bags & Wallets',
    'Sports Equipment',
    'Jewelry',
    'Documents',
    'Other',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1>Campus Lost & Found</h1>
              <p className="text-sm text-gray-600">Welcome, {userName}</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="lost">Lost Items</TabsTrigger>
            <TabsTrigger value="found">Found Items</TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
              {conversations.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {conversations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-items">
              <Package className="h-4 w-4 mr-2" />
              My Items
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lost">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm">Filter by category:</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ReportItemDialog type="lost" onSuccess={loadItems} />
              </div>

              {isLoading ? (
                <div className="text-center py-12">Loading items...</div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No lost items found. Be the first to report one!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onClick={() => handleItemClick(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="found">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm">Filter by category:</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ReportItemDialog type="found" onSuccess={loadItems} />
              </div>

              {isLoading ? (
                <div className="text-center py-12">Loading items...</div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No found items yet. Help someone by reporting a found item!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onClick={() => handleItemClick(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages">
            {isLoading ? (
              <div className="text-center py-12">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No messages yet. Start a conversation by contacting item owners!
              </div>
            ) : (
              <div className="space-y-4">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      if (conv.item?.id) {
                        handleItemClick(conv.item.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm">{conv.item?.title || 'Item'}</h3>
                          {conv.item && (
                            <Badge
                              variant={conv.item.type === 'lost' ? 'destructive' : 'default'}
                              className="text-xs"
                            >
                              {conv.item.type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Chatting with {conv.otherUser?.name || 'User'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(conv.lastMessageAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-items">
            {isLoading ? (
              <div className="text-center py-12">Loading your items...</div>
            ) : myItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                You haven't posted any items yet. Report a lost or found item to get started!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() => handleItemClick(item.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ItemDetailDialog
        itemId={selectedItemId}
        open={showItemDetail}
        onClose={() => {
          setShowItemDetail(false);
          setSelectedItemId(null);
        }}
      />
    </div>
  );
}
