'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getCountImage } = require('../utils/themify');

async function main() {
  const username = (process.env.GITHUB_USERNAME || 'wristkyion').trim();
  const theme = (process.env.COUNTER_THEME || 'asoul').trim();
  const outputFile = path.resolve(
    process.cwd(),
    process.env.COUNTER_OUTPUT || 'commit-counter.svg'
  );

  if (!/^[A-Za-z0-9-]+$/.test(username)) {
    throw new Error('GITHUB_USERNAME contains invalid characters.');
  }

  const apiUrl = new URL('https://api.github.com/search/commits');
  apiUrl.searchParams.set('q', `author:${username}`);
  apiUrl.searchParams.set('per_page', '1');

  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wristkyion-moe-counter',
    },
    signal: AbortSignal.timeout(20_000),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || response.statusText;
    throw new Error(`GitHub API request failed (${response.status}): ${message}`);
  }

  if (!payload || !Number.isSafeInteger(payload.total_count)) {
    throw new Error('GitHub API returned an invalid total_count.');
  }

  // Do not replace a good SVG with a potentially incomplete search result.
  if (payload.incomplete_results) {
    throw new Error('GitHub marked the commit search results as incomplete.');
  }

  const svg = getCountImage({
    count: payload.total_count,
    theme,
    padding: 8,
    offset: 0,
    align: 'top',
    scale: 1,
    pixelated: '0',
    darkmode: 'auto',
  });

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, svg, 'utf8');

  console.log(`Generated ${outputFile}`);
  console.log(`GitHub commit search count for @${username}: ${payload.total_count}`);
  console.log(`Theme: ${theme}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
