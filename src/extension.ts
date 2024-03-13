import * as vscode from 'vscode';
import { exec, ChildProcess } from 'child_process';

function activate(context: vscode.ExtensionContext) {
    console.log('Script Manager activated.');

    let panel: vscode.WebviewPanel | undefined;

    let scripts: { path: string; process?: ChildProcess }[] = [];

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
                    .status-icon {
                        margin-left: 10px;
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
                                    vscode.postMessage({ command: 'launchScript', scriptPath: script.path });
                                });

                                const killButton = document.createElement('button');
                                killButton.innerText = 'Kill';
                                killButton.className = 'button';
                                killButton.addEventListener('click', () => {
                                    vscode.postMessage({ command: 'killScript', scriptPath: script.path });
                                });

                                const statusIcon = document.createElement('span');
                                statusIcon.className = 'status-icon';
                                
                                const scriptItem = document.createElement('div');
                                scriptItem.className = 'script-item';
                                scriptItem.appendChild(document.createTextNode(script.path));
                                scriptItem.appendChild(launchButton);
                                scriptItem.appendChild(killButton);
                                scriptItem.appendChild(statusIcon);
                                scriptList.appendChild(scriptItem);
                            });
                        }
                    });
                </script>
            </body>
            </html>
        `;
    };

    const updateStatusIcon = (scriptPath: string, succeeded: boolean) => {
        const scriptItem = document.querySelector(`.script-item:contains('${scriptPath}')`);
        if (scriptItem) {
            const statusIcon = scriptItem.querySelector('.status-icon');
            if (statusIcon) {
                statusIcon.textContent = succeeded ? '✅' : '❌';
            }
        }
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
                async (message) => {
                    switch (message.command) {
                        case 'addScript':
                            const scriptPath = await vscode.window.showInputBox({ prompt: 'Enter script path:' });
                            if (scriptPath) {
                                scripts.push({ path: scriptPath });
                                panel!.webview.postMessage({ command: 'updateScripts', scripts });
                            }
                            return;

                        case 'launchScript':
                            const script = scripts.find(s => s.path === message.scriptPath);
                            if (script) {
                                script.process = exec(`bash ${script.path}`, (error, stdout, stderr) => {
                                    if (!error) {
                                        updateStatusIcon(script.path, true);
                                    }
                                });
                            }
                            return;

                        case 'killScript':
                            const scriptToKill = scripts.find(s => s.path === message.scriptPath);
                            if (scriptToKill && scriptToKill.process) {
                                scriptToKill.process.kill();
                                updateStatusIcon(scriptToKill.path, false);
                            }
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
