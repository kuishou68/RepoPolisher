console.log("Testing electron module...");
const electron = require("electron");
console.log("electron type:", typeof electron);
console.log("electron.app:", electron.app);
console.log("electron.ipcMain:", electron.ipcMain);
if (typeof electron === 'string') {
  console.log("ERROR: electron is a string (path), not a module object!");
  process.exit(1);
}
