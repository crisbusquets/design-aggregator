// Function to inject debug script first
async function injectDebugScript(tabId) {
	try {
	  await chrome.scripting.executeScript({
		target: { tabId },
		func: () => {
		  console.log('🔍 DEBUG: Page URL:', window.location.href);
		  console.log('🔍 DEBUG: Posts found:', document.querySelectorAll('article.post').length);
		  console.log('🔍 DEBUG: Dates found:', document.querySelectorAll('.p2020-compact-post__entry-date').length);
		}
	  });
	  console.log('✅ Debug script injected into tab:', tabId);
	} catch (error) {
	  console.error('❌ Failed to inject debug script:', error);
	}
  }
  
  // Function to inject the main content script
  async function injectContentScript(tabId) {
	try {
	  await chrome.scripting.executeScript({
		target: { tabId },
		files: ['content.js']
	  });
	  console.log('✅ Content script injected into tab:', tabId);
	  
	  // Inject debug script after content script
	  await injectDebugScript(tabId);
	} catch (error) {
	  console.error('❌ Failed to inject content script:', error);
	}
  }
  
  // Handle installation
  chrome.runtime.onInstalled.addListener(async () => {
	console.log('🎉 Extension installed');
	const tabs = await chrome.tabs.query({});
	
	for (const tab of tabs) {
	  if (!tab.url?.startsWith('chrome')) {
		console.log('📄 Processing tab:', tab.url);
		await injectContentScript(tab.id);
	  }
	}
  });
  
  // Handle tab updates
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status === 'complete' && !tab.url?.startsWith('chrome')) {
	  console.log('🔄 Tab updated:', tab.url);
	  await injectContentScript(tabId);
	}
  });
  
  // Handle messages from popup
  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	if (request.action === 'reinjectContent') {
	  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	  if (tab && !tab.url?.startsWith('chrome')) {
		await injectContentScript(tab.id);
		sendResponse({ status: 'success' });
	  }
	}
	return true;
  });
