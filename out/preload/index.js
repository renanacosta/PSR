"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("psr", {
  startRecording: () => electron.ipcRenderer.invoke("recording:start"),
  pauseRecording: () => electron.ipcRenderer.invoke("recording:pause"),
  resumeRecording: () => electron.ipcRenderer.invoke("recording:resume"),
  stopRecording: () => electron.ipcRenderer.invoke("recording:stop"),
  onStep: (callback) => {
    const listener = (_event, step) => callback(step);
    electron.ipcRenderer.on("step:captured", listener);
    return () => electron.ipcRenderer.removeListener("step:captured", listener);
  },
  onStatus: (callback) => {
    const listener = (_event, active) => callback(active);
    electron.ipcRenderer.on("recording:status", listener);
    return () => electron.ipcRenderer.removeListener("recording:status", listener);
  },
  onError: (callback) => {
    const listener = (_event, message) => callback(message);
    electron.ipcRenderer.on("recording:error", listener);
    return () => electron.ipcRenderer.removeListener("recording:error", listener);
  }
});
