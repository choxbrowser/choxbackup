const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('choxDesktop', {
  openChoxVideo(videoUrl = '') {
    return ipcRenderer.invoke('open-chox-video', videoUrl)
  },

  openExternal(url) {
    return ipcRenderer.invoke('open-external', url)
  }
})
