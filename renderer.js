const { ipcRenderer } = require('electron');

// 获取DOM元素
const dropArea = document.getElementById('drop-area');
const selectFolderButton = document.getElementById('select-folder');
const output = document.getElementById('output');
const copyButton = document.getElementById('copy-button');
const processingInfo = document.getElementById('processing-info');
const currentFile = document.getElementById('current-file');
const currentPath = document.getElementById('current-path');
const applyButton = document.getElementById('apply-button');

// 全局变量
let globalTreeData = [];
let fileVisibility = new Map();

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

// 创建文件树项目
function createTreeItem(item) {
  const itemDiv = document.createElement('div');
  itemDiv.className = 'tree-item';
  
  const header = document.createElement('div');
  header.className = 'tree-item-header';
  
  if (item.type === 'folder') {
    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.textContent = '▼';
    header.appendChild(toggle);
    
    const folderIcon = document.createElement('span');
    folderIcon.className = 'folder-icon';
    folderIcon.textContent = '📁';
    header.appendChild(folderIcon);
  } else {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'file-checkbox';
    checkbox.checked = fileVisibility.get(item.path) !== false;
    checkbox.addEventListener('change', () => {
      fileVisibility.set(item.path, checkbox.checked);
    });
    header.appendChild(checkbox);
    
    const fileIcon = document.createElement('span');
    fileIcon.className = 'file-icon';
    fileIcon.textContent = '📄';
    header.appendChild(fileIcon);
  }
  
  const name = document.createElement('span');
  name.textContent = item.name;
  header.appendChild(name);
  
  itemDiv.appendChild(header);
  
  if (item.type === 'folder' && item.children) {
    const content = document.createElement('div');
    content.className = 'tree-item-content show';
    item.children.forEach(child => {
      content.appendChild(createTreeItem(child));
    });
    itemDiv.appendChild(content);
    
    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('file-checkbox')) return;
      const toggle = header.querySelector('.tree-toggle');
      const content = itemDiv.querySelector('.tree-item-content');
      if (content.classList.contains('show')) {
        content.classList.remove('show');
        toggle.textContent = '▶';
      } else {
        content.classList.add('show');
        toggle.textContent = '▼';
      }
    });
  }
  
  return itemDiv;
}

// 更新输出内容
function updateOutput() {
  let outputText = '';
  
  function processItem(item, indent = '') {
    if (item.type === 'folder') {
      outputText += `${indent}├───${item.name}/\n`;
      const newIndent = indent + '│   ';
      item.children.forEach(child => processItem(child, newIndent));
    } else {
      // 总是显示文件名
      outputText += `${indent}├───${item.name}\n`;
      // 只有当文件被选中时才显示内容
      if (fileVisibility.get(item.path) !== false && item.content) {
        const contentIndent = indent + '│       ';
        item.content.split('\n').forEach(line => {
          outputText += `${contentIndent}${line}\n`;
        });
      }
    }
  }
  
  globalTreeData.forEach(item => processItem(item));
  output.textContent = outputText;
}

// 初始化文件可见性
function initializeFileVisibility(items) {
  items.forEach(item => {
    if (item.type === 'file') {
      fileVisibility.set(item.path, true);
    } else if (item.type === 'folder' && item.children) {
      initializeFileVisibility(item.children);
    }
  });
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
    globalTreeData = result.treeData;
    
    // 初始化文件可见性
    initializeFileVisibility(globalTreeData);
    
    // 渲染文件树
    const fileTree = document.getElementById('file-tree');
    fileTree.innerHTML = '';
    globalTreeData.forEach(item => {
      fileTree.appendChild(createTreeItem(item));
    });
    
    // 清空输出区域，等待用户点击应用按钮
    output.textContent = '请在左侧选择要显示的文件，然后点击"应用选择"按钮查看内容';
    
    // 启用应用按钮
    applyButton.disabled = false;
    
  } catch (error) {
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

// 添加应用按钮的点击事件处理
applyButton.addEventListener('click', () => {
  updateOutput();
  
  // 显示成功提示
  const originalText = applyButton.textContent;
  applyButton.textContent = '已应用！';
  applyButton.style.backgroundColor = '#4CAF50';
  
  // 2秒后恢复按钮原状
  setTimeout(() => {
    applyButton.textContent = originalText;
    applyButton.style.backgroundColor = '#4CAF50';
  }, 2000);
});