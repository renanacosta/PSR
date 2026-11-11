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

    const nativePoint = { x: event.x, y: event.y }
    const point = process.platform === 'win32' || process.platform === 'linux'
        ? screen.screenToDipPoint(nativePoint)
        : screen.getCursorScreenPoint()
    const bounds = mainWindow.getBounds()
    if (point.x >= bounds.x && point.x < bounds.x + bounds.width && point.y >= bounds.y && point.y < bounds.y + bounds.height) return

    try {
        const display = screen.getDisplayNearestPoint(point)
        const physicalBounds = process.platform === 'win32'
            ? screen.dipToScreenRect(null, display.bounds)
            : display.bounds
        const clickPoint = process.platform === 'win32' ? nativePoint : point
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1600, height: 1000 },
        })
        const source = sources.find((item) => item.display_id === String(display.id))
        if (!source) throw new Error(`Não foi possível localizar a captura do monitor ${display.id}.`)
        if (source.thumbnail.isEmpty()) return
        const imageSize = source.thumbnail.getSize()

        const step = {
            id: `${Date.now()}-${nextStepNumber}`,
            number: nextStepNumber++,
            capturedAt: new Date().toISOString(),
            image: source.thumbnail.toDataURL(),
            imageSize: { width: imageSize.width, height: imageSize.height },
            display: {
                x: display.bounds.x,
                y: display.bounds.y,
                width: display.bounds.width,
                height: display.bounds.height,
            },
            click: {
                x: Math.max(0, Math.min(1, (clickPoint.x - physicalBounds.x) / physicalBounds.width)),
                y: Math.max(0, Math.min(1, (clickPoint.y - physicalBounds.y) / physicalBounds.height)),
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