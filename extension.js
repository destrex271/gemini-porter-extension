const vscode = require('vscode');
require('dotenv').config()
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

	var apikey = vscode.workspace.getConfiguration().get('porter.apiKey');
	console.log(apikey)
	console.log("CHECKINNGGGGG")
	if(apikey === undefined || apikey.length == 0){
		console.log("UDDD")
		const key = await vscode.window.showInputBox({
			prompt: "Enter your Gemini API Key",
			placeHolder: "porter.apiKey",
			password: true
		})
		if(key){
			vscode.workspace.getConfiguration().update('porter.apiKey', key, vscode.ConfigurationTarget.Global);
			if(key === undefined || key.length == 0){
				vscode.window.showErrorMessage("API Key not supplied")
				return;
			}
			apikey = key;
			vscode.window.showInformationMessage('API key set successfully.');
		}else{
			vscode.window.showErrorMessage('API Key was not provided!')
			return;
		}
	}
	const genAI = new GoogleGenerativeAI(apikey);
	const model = genAI.getGenerativeModel({model: "gemini-pro"})
	console.log('Congratulations, your extension "porter" is now active!');

	let convert = vscode.commands.registerCommand('porter.convert', async function(){
		// Get Target Language
		let val = await vscode.window.showInputBox({
			placeHolder: "Rust",
			prompt: "Enter your target Language",
		})
		console.log("LANG", val)

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
            title: 'Running Long-Running Operation',
            cancellable: true
        }, async (progress, token) => {
			const editor = vscode.window.activeTextEditor;
			const selection = editor.selection
			var editorContent = ""; 
			if(selection && !selection.isEmpty){
				const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
				editorContent = editor.document.getText(selectionRange) + ""
			}
			if(editorContent.length <= 1){
				vscode.window.showErrorMessage("Not enough content to convert!")
			}
			const detectedLanguage = await model.generateContent(`In a single word tell me which programming language is this code snippet in:\n${editorContent}`)
			const src_lang = await detectedLanguage.response.text();
			// const get_ext = await model.generateContent("in a single word give me the file extension for the programming language "+val)
			// const ext = await get_ext.response.text()

			var prompt = `Convert Code from ${src_lang} to ${val} language, without any explanation or any comments. Do not mention the language name, just give the code. Only provide a single option. The code to be converted is:\n${editorContent}`
			model.generateContent(prompt)
				.then((res)=>{
					code = res.response.text()
					console.log(code)
					const panel = vscode.window.createWebviewPanel(
						'sidePanel', // Identifies the type of the webview. Used internally
						'Code Side Panel', // Title of the panel displayed to the user
						vscode.ViewColumn.Two, // Editor column to show the new webview panel in
						{
							enableScripts: true, // Allow scripts in the webview
						}
					);
					// panel.webview.postMessage({ code });
					panel.webview.html = getWebviewContent(code);
				})
				.catch((err)=>{
					vscode.window.showErrorMessage("Unable to convert :(")
				})
			})

		
	})

	context.subscriptions.push(disposable);
	context.subscriptions.push(convert)
}

// This method is called when your extension is deactivated
function deactivate() {}

function getWebviewContent(code){
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource:; script-src 'nonce-123';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Side Panel</title>
        </head>
        <body>
            <pre><code>${code}</code></pre>
        </body>
        </html>`;
}

module.exports = {
	activate,
	deactivate
}
