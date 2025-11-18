import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Initialize storage bucket
const bucketName = 'make-fff7703a-items';
const { data: buckets } = await supabase.storage.listBuckets();
const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
if (!bucketExists) {
  await supabase.storage.createBucket(bucketName, { public: false });
  console.log(`Created bucket: ${bucketName}`);
}

// Auth middleware
async function requireAuth(c: any, next: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user?.id) {
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }
  
  c.set('userId', user.id);
  c.set('userEmail', user.email);
  await next();
}

// ============== AUTH ROUTES ==============

app.post('/make-server-fff7703a/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email: data.user.email,
      name,
      createdAt: new Date().toISOString(),
    });

    return c.json({ user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

// ============== ITEM ROUTES ==============

app.post('/make-server-fff7703a/items', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    console.log('Creating item for user:', userId);
    
    const formData = await c.req.formData();
    
    const type = formData.get('type') as string; // 'lost' or 'found'
    const category = formData.get('category') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const location = formData.get('location') as string;
    const date = formData.get('date') as string;
    const image = formData.get('image') as File | null;

    console.log('Form data:', { type, category, title, description, location, date, hasImage: !!image });

    if (!type || !category || !title || !description || !location || !date) {
      console.error('Missing required fields:', { type, category, title, description, location, date });
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const itemId = crypto.randomUUID();
    let imageUrl = null;

    // Upload image if provided
    if (image) {
      const fileExt = image.name.split('.').pop();
      const filePath = `${itemId}.${fileExt}`;
      
      const arrayBuffer = await image.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, arrayBuffer, {
          contentType: image.type,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return c.json({ error: 'Failed to upload image' }, 500);
      }

      // Get signed URL
      const { data: signedUrlData } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      imageUrl = signedUrlData?.signedUrl;
    }

    const item = {
      id: itemId,
      type,
      category,
      title,
      description,
      location,
      date,
      imageUrl,
      userId,
      status: 'active', // 'active' or 'resolved'
      createdAt: new Date().toISOString(),
    };

    await kv.set(`item:${itemId}`, item);
    await kv.set(`userItem:${userId}:${itemId}`, itemId);

    console.log('Item created successfully:', itemId);
    return c.json({ item });
  } catch (error) {
    console.error('Create item error:', error);
    return c.json({ error: 'Failed to create item' }, 500);
  }
});

// Debug endpoint to check KV store
app.get('/make-server-fff7703a/debug/kv', async (c) => {
  try {
    const allItems = await kv.getByPrefix('item:');
    return c.json({ 
      count: allItems.length,
      items: allItems
    });
  } catch (error) {
    console.error('Debug KV error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get('/make-server-fff7703a/items', async (c) => {
  try {
    const type = c.req.query('type'); // 'lost' or 'found'
    const category = c.req.query('category');
    
    console.log('Fetching items with filters:', { type, category });
    
    const allItems = await kv.getByPrefix('item:');
    console.log('All items from KV:', allItems.length, 'items');
    
    // getByPrefix already returns values directly, not objects with .value property
    let items = allItems.filter(item => item !== null && item !== undefined);

    console.log('After null filter:', items.length, 'items');

    // Filter by type
    if (type) {
      items = items.filter(item => item && item.type === type);
      console.log('After type filter:', items.length, 'items');
    }

    // Filter by category
    if (category && category !== 'all') {
      items = items.filter(item => item && item.category === category);
      console.log('After category filter:', items.length, 'items');
    }

    // Sort by most recent
    items.sort((a, b) => {
      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    console.log('Returning items:', items.length);
    return c.json({ items });
  } catch (error) {
    console.error('Get items error:', error);
    return c.json({ error: 'Failed to fetch items' }, 500);
  }
});

app.get('/make-server-fff7703a/items/:id', async (c) => {
  try {
    const itemId = c.req.param('id');
    const item = await kv.get(`item:${itemId}`);

    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    // Get user info
    const user = await kv.get(`user:${item.userId}`);

    return c.json({ 
      item: {
        ...item,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
      }
    });
  } catch (error) {
    console.error('Get item error:', error);
    return c.json({ error: 'Failed to fetch item' }, 500);
  }
});

app.patch('/make-server-fff7703a/items/:id/status', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const itemId = c.req.param('id');
    const { status } = await c.req.json();

    const item = await kv.get(`item:${itemId}`);
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    if (item.userId !== userId) {
      return c.json({ error: 'Unauthorized - Not item owner' }, 403);
    }

    const updatedItem = { ...item, status };
    await kv.set(`item:${itemId}`, updatedItem);

    return c.json({ item: updatedItem });
  } catch (error) {
    console.error('Update item status error:', error);
    return c.json({ error: 'Failed to update item status' }, 500);
  }
});

// ============== CHAT/MESSAGE ROUTES ==============

app.post('/make-server-fff7703a/conversations', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { itemId } = await c.req.json();

    const item = await kv.get(`item:${itemId}`);
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    // Create conversation ID (sorted user IDs for consistency)
    const participants = [userId, item.userId].sort();
    const conversationId = `${participants[0]}_${participants[1]}_${itemId}`;

    // Check if conversation already exists
    const existing = await kv.get(`conversation:${conversationId}`);
    if (existing) {
      return c.json({ conversation: existing });
    }

    const conversation = {
      id: conversationId,
      itemId,
      participants,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    };

    await kv.set(`conversation:${conversationId}`, conversation);
    await kv.set(`userConversation:${userId}:${conversationId}`, conversationId);
    await kv.set(`userConversation:${item.userId}:${conversationId}`, conversationId);

    return c.json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    return c.json({ error: 'Failed to create conversation' }, 500);
  }
});

app.post('/make-server-fff7703a/messages', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { conversationId, text } = await c.req.json();

    const conversation = await kv.get(`conversation:${conversationId}`);
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    if (!conversation.participants.includes(userId)) {
      return c.json({ error: 'Unauthorized - Not a participant' }, 403);
    }

    const messageId = `${conversationId}:${Date.now()}:${crypto.randomUUID()}`;
    const message = {
      id: messageId,
      conversationId,
      senderId: userId,
      text,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`message:${messageId}`, message);

    // Update conversation last message time
    await kv.set(`conversation:${conversationId}`, {
      ...conversation,
      lastMessageAt: message.createdAt,
    });

    return c.json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

app.get('/make-server-fff7703a/conversations', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const conversationIds = await kv.getByPrefix(`userConversation:${userId}:`);
    
    // getByPrefix returns values directly (conversationIds in this case)
    const conversations = await Promise.all(
      conversationIds.map(async (conversationId) => {
        const conv = await kv.get(`conversation:${conversationId}`);
        if (!conv) return null;

        // Get item details
        const item = await kv.get(`item:${conv.itemId}`);
        
        // Get other participant details
        const otherUserId = conv.participants.find((id: string) => id !== userId);
        const otherUser = await kv.get(`user:${otherUserId}`);

        return {
          ...conv,
          item,
          otherUser,
        };
      })
    );

    const validConversations = conversations.filter(c => c !== null);
    validConversations.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return c.json({ conversations: validConversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    return c.json({ error: 'Failed to fetch conversations' }, 500);
  }
});

app.get('/make-server-fff7703a/messages/:conversationId', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const conversationId = c.req.param('conversationId');

    const conversation = await kv.get(`conversation:${conversationId}`);
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    if (!conversation.participants.includes(userId)) {
      return c.json({ error: 'Unauthorized - Not a participant' }, 403);
    }

    const allMessages = await kv.getByPrefix(`message:${conversationId}:`);
    // getByPrefix returns values directly (message objects in this case)
    const messages = allMessages
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Get sender names
    const messagesWithNames = await Promise.all(
      messages.map(async (msg) => {
        const user = await kv.get(`user:${msg.senderId}`);
        return {
          ...msg,
          senderName: user?.name || 'Unknown',
        };
      })
    );

    return c.json({ messages: messagesWithNames });
  } catch (error) {
    console.error('Get messages error:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

app.get('/make-server-fff7703a/my-items', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userItemIds = await kv.getByPrefix(`userItem:${userId}:`);
    
    // getByPrefix returns values directly (itemIds in this case)
    const items = await Promise.all(
      userItemIds.map(async (itemId) => {
        const item = await kv.get(`item:${itemId}`);
        return item;
      })
    );

    const validItems = items.filter(item => item !== null && item !== undefined);
    validItems.sort((a, b) => {
      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return c.json({ items: validItems });
  } catch (error) {
    console.error('Get my items error:', error);
    return c.json({ error: 'Failed to fetch items' }, 500);
  }
});

Deno.serve(app.fetch);
