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

  const disposable = vscode.commands.registerCommand(
    "vscxr.toggleServer",
    () => {
      if (isServerRunning) {
        stopServer();
      } else {
        startServer();
      }
    }
  );

  context.subscriptions.push(disposable);
}

function startServer() {
  const port = 8080;

  try {
    wss = new WebSocket.Server({ port });

    wss.on("connection", (ws) => {
      console.log("Remote connected");

      ws.on("message", (message) => {
        const command = message.toString();
        console.log("Received command:", command);
        handleCommand(command);
      });
    });

    isServerRunning = true;
    updateStatusBar();
    console.log(`WebSocket server running on ws://localhost:${port}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start server: ${error.message}`);
  }
}

function stopServer() {
  if (wss) {
    wss.close(() => {
      console.log("WebSocket server stopped.");
    });
    wss = null;
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
    case "insertBracesLeft":
      editor?.insertSnippet(new vscode.SnippetString("{"));
      break;
    case "insertBracesRight":
      editor?.insertSnippet(new vscode.SnippetString("}"));
      break;
    case "insertPipes":
      editor?.insertSnippet(new vscode.SnippetString("||"));
      break;
    case "reloadWindow":
      vscode.commands.executeCommand("workbench.action.reloadWindow");
      break;
    case "openCommandPalette":
      vscode.commands.executeCommand("workbench.action.showCommands");
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
