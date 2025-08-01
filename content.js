const CONFIG = {
	authorAllowList: new Set([
	  'marinamatijaca',
	  'nuriapenya',
	  'lucasmdo',
	  'fditrapani',
	  'joen',
	  'fcoveram',
	  'ollierozdarz',
	  'jaykoster',
	  'mattantwest',
	  'cbusquets1989'
	]),
	selectors: {
	  posts: 'article.post',
	  author: '.entry-author',
	  title: '.p2020-compact-post__preview a',
	  preview: '.p2020-compact-post__preview',
	  date: '.entry-date, .p2020-compact-post__entry-date'
	},
	timeframes: {
	  '1week': 7,
	  '2weeks': 14,
	  '3weeks': 21
	}
  };
  
  class PostAggregator {
	constructor() {
	  this.setupMessageListener();
	  this.createTimeframeUI();
	  this.createLoadingOverlay();
	  this.selectedTimeframe = '2weeks'; // Default to 2 weeks
	}
  
	createLoadingOverlay() {
	  const overlay = document.createElement('div');
	  overlay.id = 'aggregatorLoadingOverlay';
	  overlay.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(255, 255, 255, 0.9);
		display: none;
		justify-content: center;
		align-items: center;
		z-index: 999999;
		backdrop-filter: blur(2px);
	  `;
  
	  const content = document.createElement('div');
	  content.style.cssText = `
		text-align: center;
		font-family: -apple-system, BlinkMacSystemFont, sans-serif;
	  `;
  
	  // Spinner
	  const spinner = document.createElement('div');
	  spinner.id = 'aggregatorSpinner';
	  spinner.style.cssText = `
		width: 40px;
		height: 40px;
		margin: 0 auto 20px;
		border: 3px solid #f3f3f3;
		border-top: 3px solid #0675C4;
		border-radius: 50%;
		animation: aggregatorSpin 1s linear infinite;
	  `;
  
	  // Add the spin animation
	  const style = document.createElement('style');
	  style.textContent = `
		@keyframes aggregatorSpin {
		  0% { transform: rotate(0deg); }
		  100% { transform: rotate(360deg); }
		}
	  `;
	  document.head.appendChild(style);
  
	  const status = document.createElement('div');
	  status.id = 'aggregatorLoadingStatus';
	  status.style.cssText = `
		color: #0675C4;
		font-size: 16px;
		margin-bottom: 8px;
		font-weight: 500;
	  `;
	  status.textContent = 'Processing posts...';
  
	  const subStatus = document.createElement('div');
	  subStatus.id = 'aggregatorLoadingSubStatus';
	  subStatus.style.cssText = `
		color: #666;
		font-size: 14px;
	  `;
	  subStatus.textContent = 'This might take a few moments';
  
	  content.appendChild(spinner);
	  content.appendChild(status);
	  content.appendChild(subStatus);
	  overlay.appendChild(content);
	  document.body.appendChild(overlay);
	}
  
	showLoading(status = 'Processing posts...', subStatus = 'This might take a few moments') {
	  const overlay = document.getElementById('aggregatorLoadingOverlay');
	  const statusEl = document.getElementById('aggregatorLoadingStatus');
	  const subStatusEl = document.getElementById('aggregatorLoadingSubStatus');
	  
	  if (overlay && statusEl && subStatusEl) {
		statusEl.textContent = status;
		subStatusEl.textContent = subStatus;
		overlay.style.display = 'flex';
	  }
	}
  
	hideLoading() {
	  const overlay = document.getElementById('aggregatorLoadingOverlay');
	  if (overlay) {
		overlay.style.display = 'none';
	  }
	}
  
	updateLoadingStatus(status, subStatus) {
	  const statusEl = document.getElementById('aggregatorLoadingStatus');
	  const subStatusEl = document.getElementById('aggregatorLoadingSubStatus');
	  
	  if (statusEl && subStatusEl) {
		if (status) statusEl.textContent = status;
		if (subStatus) subStatusEl.textContent = subStatus;
	  }
	}
  
	showError(message) {
	  const statusEl = document.getElementById('aggregatorLoadingStatus');
	  const subStatusEl = document.getElementById('aggregatorLoadingSubStatus');
	  const spinner = document.getElementById('aggregatorSpinner');
	  
	  if (statusEl && subStatusEl && spinner) {
		spinner.style.display = 'none';
		statusEl.textContent = 'Error';
		subStatusEl.textContent = message;
		
		setTimeout(() => {
		  this.hideLoading();
		  spinner.style.display = 'block';
		}, 1500);
	  }
	}
  
	createTimeframeUI() {
	  const container = document.createElement('div');
	  container.id = 'timeframeSelector';
	  container.style.cssText = `
		position: fixed;
		top: 48px;
		right: 24px;
		background-color: #fff;
		padding: 12px;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		z-index: 9999998;
		display: none;
		font-family: -apple-system, BlinkMacSystemFont, sans-serif;
	  `;
  
	  const title = document.createElement('div');
	  title.textContent = 'Select Timeframe';
	  title.style.marginBottom = '8px';
	  title.style.fontWeight = '600';
	  container.appendChild(title);
  
	  Object.entries({
		'1week': 'Last week',
		'2weeks': 'Last two weeks',
		'3weeks': 'Last three weeks'
	  }).forEach(([value, label]) => {
		const option = document.createElement('div');
		option.style.cssText = `
		  padding: 6px 12px;
		  cursor: pointer;
		  border-radius: 4px;
		  margin: 2px 0;
		`;
		option.textContent = label;
		
		if (value === this.selectedTimeframe) {
		  option.style.backgroundColor = '#0675C4';
		  option.style.color = '#fff';
		}
  
		this.addPassiveEventListener(option, 'mouseover', () => {
		  if (value !== this.selectedTimeframe) {
			option.style.backgroundColor = '#f0f0f0';
		  }
		});
		this.addPassiveEventListener(option, 'mouseout', () => {
		  if (value !== this.selectedTimeframe) {
			option.style.backgroundColor = 'transparent';
		  }
		});
		
		option.addEventListener('click', () => {
		  this.selectedTimeframe = value;
		  this.hideTimeframeUI();
		  this.processAndCopy();
		});
		
		container.appendChild(option);
	  });
  
	  document.body.appendChild(container);
	}
  
	showTimeframeUI() {
	  const selector = document.getElementById('timeframeSelector');
	  if (selector) selector.style.display = 'block';
	}
  
	hideTimeframeUI() {
	  const selector = document.getElementById('timeframeSelector');
	  if (selector) selector.style.display = 'none';
	}
  
	setupMessageListener() {
	  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.action === "aggregate") {
		  this.showTimeframeUI();
		  sendResponse({ status: "success", message: "Showing timeframe selector" });
		}
		return true;
	  });
	}
  
	async processAndCopy() {
	  try {
		this.showLoading();
		console.log(`Starting aggregation with timeframe: ${this.selectedTimeframe} (${CONFIG.timeframes[this.selectedTimeframe]} days)`);
		const aggregatedData = await this.aggregateData();
		
		if (!aggregatedData.snaps.length && !aggregatedData.others.length) {
		  throw new Error('No posts found matching criteria');
		}
		
		this.updateLoadingStatus('Formatting data...', 'Almost done!');
		const formattedData = await this.formatDataForMarkdown(aggregatedData);
		if (!formattedData) {
		  throw new Error('No data to format');
		}
  
		this.updateLoadingStatus('Copying to clipboard...', 'Just a moment...');
		const textarea = document.createElement('textarea');
		textarea.value = formattedData;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		
		try {
		  await navigator.clipboard.writeText(formattedData);
		} catch (clipboardError) {
		  try {
			textarea.select();
			document.execCommand('copy');
		  } catch (execCommandError) {
			throw new Error('Failed to copy to clipboard: ' + execCommandError.message);
		  }
		} finally {
		  document.body.removeChild(textarea);
		}
  
		// Update loading overlay to show success
		const spinner = document.getElementById('aggregatorSpinner');
		const statusEl = document.getElementById('aggregatorLoadingStatus');
		const subStatusEl = document.getElementById('aggregatorLoadingSubStatus');
  
		if (spinner && statusEl && subStatusEl) {
		  // Hide spinner
		  spinner.style.display = 'none';
		  
		  // Update status text
		  statusEl.textContent = `${aggregatedData.snaps.length + aggregatedData.others.length} posts copied to clipboard!`;
		  subStatusEl.textContent = 'Ready to paste in your Design Snaps post :) ';
		  
		  // Hide after 5 seconds
		  setTimeout(() => {
			this.hideLoading();
			// Reset the spinner for next use
			spinner.style.display = 'block';
		  }, 5000);
		}
  
		return { status: "success", data: formattedData };
	  } catch (error) {
		console.error('Failed:', error);
		this.showError("Failed to copy: " + error.message);
		throw error;
	  }
	}
  
	addPassiveEventListener(element, eventName, handler) {
	  element.addEventListener(eventName, handler, { passive: true });
	}
  
	// Include all other existing methods (getPostDate, parseRelativeTime, etc.)
	// that haven't been modified
	
	async loadMorePosts() {
	  return new Promise((resolve) => {
		const currentPostCount = document.querySelectorAll(CONFIG.selectors.posts).length;
		console.log(`Attempting to load more posts. Current count: ${currentPostCount}`);
		
		// Scroll to bottom to trigger loading
		window.scrollTo(0, document.body.scrollHeight);
		
		// Wait for new posts to load
		let checkInterval = setInterval(() => {
		  const newPostCount = document.querySelectorAll(CONFIG.selectors.posts).length;
		  console.log(`Checking for new posts. Current: ${newPostCount}, Previous: ${currentPostCount}`);
		  
		  if (newPostCount > currentPostCount) {
			clearInterval(checkInterval);
			console.log(`Found ${newPostCount - currentPostCount} new posts`);
			setTimeout(resolve, 1000); // Give a bit more time for everything to load
		  }
		}, 500);
  
		// Timeout after 10 seconds if no new posts load
		setTimeout(() => {
		  clearInterval(checkInterval);
		  console.log('Timed out waiting for new posts');
		  resolve();
		}, 10000);
	  });
	}
  
	getPostDate(post) {
	  const dateElement = post.querySelector(CONFIG.selectors.date);
	  if (!dateElement) return null;
  
	  let postDate;
	  let source = 'unknown';
  
	  // Try unix timestamp
	  const unixtime = dateElement.getAttribute('data-unixtime');
	  if (unixtime) {
		postDate = new Date(parseInt(unixtime) * 1000);
		source = 'unix';
	  }
	  // Try title attribute (compact date format)
	  else if (dateElement.title) {
		postDate = new Date(dateElement.title);
		source = 'title';
	  }
	  // Try relative time
	  else {
		const relativeTime = dateElement.textContent.trim().toLowerCase();
		postDate = this.parseRelativeTime(relativeTime);
		source = 'relative';
	  }
  
	  console.log('Date parsing:', {
		element: dateElement.outerHTML,
		source,
		parsed: postDate,
		text: dateElement.textContent,
		title: dateElement.title,
		unixtime
	  });
  
	  return postDate;
	}
  
	isWithinTimeframe(post) {
	  const postDate = this.getPostDate(post);
	  if (!postDate || isNaN(postDate.getTime())) {
		console.warn('Invalid date for post:', post);
		return false;
	  }
  
	  const now = new Date();
	  const days = CONFIG.timeframes[this.selectedTimeframe];
	  const cutoffDate = new Date(now.setDate(now.getDate() - days));
  
	  const isWithin = postDate >= cutoffDate;
	  const title = post.querySelector(CONFIG.selectors.title)?.textContent.trim();
  
	  console.log('Timeframe check:', {
		title,
		postDate: postDate.toISOString(),
		cutoffDate: cutoffDate.toISOString(),
		days,
		isWithin
	  });
  
	  return isWithin;
	}
  
	parseRelativeTime(relativeTime) {
	  const now = new Date();
	  const match = relativeTime.match(/(\d+)\s*(h|hour|hours|d|day|days|w|week|weeks)\s*ago/i);
	  
	  if (!match) {
		// Handle date strings like "Jan 28" or "Dec 02, 2024"
		if (relativeTime.includes(',')) {
		  return new Date(relativeTime);
		}
		// For format like "Jan 28", append current year
		return new Date(`${relativeTime}, ${new Date().getFullYear()}`);
	  }
	  
	  const [, amount, unit] = match;
	  const value = parseInt(amount);
	  
	  switch(unit.charAt(0).toLowerCase()) {
		case 'h':
		  return new Date(now.getTime() - (value * 60 * 60 * 1000));
		case 'd':
		  return new Date(now.getTime() - (value * 24 * 60 * 60 * 1000));
		case 'w':
		  return new Date(now.getTime() - (value * 7 * 24 * 60 * 60 * 1000));
		default:
		  return now;
	  }
	}
  
	  async aggregateData() {
		const data = {
		  snaps: [],
		  others: [],
		  authors: new Set()
		};
	
		let keepLoading = true;
		let previousPostCount = 0;
		let noNewPostsCount = 0;
		let oldPostsCount = 0;
		let processedCount = 0;
	
		while (keepLoading) {
		  const posts = Array.from(document.querySelectorAll(CONFIG.selectors.posts));
		  console.log(`Processing posts ${previousPostCount + 1} to ${posts.length}`);
		  
		  this.updateLoadingStatus(
			'Processing posts...',
			`Found ${processedCount} matching posts. Loading more...`
		  );
	
		  // Process only new posts
		  const newPosts = posts.slice(previousPostCount);
		  
		  if (newPosts.length === 0) {
			noNewPostsCount++;
			if (noNewPostsCount >= 3) {
			  console.log('No new posts found after 3 attempts, stopping');
			  break;
			}
		  } else {
			noNewPostsCount = 0;
		  }
	
		  for (const post of newPosts) {
			if (!this.isWithinTimeframe(post)) {
			  oldPostsCount++;
			  if (oldPostsCount > 5) {
				console.log('Found 5+ posts outside timeframe, stopping');
				keepLoading = false;
				break;
			  }
			  continue;
			}
	
			const postData = this.extractPostData(post);
			if (!postData) continue;
	
			const authorWithoutAt = postData.author.replace('@', '');
			if (!CONFIG.authorAllowList.has(authorWithoutAt)) continue;
	
			this.updateLoadingStatus(
			  'Processing posts...',
			  `Processing: ${postData.title.slice(0, 40)}${postData.title.length > 40 ? '...' : ''}`
			);
	
			const content = await this.fetchPostContent(postData.url);
			postData.content = content;
			data.authors.add(postData.author);
	
			const targetArray = this.isXPost(post) ? data.snaps : data.others;
			targetArray.push(postData);
			processedCount++;
		  }
	
		  previousPostCount = posts.length;
	
		  if (keepLoading) {
			this.updateLoadingStatus('Loading more posts...', 'Scrolling to load more content');
			await this.loadMorePosts();
		  }
		}
	
		// Restore scroll position
		window.scrollTo(0, 0);
	
		console.log('Aggregation complete:', {
		  snaps: data.snaps.length,
		  others: data.others.length,
		  authors: data.authors.size
		});
	
		return {
		  ...data,
		  authors: Array.from(data.authors)
		};
	  }
	
	  extractPostData(post) {
		try {
		  const authorEl = post.querySelector(CONFIG.selectors.author);
		  const titleEl = post.querySelector(CONFIG.selectors.title);
		  
		  if (!titleEl) return null;
	
		  let author = null;
		  if (authorEl) {
			const hrefParts = authorEl.getAttribute('href')?.split('/author/');
			if (hrefParts && hrefParts[1]) {
			  author = hrefParts[1].replace('/', '');
			}
		  }
		  if (!author) {
			const authorMatch = post.classList.toString().match(/author-(\w+)/);
			author = authorMatch ? authorMatch[1] : null;
		  }
		  if (!author) return null;
	
		  let title = titleEl.textContent.trim();
		  title = title.replace(/From \+\w+\s*/, '').trim();
		  
		  return {
			title,
			url: titleEl.href,
			author: `@${author}`
		  };
		} catch (error) {
		  console.error('Error extracting post data:', error);
		  return null;
		}
	  }
	
	  async fetchPostContent(url) {
		try {
		  console.log('🔍 Fetching content from URL:', url);
		  const response = await fetch(url);
		  const html = await response.text();
		  const parser = new DOMParser();
		  const doc = parser.parseFromString(html, 'text/html');
		  
		  const entryContent = doc.querySelector('.entry-content');
		  console.log('📄 Entry content found?', !!entryContent);
		  
		  if (!entryContent) return { paragraph: '', figure: '' };
	
		  const firstParagraph = entryContent.querySelector('p');
		  const paragraphText = firstParagraph ? firstParagraph.textContent.trim() : '';
		  console.log('📝 First paragraph:', paragraphText.slice(0, 100) + '...');
	
		  let figureHTML = '';
		  
		  const blockRegex = /<!--\s*wp:videopress\/video[\s\S]*?-->[\s\S]*?<!--\s*\/wp:videopress\/video\s*-->/g;
		  const videoBlockMatch = entryContent.innerHTML.match(blockRegex);
		  console.log('🎥 Video block found?', !!videoBlockMatch);
		  
		  if (videoBlockMatch) {
			console.log('✅ Using VideoPress block from comments:', videoBlockMatch[0].slice(0, 100) + '...');
			figureHTML = videoBlockMatch[0];
		  } else {
			const imageFigure = entryContent.querySelector('.wp-block-image');
			console.log('🖼️ Image figure found?', !!imageFigure);
			
			if (imageFigure) {
			  figureHTML = imageFigure.outerHTML;
			  console.log('✅ Using image figure HTML');
			}
		  }
	
		  return {
			paragraph: paragraphText,
			figure: figureHTML
		  };
		} catch (error) {
		  console.error(`Error fetching post content for ${url}:`, error);
		  return { paragraph: '', figure: '' };
		}
	  }
	
	  formatDataForMarkdown(data) {
		const formatPost = post => {
		  const blocks = [];

		  blocks.push(
			`<!-- wp:spacer {"height":"32px"} -->`,
			`<div style="height:32px" aria-hidden="true" class="wp-block-spacer"></div>`,
			`<!-- /wp:spacer -->`
		  );
		  
		  blocks.push(
			`<!-- wp:heading {"level":3} -->`,
			`<h3><a href="${post.url}">${post.title}</a></h3>`,
			`<!-- /wp:heading -->`
		  );
	
		  blocks.push(
			`<!-- wp:paragraph -->`,
			`<p>${post.author} - <code>Early explorations, In progress, Done</code></p>`,
			`<!-- /wp:paragraph -->`
		  );
	
		  if (post.content?.paragraph) {
			blocks.push(
			  `<!-- wp:paragraph -->`,
			  `<p>${post.content.paragraph}</p>`,
			  `<!-- /wp:paragraph -->`
			);
		  }

		  blocks.push(
			`<!-- wp:paragraph -->`,
			`<p><span style="display:inline-block;width:1em"><img title="linear logo" class="emoji" src="https://s0.wp.com/i/emojis/l/linear-logo.png" alt="linear logo"></span> Part of the {Hosting & Developers, Site Builder & AI, CIAB} initiatives (project) – <span style="display:inline-block;width:1em"><img title="figma" class="emoji" src="https://s0.wp.com/i/emojis/f/figma.png" alt="figma"></span> Figma&nbsp;–&nbsp;<span style="display:inline-block;width:1em"><img title="p2" class="emoji" src="https://s0.wp.com/i/emojis/p/p2.png" alt="p2"></span> <a href="${post.url}">Post</a></p>`,
			`<!-- /wp:paragraph -->`
		  );
	
		  if (post.content?.figure) {
			blocks.push(post.content.figure);
		  }
	
		  return blocks.join('\n');
		};
	
		const sections = [
		  ...data.snaps.map(formatPost),
		  ...data.others.map(formatPost)
		];
	
		return sections.join('\n\n');
	  }
	
	  isXPost(post) {
		return post.classList.contains('tag-p2-xpost') || post.querySelector('.p2020-xpost-icon') !== null;
	  }
	}
	
	// Initialize the aggregator
	new PostAggregator();
