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
let folderVisibility = new Map();
let filterRulesDialog = null;

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
  
  // 为所有项目（文件夹和文件）添加复选框
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'file-checkbox';
  
  if (item.type === 'folder') {
    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.textContent = '▼';
    header.appendChild(checkbox);
    header.appendChild(toggle);
    
    const folderIcon = document.createElement('span');
    folderIcon.className = 'folder-icon';
    folderIcon.textContent = '📁';
    header.appendChild(folderIcon);
    
    // 设置文件夹复选框状态
    checkbox.checked = folderVisibility.get(item.path) !== false;
    
    // 文件夹复选框变化事件
    checkbox.addEventListener('change', () => {
      const isChecked = checkbox.checked;
      folderVisibility.set(item.path, isChecked);
      
      // 递归更新所有子项的状态
      function updateChildrenState(children) {
        children.forEach(child => {
          if (child.type === 'folder') {
            folderVisibility.set(child.path, isChecked);
            if (child.children) {
              updateChildrenState(child.children);
            }
          } else {
            fileVisibility.set(child.path, isChecked);
          }
        });
      }
      
      if (item.children) {
        updateChildrenState(item.children);
      }
      
      // 更新 DOM 中子项的复选框状态
      const childCheckboxes = itemDiv.querySelectorAll('.file-checkbox');
      childCheckboxes.forEach(cb => {
        cb.checked = isChecked;
      });
    });
    
  } else {
    header.appendChild(checkbox);
    
    const fileIcon = document.createElement('span');
    fileIcon.className = 'file-icon';
    fileIcon.textContent = '📄';
    header.appendChild(fileIcon);
    
    // 设置文件复选框状态
    checkbox.checked = fileVisibility.get(item.path) !== false;
    
    // 文件复选框变化事件
    checkbox.addEventListener('change', () => {
      fileVisibility.set(item.path, checkbox.checked);
    });
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
      if (e.target.type === 'checkbox') return;
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
      // 总是显示文件夹结构
      outputText += `${indent}├───${item.name}/\n`;
      const newIndent = indent + '│   ';
      item.children.forEach(child => processItem(child, newIndent));
    } else {
      // 总是显示文件名
      outputText += `${indent}├───${item.name}\n`;
      // 只有当文件被选中且其所有父文件夹都被选中时才显示内容
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
    } else if (item.type === 'folder') {
      folderVisibility.set(item.path, true);
      if (item.children) {
        initializeFileVisibility(item.children);
      }
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

// 默认过滤规则
const defaultFilterRules = [
  // 自动生成的文件
  /\.class$/, /\.o$/, /\.obj$/, /\.exe$/,
  /dist\//, /build\//,
  /\.tmp$/, /\.swp$/, /\.bak$/,
  // 缓存文件
  /\.DS_Store$/, /Thumbs\.db$/,
  /\.cache\//, /\.mypy_cache\//,
  // 日志文件
  /\.log$/,
  // 工具配置文件的备份版本
  /~$/, /\.bak$/,
  // 历史性或已弃用的文件
  /old_/, /_v1\./,
  // 开发工具生成的特定文件
  /\.idea\//, /\.vscode\//
];

// 用户自定义过滤规则
let customFilterRules = [];

// 检查文件或文件夹是否匹配过滤规则
function matchesFilterRules(name) {
  const rules = [...defaultFilterRules, ...customFilterRules];
  return rules.some(rule => {
    try {
      return rule.test(name);
    } catch (error) {
      console.error('规则匹配错误:', error);
      return false;
    }
  });
}

// 应用过滤规则
function applyFilterRules() {
  function processItem(item) {
    if (matchesFilterRules(item.name)) {
      if (item.type === 'folder') {
        folderVisibility.set(item.path, false);
      } else {
        fileVisibility.set(item.path, false);
      }
    }
    
    // 递归处理子项目
    if (item.type === 'folder' && item.children) {
      item.children.forEach(processItem);
    }
  }
  
  // 处理所有根项目
  globalTreeData.forEach(processItem);
  
  // 更新文件树显示
  updateFileTree();
}

// 更新文件树
function updateFileTree() {
  const fileTree = document.getElementById('file-tree');
  fileTree.innerHTML = '';
  globalTreeData.forEach(item => {
    fileTree.appendChild(createTreeItem(item));
  });
}

// 添加过滤规则按钮的点击事件处理
document.getElementById('filter-button').addEventListener('click', () => {
  if (!filterRulesDialog) {
    filterRulesDialog = createFilterRulesDialog();
    document.body.appendChild(filterRulesDialog);
  }
});

// 添加以下函数来创建和显示过滤规则对话框
function createFilterRulesDialog() {
  const dialog = document.createElement('div');
  dialog.className = 'filter-rules-dialog';
  
  const content = document.createElement('div');
  content.className = 'filter-rules-content';
  
  // 添加说明文字
  const description = document.createElement('div');
  description.className = 'filter-rules-description';
  description.innerHTML = `
    <h3>过滤规则说明</h3>
    <p>每行输入一个规则，支持正则表达式。规则匹配文件名或文件夹名时，将自动取消选中。</p>
    
    <h4>基础规则示例：</h4>
    <pre>
# 1. 精确匹配后缀名（注意转义点号）
\.jpg$     # 匹配所有 .jpg 文件
\.png$     # 匹配所有 .png 文件
\.exe$     # 匹配所有 .exe 文件

# 2. 匹配文件夹名称
node_modules/   # 匹配 node_modules 文件夹
dist/          # 匹配 dist 文件夹
build/         # 匹配 build 文件夹

# 3. 匹配文件名包含特定字符
test           # 匹配名称中包含 test 的文件或文件夹
backup         # 匹配名称中包含 backup 的文件或文件夹

# 4. 匹配特定前缀或后缀
^temp          # 匹配以 temp 开头的文件或文件夹
old_           # 匹配以 old_ 开头的文件或文件夹
_backup$       # 匹配以 _backup 结尾的文件或文件夹</pre>

    <h4>高级规则示例：</h4>
    <pre>
# 1. 使用或运算符 |
\.(jpg|png|gif)$   # 匹配所有 .jpg、.png 或 .gif 文件

# 2. 使用通配符
.*\.temp$          # 匹配任何以 .temp 结尾的文件
test.*\.js$        # 匹配以 test 开头的所有 .js 文件

# 3. 匹配包含数字的文件
.*[0-9].*\.txt$    # 匹配文件名中包含数字的 .txt 文件
v[0-9]+\./        # 匹配类似 v1.、v2. 等版本号文件</pre>

    <h4>注意事项：</h4>
    <pre>
1. 每行一个规则
2. 以 # 开头的行为注释，会被忽略
3. 特殊字符需要转义，如 . 要写成 \.
4. $ 表示匹配结尾，/ 表示匹配文件夹
5. 规则区分大小写
6. 被过滤的文件可以手动勾选显示</pre>

    <h4>默认过滤规则：</h4>
    <pre>
# 自动生成的文件
\.class$    # Java编译生成的文件
\.o$        # C/C++编译生成的目标文件
\.exe$      # 可执行文件
dist/       # 前端打包目录
build/      # 编译输出目录

# 缓存文件
\.DS_Store$ # macOS系统文件
\.cache/    # 缓存目录

# 日志文件
\.log$      # 日志文件

# 备份文件
~$          # 临时备份
\.bak$      # 备份文件

# 开发工具文件
\.idea/     # JetBrains IDE
\.vscode/   # VS Code</pre>
  `;
  
  // 创建文本区域
  const textarea = document.createElement('textarea');
  textarea.className = 'filter-rules-textarea';
  textarea.value = customFilterRules.map(rule => rule.source).join('\n');
  
  // 创建按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'filter-rules-buttons';
  
  // 创建应用按钮
  const applyButton = document.createElement('button');
  applyButton.textContent = '应用';
  applyButton.onclick = () => {
    try {
      // 解析文本区域中的规则
      const rules = textarea.value.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(rule => new RegExp(rule));
      
      customFilterRules = rules;
      
      // 应用过滤规则到所有项目
      applyFilterRules();
      
      dialog.remove();
      filterRulesDialog = null;
      
      // 更新输出显示
      updateOutput();
      
      // 显示成功提示
      showNotification('过滤规则已更新并应用');
    } catch (error) {
      alert('规则格式错误: ' + error.message);
    }
  };
  
  // 创建取消按钮
  const cancelButton = document.createElement('button');
  cancelButton.textContent = '取消';
  cancelButton.onclick = () => {
    dialog.remove();
    filterRulesDialog = null;
  };
  
  // 组装对话框
  buttonContainer.appendChild(applyButton);
  buttonContainer.appendChild(cancelButton);
  content.appendChild(description);
  content.appendChild(textarea);
  content.appendChild(buttonContainer);
  dialog.appendChild(content);
  
  return dialog;
}

// 添加显示通知的函数
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}