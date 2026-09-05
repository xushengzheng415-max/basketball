'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sxfDesktop', Object.freeze({
  isDesktop: true,
  openPlatform(platform, portalUrl) {
    return ipcRenderer.invoke('platform:open', { platform, portalUrl });
  },
  focusPlatform(platform) {
    return ipcRenderer.invoke('platform:focus', { platform });
  },
  reloadPlatform() {
    return ipcRenderer.invoke('platform:reload');
  },
  openPlatformExternal(platform) {
    return ipcRenderer.invoke('platform:external', { platform });
  },
  chooseSourceFolder() {
    return ipcRenderer.invoke('file:choose-source-folder');
  },
  chooseImages() {
    return ipcRenderer.invoke('file:choose-images');
  },
  openDocx(path) {
    return ipcRenderer.invoke('file:open-docx', { path });
  },
  openOperationFolder(path) {
    return ipcRenderer.invoke('file:open-operation-folder', { path });
  },
  onPlatformStatus(callback) {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('platform:status', handler);
    return () => ipcRenderer.removeListener('platform:status', handler);
  },
  onPlatformBound(callback) {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('platform:bound', handler);
    return () => ipcRenderer.removeListener('platform:bound', handler);
  },
  onPlatformSession(callback) {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('platform:session', handler);
    return () => ipcRenderer.removeListener('platform:session', handler);
  }
}));
