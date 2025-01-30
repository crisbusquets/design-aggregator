# Designomattic Aggregator

A Chrome extension that simplifies the process of gathering curated content from P2 blogs. It automatically analyzes a specified P2 blog, identifies posts from selected authors, and copies the latest content (last two weeks) to your clipboard for easy sharing and reference.

### Features:
- Scans P2 blogs for recent posts
- Filters content by specified authors
- Copies latest relevant posts to clipboard, using WordPress formatting
- Streamlines design content aggregation

### Usage:
1. Install the extension
2. Navigate to a P2 blog
3. Click the extension icon
4. Choose a timeframe
5. Wait a little bit
6. Get curated content copied to your clipboard

### Customization:
In `content.js`:
- Edit the `authorAllowList` array to customize the list of authors to include in the output
- Edit the `formatDataForMarkdown` function to customize the output format
