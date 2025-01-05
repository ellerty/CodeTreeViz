# CodeTreeViz / 代码项目树形可视化

[English](#english) | [中文](#chinese)

## English

### Project Description
A desktop application for visualizing and sharing folder structures and file contents. Perfect for sharing code structures with Large Language Models (LLMs) or team members.

### Features
- **Drag & Drop Support**: Easily drag folders or files into the application
- **Tree View**: Visual representation of folder structure
- **Content Preview**: View file contents directly in the application
- **Selective Display**: Choose which files and folders to include
- **Filter Rules**: Customize rules to automatically filter out unwanted files
- **Copy Support**: One-click copy of the entire structure and contents
- **Multiple File Types Support**: 
  - Text files (.txt, .log, .md)
  - Source code (.js, .py, .java, .cpp, .c, etc.)
  - Web files (.html, .css, .jsx, .tsx)
  - Documents (.doc, .docx, .pdf)
  - Spreadsheets (.xls, .xlsx)
  - Configuration files (.json, .xml, .yaml, .ini)
  - Shell scripts (.sh, .bat, .ps1)

### Installation
1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Start the application:
```bash
npm start
```

### Usage
1. Launch the application
2. Drag folders/files into the window or click "Select Files/Folders"
3. Use the tree view to select which files to include
4. Use "Filter Rules" to set up automatic file filtering
5. Click "Apply Selection" to update the output
6. Click "Copy" to copy the result to clipboard

### Development
Built with:
- Electron: Cross-platform desktop application framework
- Node.js: JavaScript runtime
- File parsing libraries:
  - mammoth: Word document parsing
  - pdf-parse: PDF file parsing
  - xlsx: Excel file parsing

---

## Chinese

### 项目描述
一个用于可视化和分享文件夹结构及文件内容的桌面应用。特别适合向大语言模型（LLM）或团队成员展示代码结构。

### 功能特点
- **拖放支持**：轻松拖入文件夹或文件
- **树状视图**：直观展示文件夹结构
- **内容预览**：直接查看文件内容
- **选择性显示**：自由选择要包含的文件和文件夹
- **过滤规则**：自定义规则自动过滤不需要的文件
- **复制支持**：一键复制整个结构和内容
- **多文件类型支持**：
  - 文本文件（.txt、.log、.md）
  - 源代码（.js、.py、.java、.cpp、.c 等）
  - 网页文件（.html、.css、.jsx、.tsx）
  - 文档文件（.doc、.docx、.pdf）
  - 电子表格（.xls、.xlsx）
  - 配置文件（.json、.xml、.yaml、.ini）
  - 脚本文件（.sh、.bat、.ps1）

### 安装方法
1. 克隆仓库
2. 安装依赖：
```bash
npm install
```
3. 启动应用：
```bash
npm start
```

### 使用方法
1. 启动应用
2. 将文件夹/文件拖入窗口或点击"选择文件或文件夹"
3. 使用树状视图选择要包含的文件
4. 使用"过滤规则"设置自动文件过滤
5. 点击"应用选择"更新输出
6. 点击"一键复制"将结果复制到剪贴板

### 开发技术
使用以下技术构建：
- Electron：跨平台桌面应用框架
- Node.js：JavaScript 运行时
- 文件解析库：
  - mammoth：Word 文档解析
  - pdf-parse：PDF 文件解析
  - xlsx：Excel 文件解析