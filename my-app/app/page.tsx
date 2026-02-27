'use client';

import { useState, useEffect } from 'react';

// 文件类型定义（增加 fileUrl 字段）
interface StoredFile {
  id: string;
  name: string;
  size: number; // KB
  type: 'pdf' | 'txt';
  extracted: string;
  summary: string;
  fileUrl?: string; // 上传后返回的公开 URL
  filePath?: string;
}

export default function Home() {
  // ---------- 状态 ----------
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'extracted' | 'summary'>('extracted');
  const [darkMode, setDarkMode] = useState(false);
  const [uploading, setUploading] = useState(false); // 上传加载状态
  const pageSize = 5;

  // ---------- 夜间模式初始化与切换 ----------
  useEffect(() => {
    const isDark = localStorage.getItem('dark-mode') === 'true' ||
      (!localStorage.getItem('dark-mode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const toggleDarkMode = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    localStorage.setItem('dark-mode', String(newDark));
    if (newDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  // ---------- 分页逻辑 ----------
  const totalPages = Math.ceil(files.length / pageSize) || 1;
  const paginatedFiles = files.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ---------- 文件操作 ----------
  const handleDelete = (id: string) => {
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    if (currentFileId === id) {
      setCurrentFileId(newFiles.length > 0 ? newFiles[0].id : null);
    }
    if (paginatedFiles.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSelectFile = (id: string) => {
    setCurrentFileId(id);
    setActiveTab('extracted');
  };

  // app/page.tsx 中的 handleFileUpload 函数（需替换原有实现）
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/process', { method: 'POST', body: formData });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`处理失败: ${errorText.substring(0, 200)}`);
    }
    const result = await res.json();
    if (!result.ok) throw new Error(result.message);

    const newFile: StoredFile = {
      id: `f${Date.now()}`,
      name: file.name,
      size: Math.round(file.size / 1024) || 1,
      type: 'pdf',
      extracted: result.extractedText,
      summary: result.summary,
      fileUrl: result.fileUrl,
      filePath: result.filePath,
    };

    setFiles(prev => [...prev, newFile]);
    const newTotalPages = Math.ceil((files.length + 1) / pageSize);
    setCurrentPage(newTotalPages);
    setCurrentFileId(newFile.id);
    setActiveTab('extracted');
  } catch (err: any) {
    alert(`上传失败：${err.message}`);
  } finally {
    setUploading(false);
    e.target.value = '';
  }
};

  // 当前选中的文件
  const currentFile = files.find(f => f.id === currentFileId) || null;

  // ---------- 渲染右侧内容 ----------
  const renderRightContent = () => {
    if (!currentFile) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <svg className="w-20 h-20 text-gray-300 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
            请上传 PDF 文件以查看内容并生成摘要
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-2">
            支持 .pdf 格式，上传后自动提取文本并生成 AI 摘要
          </p>
        </div>
      );
    }

    return (
      <>
        {/* 新增：右侧上方文件名展示区域 */}
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            文件: <span className="font-normal">{currentFile.name}</span>
          </p>
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-4">
          <button
            onClick={() => setActiveTab('extracted')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === 'extracted'
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            提取的文本
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === 'summary'
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            AI 摘要
          </button>
        </div>

        <div className="prose dark:prose-invert max-w-none overflow-auto max-h-[calc(100vh-280px)]">
          {activeTab === 'extracted' ? (
            <pre className="whitespace-pre-wrap font-mono text-sm bg-white dark:bg-gray-950 p-4 rounded border">
              {currentFile.extracted}
            </pre>
          ) : (
            <div className="whitespace-pre-wrap">
              {currentFile.summary}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* 左侧面板 */}
      <aside className="w-full lg:w-80 xl:w-96 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full overflow-hidden">
        <div className="p-5 flex-1 overflow-y-auto">
          {/* 标题 + 夜间切换 */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              AI Summary App
            </h1>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
              aria-label="切换夜间模式"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>

          {/* 文件上传 */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">上传 PDF 文档</p>
            <div className="flex items-center gap-2">
              <label className={`cursor-pointer bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? '上传中...' : '选择文件'}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {files.length > 0 ? `${files.length} 个文件` : '未选择文件'}
              </span>
            </div>
          </div>

          {/* 已上传文件列表 */}
          <div className="flex flex-col h-[320px]">
            <h2 className="text-md font-semibold mb-2 flex items-center justify-between">
              <span>已上传文件</span>
              <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {files.length}
              </span>
            </h2>

            {files.length === 0 ? (
              <div className="flex-1 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无已上传文件</p>
              </div>
            ) : (
              <>
                <div className="overflow-y-auto flex-1 border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">文件名</th>
                        <th className="text-left p-2 font-medium whitespace-nowrap">大小</th>
                        <th className="text-left p-2 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {paginatedFiles.map(file => (
                        <tr
                          key={file.id}
                          className={`hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer ${
                            currentFileId === file.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => handleSelectFile(file.id)}
                        >
                          <td className="p-2 truncate max-w-[120px]">{file.name}</td>
                          <td className="p-2 whitespace-nowrap">{file.size} KB</td>
                          <td className="p-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(file.id);
                              }}
                              className="text-xs bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 分页控件 */}
                <div className="flex items-center justify-between mt-3 text-sm">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded disabled:opacity-40 disabled:pointer-events-none hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    上一页
                  </button>
                  <span>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded disabled:opacity-40 disabled:pointer-events-none hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    下一页
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* 右侧主区域 */}
      <main className="flex-1 bg-white dark:bg-gray-950 overflow-hidden p-6 flex flex-col">
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-auto">
          {renderRightContent()}
        </div>
      </main>
    </div>
  );
}

// 'use client'

// import { useState } from "react";

// export default function Home() {
//   const [status, setStatus] = useState("Frontend running");

//   async function checkBackend() {
//     setStatus("Checking backend...");
//     const res = await fetch('/api/health');
//     const data = await res.json();
//     setStatus(`Backend says: ${data.message}`);
//   }


//   return (
//     <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 800 }}>
//       <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1d324b' }}>AI Summary App</h1>
//       <button 
//         onClick={checkBackend}
//         className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
//       >
//         Check backend
//       </button>
//       <p style={{ marginTop: 12 }}>{status}</p>
//     </div>
//   );
// }