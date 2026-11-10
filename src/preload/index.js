import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('psr', {
    startRecording: () => ipcRenderer.invoke('recording:start'),
    pauseRecording: () => ipcRenderer.invoke('recording:pause'),
    resumeRecording: () => ipcRenderer.invoke('recording:resume'),
    stopRecording: () => ipcRenderer.invoke('recording:stop'),
    onStep: (callback) => {
        const listener = (_event, step) => callback(step)
        ipcRenderer.on('step:captured', listener)
        return () => ipcRenderer.removeListener('step:captured', listener)
    },
    onStatus: (callback) => {
        const listener = (_event, active) => callback(active)
        ipcRenderer.on('recording:status', listener)
        return () => ipcRenderer.removeListener('recording:status', listener)
    },
    onError: (callback) => {
        const listener = (_event, message) => callback(message)
        ipcRenderer.on('recording:error', listener)
        return () => ipcRenderer.removeListener('recording:error', listener)
    },
})