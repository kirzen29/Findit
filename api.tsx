import { projectId, publicAnonKey } from './supabase/info.tsx';

const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fff7703a`;

async function getAuthToken() {
  const token = localStorage.getItem('accessToken');
  return token;
}

export const api = {
  async createItem(formData: FormData) {
    const token = await getAuthToken();
    console.log('Creating item with token:', token ? 'present' : 'missing');
    
    const response = await fetch(`${baseUrl}/items`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Create item error:', error);
      throw new Error(error.error || 'Failed to create item');
    }

    const result = await response.json();
    console.log('Item created successfully:', result);
    return result;
  },

  async getItems(type?: string, category?: string) {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (category) params.append('category', category);

    const response = await fetch(`${baseUrl}/items?${params}`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch items');
    }

    return response.json();
  },

  async getItem(id: string) {
    const response = await fetch(`${baseUrl}/items/${id}`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch item');
    }

    return response.json();
  },

  async updateItemStatus(id: string, status: string) {
    const token = await getAuthToken();
    const response = await fetch(`${baseUrl}/items/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update item status');
    }

    return response.json();
  },

  async createConversation(itemId: string) {
    const token = await getAuthToken();
    const response = await fetch(`${baseUrl}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ itemId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create conversation');
    }

    return response.json();
  },

  async sendMessage(conversationId: string, text: string) {
    const token = await getAuthToken();
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId, text }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }

    return response.json();
  },

  async getConversations() {
    const token = await getAuthToken();
    const response = await fetch(`${baseUrl}/conversations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch conversations');
    }

    return response.json();
  },

  async getMessages(conversationId: string) {
    const token = await getAuthToken();
    const response = await fetch(`${baseUrl}/messages/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch messages');
    }

    return response.json();
  },

  async getMyItems() {
    const token = await getAuthToken();
    const response = await fetch(`${baseUrl}/my-items`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch my items');
    }

    return response.json();
  },

  async debugKV() {
    const response = await fetch(`${baseUrl}/debug/kv`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to debug KV');
    }

    return response.json();
  },
};
