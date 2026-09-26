#!/usr/bin/env node

/**
 * Automates GitHub Release and Tag Creation for points updates in xwing-data2-legacy.
 *
 * Requirements:
 * 1. PR must be merged into master first.
 * 2. Token read from GITHUB_PERSONAL_ACCESS_TOKEN or MCP config.
 * 3. Tag name aligns with package.json version without 'v' prefix (e.g. '3.11.0').
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitHubToken() {
  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) return process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;

  const mcpConfigPath = 'C:/Users/valte/.gemini/config/mcp_config.json';
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
      const token = cfg?.mcpServers?.['github-mcp-server']?.env?.GITHUB_PERSONAL_ACCESS_TOKEN;
      if (token) return token;
    } catch (_) {}
  }
  return null;
}

function getPreviousTag(currentVersion) {
  try {
    const tags = execSync('git tag --sort=-v:refname', { encoding: 'utf8' })
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);
    const idx = tags.indexOf(currentVersion);
    if (idx !== -1 && idx + 1 < tags.length) {
      return tags[idx + 1];
    }
    return tags[0] || '3.10.0';
  } catch (_) {
    return '3.10.0';
  }
}

async function createRelease(options = {}) {
  const repoRoot = path.resolve(__dirname, '../../../../');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const version = options.version || pkg.version;
  const prNumber = options.prNumber;
  const cycleName = options.cycleName || 'Points Update';
  const owner = options.owner || 'SogeMoge';
  const repo = options.repo || 'xwing-data2-legacy';

  const token = getGitHubToken();
  if (!token) {
    throw new Error('GitHub access token not found in environment or MCP config.');
  }

  const prevTag = getPreviousTag(version);
  const releaseTitle = `${version} ${cycleName}`;
  const changelogFile = `changelog/${new Date().toISOString().slice(0, 7)}-points-update.md`;

  let prLine = '';
  if (prNumber) {
    prLine = `* Points Update (v${version}) by @${owner} in https://github.com/${owner}/${repo}/pull/${prNumber}\n\n`;
  }

  const releaseBody = `## What's Changed
${prLine}### Highlights
- Points and balance adjustments aligned with **${cycleName}**.
- Retrospect report: [${changelogFile}](https://github.com/${owner}/${repo}/blob/master/${changelogFile})
- Retrospective points document: [X-Wing 2.0 Legacy Points Sheet](https://docs.google.com/spreadsheets/d/1kgEwq-1UtA7w8Q5sXAr_bt0AZHfaaZDnVRC9lnyAoBY)

**Full Changelog**: https://github.com/${owner}/${repo}/compare/${prevTag}...${version}`;

  const payload = JSON.stringify({
    tag_name: version,
    target_commitish: 'master',
    name: releaseTitle,
    body: releaseBody,
    draft: false,
    prerelease: false
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases`,
      method: 'POST',
      headers: {
        'User-Agent': 'Antigravity-Agent',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const result = JSON.parse(data);
          console.log(`Successfully created release: ${result.name}`);
          console.log(`Release URL: ${result.html_url}`);
          // Fetch tag locally
          try {
            execSync('git fetch --tags origin', { stdio: 'inherit', cwd: repoRoot });
          } catch (_) {}
          resolve(result);
        } else {
          reject(new Error(`GitHub API returned HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const prNumber = args[0] ? Number(args[0]) : null;
  const cycleName = args[1] || 'Points Update';

  createRelease({ prNumber, cycleName })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error creating release:', err.message);
      process.exit(1);
    });
}

module.exports = { createRelease };
