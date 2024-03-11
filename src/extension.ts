import * as vscode from 'vscode';
import { exec } from 'child_process';

function activate(context: vscode.ExtensionContext) {
    console.log('Script Manager activated.');

    let panel: vscode.WebviewPanel | undefined;

    let scripts: string[] = [];

    const getWebViewContent = () => {
        return `
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="https://cdn.jsdelivr.net/npm/mini.css/dist/mini-default.min.css" rel="stylesheet">
                <style>
                    .container {
                        padding: 20px;
                    }
                    .button {
                        margin-right: 10px;
                    }
                    .script-item {
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Script Manager</h2>
                    <button class="button primary" id="addScript">Add Script</button>
                    <div id="scriptList"></div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();

                    const addScriptButton = document.getElementById('addScript');
                    const scriptList = document.getElementById('scriptList');

                    addScriptButton.addEventListener('click', () => {
                        vscode.postMessage({ command: 'addScript' });
                    });

                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        if (message.command === 'updateScripts') {
                            scriptList.innerHTML = '';
                            message.scripts.forEach(script => {
                                const launchButton = document.createElement('button');
                                launchButton.innerText = 'Launch';
                                launchButton.className = 'button primary';
                                launchButton.addEventListener('click', () => {
                                    vscode.postMessage({ command: 'launchScript', scriptPath: script });
                                });

                                const scriptItem = document.createElement('div');
                                scriptItem.className = 'script-item';
                                scriptItem.appendChild(document.createTextNode(script));
                                scriptItem.appendChild(launchButton);
                                scriptList.appendChild(scriptItem);
                            });
                        }
                    });
                </script>
            </body>
            </html>
        `;
    };

    vscode.commands.registerCommand('radou.helloWorld', function () {
        if (!panel) {
            panel = vscode.window.createWebviewPanel(
                'scriptManager',
                'Script Manager',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );

            panel.webview.html = getWebViewContent();

            panel.webview.onDidReceiveMessage(
                (message) => {
                    switch (message.command) {
                        case 'addScript':
                            vscode.window.showInputBox({ prompt: 'Enter script path:' }).then((scriptPath: string | undefined) => {
                                if (scriptPath) {
                                    scripts.push(scriptPath);
                                    panel!.webview.postMessage({ command: 'updateScripts', scripts });
                                }
                            });
                            return;

                        case 'launchScript':
                            const scriptPath: string = message.scriptPath!;
                            const terminal = vscode.window.createTerminal('Script Terminal');
                            terminal.show();
                            terminal.sendText(`bash ${scriptPath}`);
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );

            panel.onDidDispose(() => {
                panel = undefined;
            }, null, context.subscriptions);
        } else {
            panel.reveal();
        }
    });
}

module.exports = {
    activate
};
