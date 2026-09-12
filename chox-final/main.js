const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow = null
let freeTubeProcess = null

function getPnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#111111',
    title: 'Chox',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startFreeTube() {
  if (freeTubeProcess && !freeTubeProcess.killed) {
    return
  }

  const pnpm = getPnpmCommand()
  const freeTubeDir = path.join(__dirname, 'freetube')

  freeTubeProcess = spawn(pnpm, ['dev'], {
    cwd: freeTubeDir,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    },
    stdio: 'inherit',
    shell: false
  })

  freeTubeProcess.on('exit', () => {
    freeTubeProcess = null
  })

  freeTubeProcess.on('error', (error) => {
    console.error('Could not start FreeTube:', error)
    freeTubeProcess = null
  })
}

ipcMain.handle('open-chox-video', async (_event, videoUrl = '') => {
  startFreeTube()

  // FreeTube's development build is responsible for opening its own Electron window.
  // The optional URL is returned so the Chox UI can show the requested target.
  return {
    started: true,
    videoUrl: typeof videoUrl === 'string' ? videoUrl : ''
  }
})

ipcMain.handle('open-external', async (_event, url) => {
  if (typeof url !== 'string') return false

  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      await shell.openExternal(url)
      return true
    }
  } catch (_) {
    // Ignore invalid URLs.
  }

  return false
})

app.whenReady().then(() => {
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('before-quit', () => {
  if (freeTubeProcess && !freeTubeProcess.killed) {
    freeTubeProcess.kill()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
