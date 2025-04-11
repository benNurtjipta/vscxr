const vscode = require("vscode");
const WebSocket = require("ws");
const QRCode = require("qrcode");
const os = require("os");

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

  const toggleCmd = vscode.commands.registerCommand(
    "vscxr.toggleServer",
    () => {
      if (isServerRunning) {
        stopServer();
      } else {
        startServer();
      }
    }
  );

  const qrCmd = vscode.commands.registerCommand("vscxr.showQr", () => {
    showQrCode();
  });

  context.subscriptions.push(toggleCmd, qrCmd);
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

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

function showQrCode() {
  const ip = getLocalIpAddress();
  const wsUrl = `ws://${ip}:8080`;

  QRCode.toDataURL(wsUrl, (err, qrUrl) => {
    if (err) {
      vscode.window.showErrorMessage("Failed to generate QR code.");
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "vscxr.qrcode",
      "Scan to Connect",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = getQrWebviewContent(qrUrl, wsUrl);
  });
}

function getQrWebviewContent(qrDataUrl, wsUrl) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: sans-serif;
          }
          img {
            max-width: 300px;
            margin: 20px 0;
          }
          p {
            font-size: 14px;
            color: #555;
          }
        </style>
      </head>
      <body>
        <h2>Scan this QR code to connect</h2>
        <img src="${qrDataUrl}" />
        <p>${wsUrl}</p>
      </body>
    </html>
  `;
}

function deactivate() {
  stopServer();
  if (statusBarItem) statusBarItem.dispose();
}

module.exports = { activate, deactivate };
