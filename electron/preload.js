const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
  showInFolder: (path) => ipcRenderer.invoke('shell:showItemInFolder', path),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  fileExists: (path) => ipcRenderer.invoke('fs:exists', path),
  createDirectory: (path) => ipcRenderer.invoke('fs:createDir', path),
  // Resolve a path (possibly relative) → { resolved, exists, pfUrl }
  resolvePath: (inputPath) => ipcRenderer.invoke('fs:resolvePath', inputPath),
  // Copy file → { success, destPath, pfUrl }
  copyFile: (sourcePath, destPath) => ipcRenderer.invoke('fs:copyFile', sourcePath, destPath),
  getMediaDir: () => ipcRenderer.invoke('app:getMediaDir'),
  // Write file bytes directly to userData/media/ (works when file.path is broken)
  writeBuffer: (base64Data, destFileName) => ipcRenderer.invoke('fs:writeBuffer', base64Data, destFileName),
  // ffmpeg
  generateThumbnail: (videoPath, outputPath) => ipcRenderer.invoke('media:generateThumbnail', videoPath, outputPath),
  transcodeProxy: (videoPath, proxyPath) => ipcRenderer.invoke('media:transcodeProxy', videoPath, proxyPath),
  checkFfmpeg: () => ipcRenderer.invoke('media:checkFfmpeg'),
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
})
