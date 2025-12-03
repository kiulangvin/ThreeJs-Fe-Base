<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ThreeScene from '@/components/ThreeScene.vue';
import deepseekService, { type Message } from '../services/deepseek';
import { threeSceneSystemPrompt } from '../utils/prompts';

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
const systemPrompt = threeSceneSystemPrompt;

// ThreeScene组件引用
const threeSceneRef = ref<InstanceType<typeof ThreeScene> | null>(null);

// 解析并执行命令
const parseAndExecuteCommand = (response: string) => {
  console.log('Raw response:', response);
  
  try {
    // 首先尝试直接解析整个响应
    try {
      const command = JSON.parse(response);
      executeCommand(command);
      return;
    } catch (directParseError) {
      console.log('Direct parse failed, trying to extract multiple JSON objects...');
    }
    
    // 方法1: 尝试按行分割响应，处理每行可能的JSON
    const lines = response.split('\n');
    let processed = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
        try {
          const command = JSON.parse(trimmedLine);
          executeCommand(command);
          processed = true;
        } catch (lineError) {
          console.log('Line parse failed, trying regex extraction:', lineError);
        }
      }
    }
    
    if (processed) {
      return;
    }
    
    // 方法2: 使用正则表达式匹配所有JSON对象（更可靠的方法）
    const jsonRegex = /\{(?:[^{}]|\{[^}]*\})*\}/g;
    let match;
    
    while ((match = jsonRegex.exec(response)) !== null) {
      try {
        const jsonStr = match[0];
        console.log('Extracted JSON:', jsonStr);
        
        // 清理JSON字符串（移除换行符和多余空格）
        const cleanJson = jsonStr.replace(/[\n\t]/g, ' ');
        
        // 解析JSON
        const command = JSON.parse(cleanJson);
        executeCommand(command);
      } catch (jsonError) {
        console.error('Parse Single Command Error:', jsonError);
        console.error('Error position:', jsonError instanceof SyntaxError ? (jsonError as any).position : 'Unknown');
        console.error('Problematic JSON:', match[0]);
      }
    }
  } catch (error) {
    console.error('Parse Command Error:', error);
    console.error('Raw response:', response);
  }
};

// 执行命令
const executeCommand = (command: any) => {
  try {
    // 验证ThreeScene组件是否存在
    if (!threeSceneRef.value) {
      console.error('ThreeScene组件未找到');
      return;
    }

    // 验证命令格式
    if (typeof command !== 'object' || command === null) {
      console.error('命令格式错误，必须是对象:', command);
      return;
    }

    // 验证action字段
    if (!command.action) {
      console.error('命令缺少action字段:', command);
      return;
    }

    // 验证params字段
    if (!command.params || typeof command.params !== 'object') {
      console.error('命令缺少有效的params字段:', command);
      return;
    }

    // 根据不同的action执行不同的操作
    switch (command.action) {
      case 'addObject':
        // 验证addObject的必填参数
        if (!command.params.type) {
          console.error('addObject命令缺少type参数:', command);
          return;
        }
        threeSceneRef.value.addObject(command.params);
        break;
      
      case 'addMultipleObjects':
        // 验证addMultipleObjects的必填参数
        if (!Array.isArray(command.params.objects)) {
          console.error('addMultipleObjects命令缺少有效的objects数组:', command);
          return;
        }
        threeSceneRef.value.addMultipleObjects(command.params);
        break;
      
      case 'selectObject':
        threeSceneRef.value.selectObject(command.params);
        break;
      
      case 'removeObject':
        threeSceneRef.value.removeObject();
        break;
      
      case 'removeObjectByName':
        // 验证removeObjectByName的必填参数
        if (!command.params.name) {
          console.error('removeObjectByName命令缺少name参数:', command);
          return;
        }
        threeSceneRef.value.removeObjectByName(command.params);
        break;
      
      case 'rotateObject':
        threeSceneRef.value.rotateObject(command.params);
        break;
      
      case 'scaleObject':
        threeSceneRef.value.scaleObject(command.params);
        break;
      
      case 'moveObject':
        threeSceneRef.value.moveObject(command.params);
        break;
      
      case 'changeColor':
        // 验证changeColor的必填参数
        if (!command.params.color) {
          console.error('changeColor命令缺少color参数:', command);
          return;
        }
        threeSceneRef.value.changeColor(command.params);
        break;
      
      case 'changeMaterial':
        // 验证changeMaterial的必填参数
        if (!command.params.material) {
          console.error('changeMaterial命令缺少material参数:', command);
          return;
        }
        threeSceneRef.value.changeMaterial(command.params);
        break;
      
      case 'clearScene':
        threeSceneRef.value.clearScene();
        break;
      
      case 'setBackgroundColor':
        // 验证setBackgroundColor的必填参数
        if (!command.params.color) {
          console.error('setBackgroundColor命令缺少color参数:', command);
          return;
        }
        threeSceneRef.value.setBackgroundColor(command.params);
        break;
      
      case 'setEnvironment':
        // 验证setEnvironment的必填参数
        if (!command.params.color || command.params.intensity === undefined) {
          console.error('setEnvironment命令缺少color或intensity参数:', command);
          return;
        }
        threeSceneRef.value.setEnvironment(command.params);
        break;
      
      case 'addDirectionalLight':
        // 验证addDirectionalLight的必填参数
        if (!command.params.color || command.params.intensity === undefined) {
          console.error('addDirectionalLight命令缺少color或intensity参数:', command);
          return;
        }
        threeSceneRef.value.addDirectionalLight(command.params);
        break;
      
      case 'addPointLight':
        // 验证addPointLight的必填参数
        if (!command.params.color || command.params.intensity === undefined) {
          console.error('addPointLight命令缺少color或intensity参数:', command);
          return;
        }
        threeSceneRef.value.addPointLight(command.params);
        break;
      
      case 'addSpotLight':
        // 验证addSpotLight的必填参数
        if (!command.params.color || command.params.intensity === undefined) {
          console.error('addSpotLight命令缺少color或intensity参数:', command);
          return;
        }
        threeSceneRef.value.addSpotLight(command.params);
        break;
      
      case 'setCameraPosition':
        threeSceneRef.value.setCameraPosition(command.params);
        break;
      
      case 'lookAt':
        threeSceneRef.value.lookAt(command.params);
        break;
      
      default:
        console.warn('未知的命令action:', command.action);
        break;
    }
  } catch (error) {
    console.error('执行命令时出错:', error, '命令:', command);
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
