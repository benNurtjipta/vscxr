const vscode = require("vscode");
const WebSocket = require("ws");

let wss;
let statusBarItem;

function activate(context) {
  const port = 8080;
  wss = new WebSocket.Server({ port });

  wss.on("connection", (ws) => {
    console.log("Remote connected");

    ws.on("message", (message) => {
      const command = message.toString();
      handleCommand(command);
    });
  });

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.text = "$(plug) vscxr";
  statusBarItem.tooltip = `WebSocket server running on ws://localhost:${port}`;
  statusBarItem.command = undefined;
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);

  console.log(`WebSocket server running on ws://localhost:${port}`);
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
  if (wss) wss.close();
  if (statusBarItem) statusBarItem.dispose();
}

module.exports = { activate, deactivate };
