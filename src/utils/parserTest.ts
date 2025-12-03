// 测试parseAndExecuteCommand方法

// 模拟执行命令的函数
const executeCommand = (command: any) => {
  console.log('Command executed successfully:', command);
};

// 复制parseAndExecuteCommand方法的实现
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
    return { success: true, command };
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
        return { success: true, command };
      } else {
        return { success: false, error: 'No JSON found in response' };
      }
    } catch (secondError) {
      console.error('Parse Command Error:', secondError);
      console.error('Raw response:', response);
      return { success: false, error: secondError };
    }
  }
};

// 测试用例
const testCases = [
  // 用户提供的问题字符串
  '"{\"action\": \"addObject\", \"params\": {\"type\": \"cube\", \"size\": 1, \"color\": \"#ffffff\"}}"',
  // 正常JSON字符串
  '{"action": "addObject", "params": {"type": "cube", "size": 1, "color": "#ffffff"}}',
  // 带空格的JSON字符串
  ' {"action": "addObject", "params": {"type": "cube", "size": 1, "color": "#ffffff"}} ',
  // 带单引号的JSON字符串
  "'{\"action\": \"addObject\", \"params\": {\"type\": \"cube\", \"size\": 1, \"color\": \"#ffffff\"}}'",
  // 带嵌套结构的复杂JSON
  '{"action": "addObject", "params": {"type": "cube", "size": 1, "color": "#ffffff", "position": {"x": 0, "y": 0, "z": 0}}}',
];

// 运行测试
console.log('=== Testing parseAndExecuteCommand ===\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase}`);
  const result = parseAndExecuteCommand(testCase);
  
  if (result.success) {
    console.log(`✓ SUCCESS: Parsed command:`, result.command);
  } else {
    console.log(`✗ FAILED: ${result.error}`);
  }
  
  console.log('---');
});

console.log('\n=== All tests completed ===');
