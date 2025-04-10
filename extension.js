const vscode = require("vscode");
const WebSocket = require("ws");

let wss;
let statusBarItem;
let isServerRunning = false; 

function activate(context) {
 
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );

 
  updateStatusBar(); 
  statusBarItem.tooltip = "Click to toggle WebSocket server";
  statusBarItem.command = "vscxr.toggleServer";
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);

 
  let disposable = vscode.commands.registerCommand("vscxr.toggleServer", () => {
    if (isServerRunning) {
      stopServer();
    } else {
      startServer();
    }
  });

  context.subscriptions.push(disposable);
}

function startServer() {
  const port = 8080;

  
  wss = new WebSocket.Server({ port });

  wss.on("connection", (ws) => {
    console.log("Remote connected");

    ws.on("message", (message) => {
      const command = message.toString();
      handleCommand(command);
    });
  });

  
  isServerRunning = true;
  updateStatusBar(); /

  console.log(`WebSocket server running on ws://localhost:8080`);
}

function stopServer() {
  if (wss) {
    wss.close();
    wss = null;
    console.log("WebSocket server stopped.");
  }

  
  isServerRunning = false;
  updateStatusBar(); 
}

function updateStatusBar() {

  if (isServerRunning) {
    statusBarItem.text = "$(circle-filled) vscxr"; 
    statusBarItem.color = "green"; 
  } else {
    statusBarItem.text = "$(circle-slash) vscxr"; 
    statusBarItem.color = "red"; 
}

function handleCommand(command) {
  const editor = vscode.window.activeTextEditor;
  const terminal = vscode.window.activeTerminal;

  switch (command) {
    case "openSourceControl":
      vscode.commands.executeCommand("workbench.view.scm");
      break;
    case "closeTerminal":
      if (terminal) terminal.dispose();
      break;
    case "insertBraces":
      editor?.insertSnippet(new vscode.SnippetString("{}"));
      break;
    case "insertPipes":
      editor?.insertSnippet(new vscode.SnippetString("||"));
      break;
    default:
      console.log("Unknown command:", command);
  }
}

function deactivate() {
  stopServer(); 
  if (statusBarItem) statusBarItem.dispose();
}

module.exports = { activate, deactivate };
