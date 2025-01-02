const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
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
  '.txt': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.log': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.md': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.csv': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.json': async (filePath) => {
    const content = await fs.readFile(filePath, 'utf8');
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  },
  '.xml': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.yaml': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.yml': async (filePath) => fs.readFile(filePath, 'utf8'),

  // 代码文件
  '.js': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.py': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.java': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.cpp': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.c': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.h': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.hpp': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.cs': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.php': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.rb': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.go': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.rs': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.swift': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.kt': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.ts': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.coffee': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.sh': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.bat': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.ps1': async (filePath) => fs.readFile(filePath, 'utf8'),

  // 网页相关文件
  '.html': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.htm': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.css': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.scss': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.less': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.jsx': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.tsx': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.vue': async (filePath) => fs.readFile(filePath, 'utf8'),

  // 配置文件
  '.ini': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.conf': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.config': async (filePath) => fs.readFile(filePath, 'utf8'),
  '.env': async (filePath) => fs.readFile(filePath, 'utf8'),

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
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }
};

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
      return await fs.readFile(filePath, 'utf8');
    } catch {
      return null;
    }
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
    return null;
  }
}

async function traverseItem(itemPath, indent = '') {
  let output = '';
  let treeData = [];
  
  try {
    const stats = await fs.stat(itemPath);
    const itemName = path.basename(itemPath);
    
    if (stats.isDirectory()) {
      const items = await fs.readdir(itemPath);
      const itemStats = await Promise.all(
        items.map(async item => ({
          name: item,
          stats: await fs.stat(path.join(itemPath, item))
        }))
      );
      
      const folders = items.filter((item, index) => itemStats[index].stats.isDirectory());
      const files = items.filter((item, index) => itemStats[index].stats.isFile());
      
      output += `${indent}├───${itemName}/\n`;
      const newIndent = indent + '│   ';
      
      const folderData = {
        type: 'folder',
        name: itemName,
        path: itemPath,
        children: []
      };
      
      // 处理子文件夹
      for (const folder of folders) {
        const [subOutput, subTreeData] = await traverseItem(path.join(itemPath, folder), newIndent);
        output += subOutput;
        folderData.children.push(...subTreeData);
      }
      
      // 处理文件
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(itemPath, file);
        
        BrowserWindow.getAllWindows()[0].webContents.send('processing-file', {
          currentFile: file,
          currentPath: filePath
        });
        
        const content = await parseFile(filePath);
        output += `${newIndent}${i === files.length - 1 ? '└───' : '├───'}${file}\n`;
        
        const fileData = {
          type: 'file',
          name: file,
          path: filePath,
          content: content
        };
        
        if (content !== null) {
          const contentIndent = newIndent + (i === files.length - 1 ? '    ' : '│   ');
          content.split('\n').forEach(line => {
            output += `${contentIndent}${line}\n`;
          });
        }
        
        folderData.children.push(fileData);
      }
      
      treeData.push(folderData);
    } else {
      output += `${indent}├───${itemName}\n`;
      const content = await parseFile(itemPath);
      
      const fileData = {
        type: 'file',
        name: itemName,
        path: itemPath,
        content: content
      };
      
      if (content !== null) {
        content.split('\n').forEach(line => {
          output += `${indent}│       ${line}\n`;
        });
      }
      
      treeData.push(fileData);
    }
  } catch (error) {
    output += `${indent}├───Error processing ${path.basename(itemPath)}: ${error.message}\n`;
    treeData.push({
      type: 'error',
      name: path.basename(itemPath),
      error: error.message
    });
  }
  
  return [output, treeData];
}

function createWindow () {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    }
  });

  win.loadFile('index.html');
  
  // 设置 IPC 处理器
  ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'openDirectory', 'multiSelections']
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('process-items', async (event, paths) => {
    let output = '';
    let treeData = [];
    for (const itemPath of paths) {
      if (fsSync.existsSync(itemPath)) {
        const [itemOutput, itemTreeData] = await traverseItem(itemPath);
        output += itemOutput;
        treeData.push(...itemTreeData);
      } else {
        output += `Error: Path does not exist: ${itemPath}\n`;
      }
    }
    win.webContents.send('processing-complete');
    return { output, treeData };
  });
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