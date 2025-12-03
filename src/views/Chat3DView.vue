<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ThreeScene from '@/components/ThreeScene.vue';
import deepseekService, { type Message } from '../services/deepseek';

// 对话消息
const messages = ref<Message[]>([
  {
    role: 'assistant',
    content: '你好！我是你的Three.js助手。你可以用自然语言命令来控制3D场景，例如：\n- 添加一个立方体\n- 旋转模型\n- 改变颜色\n- 缩放对象\n- 清空场景\n\n开始试试吧！'
  }
]);

// 输入消息
const inputMessage = ref('');

// 加载状态
const loading = ref(false);

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim()) return;

  // 添加用户消息
  const userMessage: Message = {
    role: 'user',
    content: inputMessage.value.trim()
  };
  messages.value.push(userMessage);
  const userInput = inputMessage.value.trim();
  inputMessage.value = '';

  loading.value = true;

  try {
    // 调用DeepSeek API
    const result = await deepseekService.chat(
      [...messages.value, { role: 'system', content: systemPrompt }],
      { max_tokens: 500 }
    );

    if (result.success && result.message) {
      // 添加助手消息
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.message.content
      };
      messages.value.push(assistantMessage);

      // 解析命令并执行
      parseAndExecuteCommand(result.message.content);
    } else {
      // 添加错误消息
      const errorMessage: Message = {
        role: 'assistant',
        content: '抱歉，我无法理解您的请求。请再试一次。'
      };
      messages.value.push(errorMessage);
    }
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage: Message = {
      role: 'assistant',
      content: '抱歉，请求失败了。请检查网络连接或稍后再试。'
    };
    messages.value.push(errorMessage);
  } finally {
    loading.value = false;
  }
};

// 系统提示词
const systemPrompt = `你是一个Three.js场景控制助手，只能处理控制3D场景的命令。

请遵循以下规则：
1. 只能输出JSON格式，不要包含其他任何文本
2. JSON结构：{"action": "操作类型", "params": {"参数1": "值1", "参数2": "值2"}}
3. 支持的操作类型：
   - addObject: 添加对象（立方体、球体、圆柱体）
     - params: {type: "cube"|"sphere"|"cylinder", size: number, color: string, position?: {x: number, y: number, z: number}}
   - rotateObject: 旋转对象
     - params: {x: number, y: number, z: number}
   - scaleObject: 缩放对象
     - params: {x: number, y: number, z: number}
   - changeColor: 改变颜色
     - params: {color: string}
   - clearScene: 清空场景
     - params: {}
4. 如果用户的请求无法识别为上述操作，请输出：{"action": "unknown", "params": {}}

例子：
- 用户输入：添加一个红色立方体
  输出：{"action": "addObject", "params": {"type": "cube", "size": 1, "color": "#ff0000"}}
- 用户输入：在(1, 0, -2)位置添加一个绿色球体，大小为2
  输出：{"action": "addObject", "params": {"type": "sphere", "size": 2, "color": "#00ff00", "position": {"x": 1, "y": 0, "z": -2}}}
- 用户输入：旋转模型
  输出：{"action": "rotateObject", "params": {"x": 0, "y": 0.1, "z": 0}}
- 用户输入：放大两倍
  输出：{"action": "scaleObject", "params": {"x": 2, "y": 2, "z": 2}}
- 用户输入：把颜色改成蓝色
  输出：{"action": "changeColor", "params": {"color": "#0000ff"}}
- 用户输入：清空场景
  输出：{"action": "clearScene", "params": {}}
`;

// ThreeScene组件引用
const threeSceneRef = ref<InstanceType<typeof ThreeScene> | null>(null);

// 解析并执行命令
const parseAndExecuteCommand = (response: string) => {
  try {
    // 清理响应字符串
    let cleanResponse = response.trim();
    
    // 移除可能的前后引号
    if ((cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) || 
        (cleanResponse.startsWith('\'') && cleanResponse.endsWith('\''))) {
      cleanResponse = cleanResponse.slice(1, -1);
    }
    
    // 尝试直接解析清理后的字符串
    const command = JSON.parse(cleanResponse);
    executeCommand(command);
  } catch (error) {
    try {
      // 如果直接解析失败，尝试提取JSON部分
      // 改进的正则表达式，可以处理嵌套的JSON结构
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // 再次清理提取出的JSON
        let cleanJson = jsonMatch[0].trim();
        
        // 移除可能的前后引号
        if ((cleanJson.startsWith('"') && cleanJson.endsWith('"')) || 
            (cleanJson.startsWith('\'') && cleanJson.endsWith('\''))) {
          cleanJson = cleanJson.slice(1, -1);
        }
        
        const command = JSON.parse(cleanJson);
        executeCommand(command);
      }
    } catch (secondError) {
      console.error('Parse Command Error:', secondError);
      console.error('Raw response:', response);
    }
  }
};

// 执行命令
const executeCommand = (command: any) => {
  if (!threeSceneRef.value) {
    console.error('ThreeScene component not found');
    return;
  }

  if (!command || typeof command !== 'object') {
    console.error('Invalid command format:', command);
    return;
  }

  if (!command.action) {
    console.error('Command action is missing:', command);
    return;
  }

  // 确保params是对象
  if (command.params && typeof command.params !== 'object') {
    console.error('Command params must be an object:', command);
    return;
  }

  try {
    switch (command.action) {
      case 'addObject':
        if (!command.params?.type) {
          console.error('Missing required parameter "type" for addObject command');
          return;
        }
        threeSceneRef.value.addObject(command.params);
        break;
      case 'rotateObject':
        threeSceneRef.value.rotateObject(command.params || {});
        break;
      case 'scaleObject':
        threeSceneRef.value.scaleObject(command.params || {});
        break;
      case 'changeColor':
        if (!command.params?.color) {
          console.error('Missing required parameter "color" for changeColor command');
          return;
        }
        threeSceneRef.value.changeColor(command.params);
        break;
      case 'clearScene':
        threeSceneRef.value.clearScene();
        break;
      default:
        console.log('Unknown command:', command.action);
    }
  } catch (error) {
    console.error('Error executing command:', error);
    console.error('Command:', command);
  }
};

// 键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !loading.value) {
    sendMessage();
  }
};

onMounted(() => {
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="chat-3d-container">
    <!-- 左侧对话区域 -->
    <div class="chat-panel">
      <div class="chat-header">
        <h2>Three.js 助手</h2>
      </div>
      
      <div class="chat-messages">
        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          :class="['message', msg.role]"
        >
          <div class="message-content">{{ msg.content }}</div>
        </div>
        
        <div v-if="loading" class="loading-indicator">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
      
      <div class="chat-input">
        <input
          v-model="inputMessage"
          type="text"
          placeholder="输入命令控制3D场景..."
          :disabled="loading"
        />
        <button @click="sendMessage" :disabled="loading || !inputMessage.trim()">
          {{ loading ? '发送中...' : '发送' }}
        </button>
      </div>
    </div>
    
    <!-- 右侧Three.js渲染区域 -->
    <div class="three-panel">
      <div class="three-header">
        <h2>3D 场景</h2>
      </div>
      <div class="three-container">
        <ThreeScene ref="threeSceneRef" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-3d-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* 左侧对话面板 */
.chat-panel {
  width: 400px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.chat-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #ffffff;
}

.chat-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 8px;
  word-wrap: break-word;
}

.message.user {
  align-self: flex-end;
  background-color: #007bff;
  color: white;
}

.message.assistant {
  align-self: flex-start;
  background-color: #ffffff;
  color: #333;
  border: 1px solid #e0e0e0;
}

.loading-indicator {
  align-self: flex-start;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #007bff;
  animation: loading 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.chat-input {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background-color: #ffffff;
  display: flex;
  gap: 8px;
}

.chat-input input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input input:focus {
  border-color: #007bff;
}

.chat-input button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chat-input button:hover:not(:disabled) {
  background-color: #0056b3;
}

.chat-input button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* 右侧Three.js面板 */
.three-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.three-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #ffffff;
}

.three-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.three-container {
  flex: 1;
  position: relative;
  background-color: #000000;
}
</style>
