// src/services/deepseek.ts
import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

type Role = 'system' | 'user' | 'assistant' | string;

export interface Message {
  role: Role;
  content: string;
  name?: string;
}

export interface DefaultConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  [key: string]: any;
}

export interface ChatResult {
  success: boolean;
  data?: any;
  message?: any;
  usage?: any;
  error?: string;
}

class DeepSeekService {
  private apiKey?: string;
  private baseURL: string;
  private model: string;
  private client: AxiosInstance;
  private defaultConfig: DefaultConfig;

  constructor() {
    const env = import.meta.env as Record<string, any>;
    this.apiKey = env.VITE_DEEPSEEK_API_KEY as string | undefined;
    this.baseURL = (env.VITE_DEEPSEEK_BASE_URL as string) || 'https://api.deepseek.com';
    this.model = (env.VITE_DEEPSEEK_MODEL as string) || 'deepseek-chat';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.defaultConfig = {
      model: this.model,
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
    };
  }

  /** 普通聊天接口 */
  public async chat(messages: Message[], config: Partial<DefaultConfig> = {}): Promise<ChatResult> {
    try {
      if (!this.apiKey) {
        throw new Error('API key is missing. Please check the VITE_DEEPSEEK_API_KEY environment variable.');
      }
      const response = await this.client.post('/chat/completions', {
        ...this.defaultConfig,
        ...config,
        messages: this.formatMessages(messages),
        stream: false,
      });

      return {
        success: true,
        data: response.data,
        message: response.data?.choices?.[0]?.message,
        usage: response.data?.usage,
      };
    } catch (err) {
      console.error('DeepSeek API Error:', err);
      return {
        success: false,
        error: this.handleError(err),
        message: '抱歉，请求失败了，请稍后再试。',
      };
    }
  }

  /** 流式聊天接口（SSE-like） */
  public async chatStream(
    messages: Message[],
    config: Partial<DefaultConfig> = {},
    onChunk?: (delta: string, full: string) => void,
    onComplete?: (full: string) => void,
    onError?: (err: unknown) => void,
  ): Promise<void> {
    try {
      if (!this.apiKey) {
        throw new Error('API key is missing. Please check the VITE_DEEPSEEK_API_KEY environment variable.');
      }
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...this.defaultConfig,
          ...config,
          messages: this.formatMessages(messages),
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) throw new Error('ReadableStream not supported by this environment');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete?.(fullResponse);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullResponse += delta;
                onChunk?.(delta, fullResponse);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Stream Error:', err);
      onError?.(err);
    }
  }

  private formatMessages(messages: Message[]) {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name ? { name: msg.name } : {}),
    }));
  }

  private handleError(error: unknown): string {
    if (!error) return '未知错误';

    if ((error as AxiosError).isAxiosError) {
      const axiosErr = error as AxiosError & { response?: any };
      if (axiosErr.response) {
        const { status, data } = axiosErr.response;
        switch (status) {
          case 401:
            return 'API Key 无效，请检查配置';
          case 429:
            return '请求过于频繁，请稍后再试';
          case 500:
            return '服务器内部错误';
          default:
            return data?.error?.message || `请求失败: ${status}`;
        }
      }
      if (axiosErr.request) return '网络错误，请检查网络连接';
      return axiosErr.message;
    }

    if (error instanceof Error) return error.message;
    return String(error);
  }

  public async listModels(): Promise<{ success: boolean; models?: any[]; error?: string }> {
    try {
      const response = await this.client.get('/models');
      return { success: true, models: response.data?.data || [] };
    } catch (err) {
      console.error('List Models Error:', err);
      return { success: false, error: this.handleError(err) };
    }
  }

  /** 简单估算 tokens：汉字算 1，英文单词算 0.75 */
  public estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/\b[a-zA-Z]+\b/g) || []).length;
    return Math.ceil(chineseChars + englishWords * 0.75);
  }
}

const deepseekService = new DeepSeekService();
export default deepseekService;