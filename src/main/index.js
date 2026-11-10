import { app, BrowserWindow, desktopCapturer, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import { uIOhook } from 'uiohook-napi'

let mainWindow
let isRecording = false
let nextStepNumber = 1

function sendStatus() {
    mainWindow?.webContents.send('recording:status', isRecording)
}

async function captureClick(event) {
    if (!isRecording || !mainWindow || mainWindow.isDestroyed()) return

    const bounds = mainWindow.getBounds()
    if (event.x >= bounds.x && event.x < bounds.x + bounds.width && event.y >= bounds.y && event.y < bounds.y + bounds.height) return

    try {
        const display = screen.getDisplayNearestPoint({ x: event.x, y: event.y })
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1600, height: 1000 },
        })
        const source = sources.find((item) => item.display_id === String(display.id)) ?? sources[0]
        if (!source || source.thumbnail.isEmpty()) return

        const step = {
            id: `${Date.now()}-${nextStepNumber}`,
            number: nextStepNumber++,
            capturedAt: new Date().toISOString(),
            image: source.thumbnail.toDataURL(),
            display: {
                x: display.bounds.x,
                y: display.bounds.y,
                width: display.bounds.width,
                height: display.bounds.height,
            },
            click: {
                x: Math.max(0, Math.min(1, (event.x - display.bounds.x) / display.bounds.width)),
                y: Math.max(0, Math.min(1, (event.y - display.bounds.y) / display.bounds.height)),
                button: event.button === 2 ? 'direito' : event.button === 3 ? 'meio' : 'esquerdo',
            },
            note: '',
        }

        mainWindow.webContents.send('step:captured', step)
    } catch (error) {
        mainWindow?.webContents.send('recording:error', error.message)
    }
}

function setRecording(value) {
    if (isRecording === value) return
    isRecording = value

    if (isRecording) {
        uIOhook.on('click', captureClick)
        uIOhook.start()
    } else {
        uIOhook.off('click', captureClick)
        uIOhook.stop()
    }

    sendStatus()
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1180,
        height: 780,
        minWidth: 760,
        minHeight: 560,
        backgroundColor: '#f3f4f1',
        title: 'PSR · Gravador de etapas',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    })

    if (process.env.ELECTRON_RENDERER_URL) {
        mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

ipcMain.handle('recording:start', () => {
    nextStepNumber = 1
    setRecording(true)
})
ipcMain.handle('recording:pause', () => setRecording(false))
ipcMain.handle('recording:resume', () => setRecording(true))
ipcMain.handle('recording:stop', () => setRecording(false))

app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('before-quit', () => {
    if (isRecording) setRecording(false)
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})