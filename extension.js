const vscode = require("vscode");
const WebSocket = require("ws");
const QRCode = require("qrcode");
const os = require("os");

let wss;
let statusBarItem;
let isServerRunning = false;
let commandMap = {}; // Stores command ID to full object

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
        try {
          const parsed = JSON.parse(message.toString());
          console.log("Received message:", parsed);

          if (parsed.type === "commandList" && parsed.data) {
            // Sync commands from the Android app
            parsed.data.forEach((cmd) => {
              commandMap[cmd.id] = cmd;
            });
            console.log("Commands synced:", Object.keys(commandMap));
          } else if (parsed.type === "executeCommand" && parsed.id) {
            // Execute a command by ID
            console.log(`Attempting to execute command with ID: ${parsed.id}`);
            handleCommand(parsed.id);
          } else {
            console.log("Unknown message type:", parsed.type);
          }
        } catch (e) {
          console.error("Failed to process message:", e.message);
        }
      });

      ws.on("close", () => {
        console.log("Remote disconnected");
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

function handleCommand(id) {
  const cmd = commandMap[id];
  if (!cmd) {
    console.warn("Command not found in commandMap:", id);
    vscode.window.showWarningMessage(`Command not found: ${id}`);
    return;
  }

  const editor = vscode.window.activeTextEditor;
  const terminal = vscode.window.activeTerminal;

  console.log(`Executing command: ${id}`, cmd);

  switch (cmd.type) {
    case "snippet":
      if (editor) {
        editor.insertSnippet(new vscode.SnippetString(cmd.snippet));
        console.log(`Snippet inserted: ${cmd.snippet}`);
      } else {
        vscode.window.showWarningMessage("No active editor to insert snippet.");
      }
      break;
    case "terminal":
      if (cmd.vscodeCommand === "closeTerminal" && terminal) {
        terminal.dispose();
        console.log("Terminal closed.");
      } else {
        vscode.window.showWarningMessage("No active terminal to close.");
      }
      break;
    case "command":
    default:
      vscode.commands.executeCommand(cmd.vscodeCommand).then(
        () => console.log(`Executed command: ${cmd.vscodeCommand}`),
        (err) => {
          console.error(`Failed to execute command ${cmd.vscodeCommand}:`, err);
          vscode.window.showErrorMessage(
            `Failed to execute command: ${cmd.vscodeCommand}`
          );
        }
      );
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
