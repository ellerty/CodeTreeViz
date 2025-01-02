// renderer.js
const { ipcRenderer } = require('electron');

// 获取DOM元素
const dropArea = document.getElementById('drop-area');
const selectFolderButton = document.getElementById('select-folder');
const output = document.getElementById('output');
const copyButton = document.getElementById('copy-button');
const processingInfo = document.getElementById('processing-info');
const currentFile = document.getElementById('current-file');
const currentPath = document.getElementById('current-path');

// 防止默认的拖放行为
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// 拖放区域视觉反馈
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
  dropArea.classList.add('dragover');
}

function unhighlight() {
  dropArea.classList.remove('dragover');
}

// 处理文件夹拖放
dropArea.addEventListener('drop', async (e) => {
  const items = [];
  for (const item of e.dataTransfer.items) {
    if (item.kind === 'file') {
      items.push(item.getAsFile().path);
    }
  }
  if (items.length > 0) {
    await processItems(items);
  }
});

// 处理选择按钮
selectFolderButton.addEventListener('click', async () => {
  const paths = await ipcRenderer.invoke('select-files');
  if (paths.length > 0) {
    await processItems(paths);
  }
});

// 处理多个项目
async function processItems(paths) {
  try {
    output.textContent = '';
    processingInfo.style.display = 'block';
    currentFile.textContent = '准备处理...';
    currentPath.textContent = paths.join(', ');
    
    selectFolderButton.disabled = true;
    copyButton.disabled = true;
    
    const result = await ipcRenderer.invoke('process-items', paths);
    output.textContent = result;
  } catch (error) {// renderer.js (续)
    output.textContent = `处理错误: ${error.message}`;
  } finally {
    selectFolderButton.disabled = false;
    copyButton.disabled = false;
  }
}
// 监听文件处理进度更新
ipcRenderer.on('processing-file', (event, data) => {
  currentFile.textContent = data.currentFile;
  currentPath.textContent = data.currentPath;
});

// 监听处理完成事件
ipcRenderer.on('processing-complete', () => {
  processingInfo.style.display = 'none';
  currentFile.textContent = '-';
  currentPath.textContent = '-';
});

// 复制按钮功能
copyButton.addEventListener('click', () => {
  try {
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = output.textContent;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);
    
    // 显示成功提示
    const originalText = copyButton.textContent;
    copyButton.textContent = '复制成功！';
    copyButton.style.backgroundColor = '#4CAF50';
    
    // 2秒后恢复按钮原状
    setTimeout(() => {
      copyButton.textContent = originalText;
      copyButton.style.backgroundColor = '#2196F3';
    }, 2000);
  } catch (error) {
    alert('复制失败: ' + error.message);
  }
});

// 错误处理
window.addEventListener('error', (event) => {
  console.error('错误:', event.error);
  output.textContent = `发生错误: ${event.error.message}`;
});

// 添加键盘快捷键支持
document.addEventListener('keydown', (e) => {
  // Ctrl+C 或 Command+C 复制内容
  if ((e.ctrlKey || e.metaKey) && e.key === 'c' && document.activeElement === output) {
    copyButton.click();
  }
});