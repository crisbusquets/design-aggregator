console.log('Popup script starting...');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded');
  
  try {
    const { timeframe = 'all' } = await chrome.storage.local.get('timeframe');
    console.log('Loaded timeframe:', timeframe);
    document.getElementById('timeframe').value = timeframe;
  } catch (error) {
    console.error('Error loading timeframe:', error);
  }

  const button = document.getElementById('aggregate');
  const select = document.getElementById('timeframe');

  if (!button || !select) {
    console.error('Could not find required elements:', { button: !!button, select: !!select });
    return;
  }

  console.log('Setting up click handler');
  button.addEventListener('click', async () => {
    console.log('Button clicked');
    const timeframe = select.value;
    console.log('Selected timeframe:', timeframe);
    
    button.disabled = true;
    button.textContent = 'Processing...';
    
    try {
      // Save timeframe
      await chrome.storage.local.set({ timeframe });
      
      // Request content script injection
      await chrome.runtime.sendMessage({ action: 'reinjectContent' });

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send aggregation message
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: "aggregate",
        timeframe 
      });

      if (response.status === 'error') {
        button.textContent = response.message;
        button.style.backgroundColor = '#F44336';
      } else {
        button.textContent = 'Successfully copied!';
        button.style.backgroundColor = '#4CAF50';
      }
    } catch (error) {
      button.textContent = 'Error: ' + (error.message || 'Unknown error');
      button.style.backgroundColor = '#F44336';
    }

    setTimeout(() => {
      button.disabled = false;
      button.textContent = 'Aggregate Posts';
      button.style.backgroundColor = '#2271b1';
    }, 3000);
  });
});
