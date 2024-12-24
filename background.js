chrome.runtime.onInstalled.addListener(async () => {
	console.log('Extension installed');
	const manifest = chrome.runtime.getManifest();
	const tabs = await chrome.tabs.query({ url: manifest.content_scripts[0].matches });
	console.log('Found tabs:', tabs);
	
	for (const tab of tabs) {
	  if (!tab.url.startsWith('chrome')) {
		console.log('Injecting script into tab:', tab.id);
		chrome.scripting.executeScript({
		  files: ["content.js"],
		  target: { tabId: tab.id }
		});
	  }
	}
  });
  
  chrome.action.onClicked.addListener(async (tab) => {
	console.log('Extension icon clicked on tab:', tab.id);
	try {
	  const response = await chrome.tabs.sendMessage(tab.id, { action: "aggregate" });
	  console.log('Response from content script:', response);
	} catch (error) {
	  console.error("Error sending message:", error);
	}
  });
