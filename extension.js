const vscode = require("vscode");
const WebSocket = require("ws");

let wss;
let statusBarItem;
let isServerRunning = false; // Track the server state

function activate(context) {
  // Create the status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );

  // Set initial status bar text
  updateStatusBar(); // Set the initial state of the status bar
  statusBarItem.tooltip = "Click to toggle WebSocket server";
  statusBarItem.command = "vscxr.toggleServer"; // Custom command for toggling
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);

  // Register the toggleServer command
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

  // Start the WebSocket server
  wss = new WebSocket.Server({ port });

  wss.on("connection", (ws) => {
    console.log("Remote connected");

    ws.on("message", (message) => {
      const command = message.toString();
      handleCommand(command);
    });
  });

  // Update the status bar when the server is started
  isServerRunning = true;
  updateStatusBar(); // Update the status bar when the server starts

  console.log(`WebSocket server running on ws://localhost:8080`);
}

function stopServer() {
  if (wss) {
    wss.close();
    wss = null;
    console.log("WebSocket server stopped.");
  }

  // Update the status bar when the server is stopped
  isServerRunning = false;
  updateStatusBar(); // Update the status bar when the server stops
}

function updateStatusBar() {
  // Change icon based on server state
  if (isServerRunning) {
    statusBarItem.text = "$(circle-filled) vscxr"; // Green circle when server is on
    statusBarItem.color = "green"; // Optional: You can color the icon text
  } else {
    statusBarItem.text = "$(circle-slash) vscxr"; // Red circle when server is off
    statusBarItem.color = "red"; // Optional: You can color the icon text
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
  stopServer(); // Ensure the server stops when deactivated
  if (statusBarItem) statusBarItem.dispose();
}

module.exports = { activate, deactivate };
