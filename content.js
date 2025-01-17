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
	  preview: '.p2020-compact-post__preview'
	}
  };
  
  class PostAggregator {
	constructor() {
	  this.setupMessageListener();
	}
  
	setupMessageListener() {
	  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.action === "aggregate") {
		  this.processAndCopy().then(result => {
			sendResponse(result);
		  }).catch(error => {
			sendResponse({ status: "error", message: error.message });
		  });
		}
		return true;
	  });
	}
  
	async processAndCopy() {
	  try {
		const aggregatedData = await this.aggregateData();
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
  
		this.showNotification("Copied posts to clipboard!", true);
		return { status: "success", data: formattedData };
	  } catch (error) {
		console.error('Failed:', error);
		this.showNotification("Failed to copy: " + error.message, false);
		throw error;
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
  
		// Look for the first media element
		let figureHTML = '';
		
		// First try to find a VideoPress block in comments
		const blockRegex = /<!--\s*wp:videopress\/video[\s\S]*?-->[\s\S]*?<!--\s*\/wp:videopress\/video\s*-->/g;
		const videoBlockMatch = entryContent.innerHTML.match(blockRegex);
		console.log('🎥 Video block found?', !!videoBlockMatch);
		
		if (videoBlockMatch) {
		  console.log('✅ Using VideoPress block from comments:', videoBlockMatch[0].slice(0, 100) + '...');
		  figureHTML = videoBlockMatch[0];
		} else {
		  // Check for images if no video block found
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
  
	async aggregateData() {
	  const data = {
		snaps: [],
		others: [],
		authors: new Set()
	  };
  
	  const posts = Array.from(document.querySelectorAll(CONFIG.selectors.posts));
	  console.log('Found posts:', posts.length);
  
	  for (const post of posts) {
		try {
		  const postData = this.extractPostData(post);
		  if (!postData) continue;
  
		  const authorWithoutAt = postData.author.replace('@', '');
		  if (!CONFIG.authorAllowList.has(authorWithoutAt)) continue;
  
		  const content = await this.fetchPostContent(postData.url);
		  postData.content = content;
		  data.authors.add(postData.author);
  
		  const targetArray = this.isXPost(post) ? data.snaps : data.others;
		  targetArray.push(postData);
		} catch (error) {
		  console.error('Error processing post:', error);
		}
	  }
  
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
  new PostAggregator();
