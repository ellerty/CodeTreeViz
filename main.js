// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const pdf = require('pdf-parse');

// 定义二进制和媒体文件扩展名
const binaryExtensions = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico',
  '.mp3', '.wav', '.mp4', '.avi', '.mov', '.flv',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.pyc', '.class', '.o', '.obj'
]);

// 定义文件处理器
const fileHandlers = {
  // 文本类文件
  '.txt': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.log': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.md': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.csv': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.json': async (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  },
  '.xml': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.yaml': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.yml': async (filePath) => fs.readFileSync(filePath, 'utf8'),

  // 代码文件
  '.js': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.py': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.java': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.cpp': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.c': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.h': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.hpp': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.cs': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.php': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.rb': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.go': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.rs': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.swift': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.kt': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.ts': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.coffee': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.sh': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.bat': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.ps1': async (filePath) => fs.readFileSync(filePath, 'utf8'),

  // 网页相关文件
  '.html': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.htm': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.css': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.scss': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.less': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.jsx': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.tsx': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.vue': async (filePath) => fs.readFileSync(filePath, 'utf8'),

  // 配置文件
  '.ini': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.conf': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.config': async (filePath) => fs.readFileSync(filePath, 'utf8'),
  '.env': async (filePath) => fs.readFileSync(filePath, 'utf8'),

  // Office文档
  '.doc': async (filePath) => {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  },
  '.docx': async (filePath) => {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  },
  '.xls': async (filePath) => {
    const workbook = xlsx.readFile(filePath);
    let content = '';
    workbook.SheetNames.forEach(sheetName => {
      content += `\n=== Sheet: ${sheetName} ===\n`;
      const sheet = workbook.Sheets[sheetName];
      content += xlsx.utils.sheet_to_txt(sheet);
    });
    return content;
  },
  '.xlsx': async (filePath) => {
    const workbook = xlsx.readFile(filePath);
    let content = '';
    workbook.SheetNames.forEach(sheetName => {
      content += `\n=== Sheet: ${sheetName} ===\n`;
      const sheet = workbook.Sheets[sheetName];
      content += xlsx.utils.sheet_to_txt(sheet);
    });
    return content;
  },
  '.pdf': async (filePath) => {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }
};

function createWindow () {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

async function parseFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  
  // 检查是否为二进制或媒体文件
  if (binaryExtensions.has(extension)) {
    return null;
  }
  
  try {
    const handler = fileHandlers[extension];
    if (handler) {
      return await handler(filePath);
    }
    // 对于未知类型的文件，尝试以文本方式读取
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function traverseItem(itemPath, indent = '') {
  let output = '';
  
  try {
    const stats = fs.statSync(itemPath);
    const itemName = path.basename(itemPath);
    
    if (stats.isDirectory()) {
      const items = fs.readdirSync(itemPath);
      
      // 分离文件和文件夹
      const folders = items.filter(item => fs.statSync(path.join(itemPath, item)).isDirectory());
      const files = items.filter(item => fs.statSync(path.join(itemPath, item)).isFile());
      
      // 显示文件夹名
      output += `${indent}├───${itemName}/\n`;
      const newIndent = indent + '│   ';
      
      // 处理子文件夹
      for (const folder of folders) {
        output += await traverseItem(path.join(itemPath, folder), newIndent);
      }
      
      // 处理文件
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(itemPath, file);
        
        // 发送处理进度
        BrowserWindow.getAllWindows()[0].webContents.send('processing-file', {
          currentFile: file,
          currentPath: filePath
        });
        
        // 读取文件内容
        const content = await parseFile(filePath);
        output += `${newIndent}${i === files.length - 1 ? '└───' : '├───'}${file}\n`;
        
        if (content !== null) {
          const contentIndent = newIndent + (i === files.length - 1 ? '    ' : '│   ');
          content.split('\n').forEach(line => {
            output += `${contentIndent}${line}\n`;
          });
        }
      }
    } else {
      // 处理单个文件
      output += `${indent}├───${itemName}\n`;
      const content = await parseFile(itemPath);
      if (content !== null) {
        content.split('\n').forEach(line => {
          output += `${indent}│       ${line}\n`;
        });
      }
    }
  } catch (error) {
    output += `${indent}├───Error processing ${path.basename(itemPath)}: ${error.message}\n`;
  }
  
  return output;
}

// IPC 处理器
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory', 'multiSelections']
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('process-items', async (event, paths) => {
  let output = '';
  for (const itemPath of paths) {
    if (fs.existsSync(itemPath)) {
      output += await traverseItem(itemPath);
    } else {
      output += `Error: Path does not exist: ${itemPath}\n`;
    }
  }
  BrowserWindow.getAllWindows()[0].webContents.send('processing-complete');
  return output;
});

