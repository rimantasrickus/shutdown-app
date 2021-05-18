'use strict'

import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron'
import childProcess from 'child_process'
import path from 'path'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
let tray

const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 400,
    useContentSize: true,
    width: 500
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const iconPath = path.join(__dirname, 'build/icons/icon.ico')
  tray = new Tray(nativeImage.createFromPath(iconPath))
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show()
      }
    },
    {
      label: 'Quit',
      click: () => {
        mainWindow.destroy()
        app.quit()
      }
    }
  ]))

  mainWindow.on('minimize', (event) => {
    event.preventDefault()
    mainWindow.minimize()
  })

  mainWindow.on('close', (event) => {
    event.preventDefault()
    mainWindow.hide()
    return false
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

function executeCommand (command, args) {
  let child = childProcess.spawn(command, args, {
    encoding: 'utf8',
    shell: true
  })

  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (data) => {
    // Here is the output
    data = data.toString()
    console.log(data)
  })

  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (data) => {
    // Return some data to the renderer process with the mainprocess-response ID
    mainWindow.webContents.send('mainprocess-response', data)
    // Here is the output from the command
    console.log(data)
  })
}

// Attach listener in the main process with the given ID
ipcMain.on('request-mainprocess-action', (event, arg) => {
  if (arg.shutdown === 'shutdown') {
    executeCommand('shutdown', ['-s -f'])
  }
  if (arg.shutdown === 'hibernate') {
    executeCommand('shutdown', ['-h -f'])
  }
  if (arg.shutdown === 'cancel') {
    executeCommand('shutdown', ['-a'])
  }
})

const isMac = process.platform === 'darwin'
const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
