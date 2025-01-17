const CONFIG = {
	authorAllowList: new Set([
	  'janahernandezaraujo',
	  'nuriapenya',
	  'lucasmdo',
	  'fditrapani',
	  'joen',
	  'fcoveram',
	  'auareyou',
	  'jaykoster',
	  'cbusquets1989'
	]),
	selectors: {
	  posts: 'article.post',
	  author: '.entry-author',
	  title: '.p2020-compact-post__preview a',
	  preview: '.p2020-compact-post__preview',
	  date: '.p2020-compact-post__entry-date'
	}
  };
  
  class PostAggregator {
	constructor() {
	  this.setupMessageListener();
	  console.log('🎉 PostAggregator initialized');
	}
  
	setupMessageListener() {
	  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.action === "aggregate") {
		  console.log('📨 Received aggregate request with timeframe:', request.timeframe);
		  this.processAndCopy(request.timeframe).then(result => {
			console.log('✅ Process completed:', result);
			sendResponse(result);
		  }).catch(error => {
			console.error('❌ Process failed:', error);
			sendResponse({ status: "error", message: error.message });
		  });
		}
		return true;
	  });
	}
  
	async processAndCopy(timeframe = 'all') {
	  try {
		console.log('🎬 Starting processAndCopy with timeframe:', timeframe);
		const aggregatedData = await this.aggregateData(timeframe);
		if (!aggregatedData.snaps.length && !aggregatedData.others.length) {
		  throw new Error('No posts found matching criteria');
		}
		
		const formattedData = await this.formatDataForMarkdown(aggregatedData);
		if (!formattedData) {
		  throw new Error('No data to format');
		}
  
		const textarea = document.createElement('textarea');
		textarea.value = formattedData;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		
		try {
		  await navigator.clipboard.writeText(formattedData);
		  console.log('📋 Data copied to clipboard');
		} catch (clipboardError) {
		  console.warn('⚠️ Modern clipboard API failed, trying execCommand:', clipboardError);
		  try {
			textarea.select();
			document.execCommand('copy');
		  } catch (execCommandError) {
			throw new Error('Failed to copy to clipboard: ' + execCommandError.message);
		  }
		} finally {
		  document.body.removeChild(textarea);
		}
  
		this.showNotification("Copied posts to clipboard!", true);
		return { status: "success", data: formattedData };
	  } catch (error) {
		console.error('Failed:', error);
		this.showNotification("Failed to copy: " + error.message, false);
		throw error;
	  }
	}
  
	isWithinTimeframe(dateString, timeframe) {
	  console.log('⏰ Checking timeframe for date:', dateString);
	  
	  if (timeframe === 'all') {
		console.log('⏰ Timeframe is "all", accepting post');
		return true;
	  }
	  
	  try {
		const postDate = new Date(dateString);
		console.log('⏰ Parsed date:', postDate);
		
		if (isNaN(postDate.getTime())) {
		  console.error('⏰ Invalid date:', dateString);
		  return false;
		}
		
		const now = new Date();
		const diffInDays = (now - postDate) / (1000 * 60 * 60 * 24);
		
		console.log('⏰ Date check:', {
		  postDate: postDate.toISOString(),
		  now: now.toISOString(),
		  timeframe,
		  diffInDays,
		  isWithin: diffInDays <= parseInt(timeframe)
		});
		
		return diffInDays <= parseInt(timeframe);
	  } catch (error) {
		console.error('⏰ Error processing date:', error);
		return false;
	  }
	}
  
	async aggregateData(timeframe) {
	  console.log('🔄 Starting aggregateData with timeframe:', timeframe);
	  
	  const data = {
		snaps: [],
		others: [],
		authors: new Set()
	  };
  
	  const posts = Array.from(document.querySelectorAll(CONFIG.selectors.posts));
	  console.log('🔍 Found total posts:', posts.length);
  
	  // Debug: Check the date elements immediately
	  const dates = Array.from(document.querySelectorAll(CONFIG.selectors.date));
	  console.log('📅 Date elements found:', dates.length);
	  console.log('📅 Sample date elements:', dates.slice(0, 3).map(d => ({
		text: d.textContent,
		datetime: d.getAttribute('datetime'),
		element: d
	  })));
  
	  // Debug: Check the first post in detail
	  if (posts.length > 0) {
		const firstPost = posts[0];
		console.log('🔍 First post details:', {
		  title: firstPost.querySelector(CONFIG.selectors.title)?.textContent,
		  author: firstPost.querySelector(CONFIG.selectors.author)?.getAttribute('href'),
		  date: firstPost.querySelector(CONFIG.selectors.date)?.getAttribute('datetime')
		});
	  }
  
	  for (const post of posts) {
		try {
		  console.log('\n🔎 Processing post:', post.querySelector('h1, h2')?.textContent || 'Unknown title');
		  
		  const postData = this.extractPostData(post);
		  if (!postData) {
			console.log('❌ Post filtered out: Could not extract post data');
			continue;
		  }
		  console.log('✅ Post data extracted:', postData);
  
		  const dateEl = post.querySelector(CONFIG.selectors.date);
		  console.log('📅 Date element found:', {
			found: !!dateEl,
			element: dateEl,
			datetime: dateEl?.getAttribute('datetime'),
			text: dateEl?.textContent
		  });
		  
		  if (!dateEl || !this.isWithinTimeframe(dateEl.getAttribute('datetime'), timeframe)) {
			console.log('❌ Post filtered out due to date:', dateEl?.getAttribute('datetime'));
			continue;
		  }
  
		  const authorWithoutAt = postData.author.replace('@', '');
		  console.log('👤 Checking author:', authorWithoutAt, 'allowed:', CONFIG.authorAllowList.has(authorWithoutAt));
		  if (!CONFIG.authorAllowList.has(authorWithoutAt)) {
			console.log('❌ Post filtered out due to author not in allow list');
			continue;
		  }
  
		  const content = await this.fetchPostContent(postData.url);
		  postData.content = content;
		  data.authors.add(postData.author);
  
		  const targetArray = this.isXPost(post) ? data.snaps : data.others;
		  targetArray.push(postData);
		  console.log('✅ Post added to', this.isXPost(post) ? 'snaps' : 'others');
		} catch (error) {
		  console.error('Error processing post:', error);
		}
	  }
  
	  console.log('🏁 Aggregation complete:', {
		snaps: data.snaps.length,
		others: data.others.length,
		authors: Array.from(data.authors)
	  });
  
	  return {
		...data,
		authors: Array.from(data.authors)
	  };
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
  
	formatDataForMarkdown(data) {
	  const formatPost = post => {
		const blocks = [];
		
		blocks.push(
		  `<!-- wp:heading -->`,
		  `<h2><a href="${post.url}">${post.title}</a></h2>`,
		  `<!-- /wp:heading -->`
		);
  
		blocks.push(
		  `<!-- wp:paragraph -->`,
		  `<p>— ${post.author} - [In progress]</p>`,
		  `<!-- /wp:paragraph -->`
		);
  
		if (post.content?.paragraph) {
		  blocks.push(
			`<!-- wp:paragraph -->`,
			`<p>${post.content.paragraph}</p>`,
			`<!-- /wp:paragraph -->`
		  );
		}
  
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
  
	showNotification(message, isSuccess = true) {
	  const existing = document.getElementById('copyNotificationPopover');
	  if (existing) existing.remove();
  
	  const notification = document.createElement('div');
	  notification.id = 'copyNotificationPopover';
	  notification.textContent = message;
	  notification.style.cssText = `
		position: fixed;
		top: 48px;
		right: 24px;
		padding: 10px 20px;
		background-color: ${isSuccess ? '#003010' : '#F44336'};
		color: ${isSuccess ? '#48FF50' : '#FFFFFF'};
		border-radius: 5px;
		font-family: -apple-system, BlinkMacSystemFont, sans-serif;
		font-size: 14px;
		font-weight: 500;
		z-index: 9999999;
		box-shadow: 0 2px 4px rgba(0,0,0,0.2);
	  `;
  
	  document.body.appendChild(notification);
  
	  setTimeout(() => {
		notification.remove();
	  }, 3000);
	}
  }
  
  // Initialize the aggregator
  // Debug check if we're already initialized
// Force debug logging into the page
const debugLog = (msg) => {
	console.log(msg);
	// Also insert into the page for visibility
	const debugDiv = document.createElement('div');
	debugDiv.style.cssText = 'position: fixed; top: 0; right: 0; background: black; color: lime; padding: 10px; z-index: 999999; font-family: monospace;';
	debugDiv.textContent = msg;
	document.body.appendChild(debugDiv);
	setTimeout(() => debugDiv.remove(), 3000);
  };
  
// Initialization with basic checks
const posts = document.querySelectorAll('article.post');
const dates = document.querySelectorAll('.p2020-compact-post__entry-date');

console.log('Content script executing!', {
  posts: posts.length,
  dates: dates.length,
  url: window.location.href
});

if (!window._postAggregator) {
  window._postAggregator = new PostAggregator();
  console.log('PostAggregator initialized');
}
