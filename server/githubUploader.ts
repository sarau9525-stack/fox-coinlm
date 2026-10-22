import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export interface GitHubUploadParams {
  token: string;
  repoName: string;
  isPrivate?: boolean;
  commitMessage?: string;
}

export interface GitHubUploadResult {
  success: boolean;
  repoUrl?: string;
  repoFullName?: string;
  commitSha?: string;
  fileCount?: number;
  error?: string;
}

const IGNORED_NAMES = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.DS_Store',
  'coverage',
  '.env',
  'bun.lock',
  '.aistudio',
  '.cache',
  'tmp',
  '.vite',
  '.vercel',
  '.wrangler',
]);

const IGNORED_EXTENSIONS = new Set(['.log', '.tmp']);

export function getAllFiles(dir: string, baseDir: string = dir): Array<{ relativePath: string; absolutePath: string }> {
  let results: Array<{ relativePath: string; absolutePath: string }> = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name)) continue;
    if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
    if (entry.name.startsWith('.git')) continue;
    const ext = path.extname(entry.name);
    if (IGNORED_EXTENSIONS.has(ext)) continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    // Skip dynamic database runtime storage and temporary artifacts
    if (relPath === 'data/foxcoin_db.json') continue;
    if (relPath.startsWith('.aistudio/')) continue;

    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      try {
        const stats = fs.statSync(fullPath);
        // Skip excessively large binary files (> 4MB) to stay well within GitHub API limits
        if (stats.size > 4 * 1024 * 1024) continue;
        results.push({ relativePath: relPath, absolutePath: fullPath });
      } catch {
        // Skip unreadable files
      }
    }
  }

  return results;
}

/**
 * Creates a clean in-memory ZIP buffer of all project files ready for GitHub / Cloudflare Pages.
 */
export function createProjectZipBuffer(): Buffer {
  const zip = new AdmZip();
  const rootDir = process.cwd();
  const files = getAllFiles(rootDir);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file.absolutePath);
      const zipPath = path.dirname(file.relativePath).replace(/\\/g, '/');
      if (zipPath === '.' || !zipPath) {
        zip.addFile(file.relativePath, content);
      } else {
        zip.addFile(file.relativePath, content);
      }
    } catch (e) {
      console.warn(`Could not add ${file.relativePath} to zip:`, e);
    }
  }

  return zip.toBuffer();
}

/**
 * Automatically creates/updates a GitHub repository and pushes all project files
 * using GitHub's Git Data Tree API.
 */
export async function uploadProjectToGitHub(params: GitHubUploadParams): Promise<GitHubUploadResult> {
  const { token, repoName, isPrivate = false, commitMessage = 'Fox Coin — Cloudflare & Telegram Mini App Ready' } = params;

  if (!token || !token.trim()) {
    return {
      success: false,
      error: 'GitHub Personal Access Token is required. Please paste your token.',
    };
  }
  if (!repoName || !repoName.trim()) {
    return { success: false, error: 'Repository name is required' };
  }

  const cleanToken = token.trim();
  const cleanRepoName = repoName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');

  const headers = {
    Authorization: `Bearer ${cleanToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'FoxCoin-Telegram-MiniApp-Uploader',
  };

  try {
    // 1. Verify user identity & credentials
    const userRes = await fetch('https://api.github.com/user', { headers });
    if (!userRes.ok) {
      if (userRes.status === 401) {
        return {
          success: false,
          error:
            'Invalid GitHub Personal Access Token (401 Bad Credentials). Please verify you copied the full token without extra spaces.',
        };
      }
      return {
        success: false,
        error: `GitHub Authentication Error (${userRes.status}): ${userRes.statusText}`,
      };
    }
    const userData = (await userRes.json()) as any;
    const owner = userData.login;

    // 2. Check if repository exists, otherwise create it with auto_init: true
    let repoRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}`, { headers });
    if (repoRes.status === 404) {
      // Create repository with auto_init: true so GitHub creates main branch with initial commit
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanRepoName,
          private: isPrivate,
          description: 'Fox Coin — Full-stack Telegram Mini App & Web Game with Cloudflare compatibility',
          auto_init: true,
        }),
      });

      if (!createRes.ok) {
        const errData = (await createRes.json().catch(() => ({}))) as any;
        if (createRes.status === 403 || createRes.status === 404) {
          return {
            success: false,
            error:
              'GitHub Permission Error (403): Your Personal Access Token lacks permission to create repositories. Please make sure your token has the "repo" scope checked (or "Repository Administration & Contents: Read/Write" for fine-grained tokens).',
          };
        }
        return {
          success: false,
          error: `Failed to create repository: ${errData.message || createRes.statusText}`,
        };
      }
      repoRes = createRes;
    } else if (!repoRes.ok) {
      const errData = (await repoRes.json().catch(() => ({}))) as any;
      if (repoRes.status === 403) {
        return {
          success: false,
          error:
            `GitHub Permission Error (403): Cannot access repository '${cleanRepoName}'. Your token needs the 'repo' scope.`,
        };
      }
      return {
        success: false,
        error: `GitHub repository check failed (${repoRes.status}): ${errData.message || repoRes.statusText}`,
      };
    }

    const repoData = (await repoRes.json()) as any;
    const defaultBranch = repoData.default_branch || 'main';

    // 3. Scan all project files
    const rootDir = process.cwd();
    const files = getAllFiles(rootDir);

    if (files.length === 0) {
      return { success: false, error: 'No files found to upload in project directory' };
    }

    // 4. Ensure initial commit / parent commit SHA exists
    let parentCommitSha: string | undefined;
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepoName}/git/ref/heads/${defaultBranch}`,
      { headers }
    );

    if (refRes.ok) {
      const refData = (await refRes.json()) as any;
      parentCommitSha = refData.object?.sha;
    } else {
      // Empty repository fallback: initialize main branch with a README.md via Contents API
      const initRes = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepoName}/contents/README.md`,
        {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Initial commit (Fox Coin Setup)',
            content: Buffer.from(
              '# FOX COIN\n\nTelegram Mini App and Web Game ready for Cloudflare Pages and Telegram Bot.\n'
            ).toString('base64'),
            branch: defaultBranch,
          }),
        }
      );

      if (initRes.ok) {
        const initData = (await initRes.json().catch(() => ({}))) as any;
        parentCommitSha = initData.commit?.sha;
      }
    }

    // 5. Create Git Blobs for all project files in controlled batches
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];

    for (const file of files) {
      const fileBuffer = fs.readFileSync(file.absolutePath);
      const base64Content = fileBuffer.toString('base64');

      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}/git/blobs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: base64Content,
          encoding: 'base64',
        }),
      });

      if (!blobRes.ok) {
        const err = (await blobRes.json().catch(() => ({}))) as any;
        console.warn(`Failed blob for ${file.relativePath}:`, err.message);
        if (blobRes.status === 403) {
          return {
            success: false,
            error: `GitHub Permission Denied (403) writing ${file.relativePath}: Token lacks repository write access.`,
          };
        }
        continue;
      }

      const blobData = (await blobRes.json()) as any;
      treeItems.push({
        path: file.relativePath,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    if (treeItems.length === 0) {
      return { success: false, error: 'Could not upload any file blobs to GitHub.' };
    }

    // 6. Create Git Tree
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}/git/trees`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tree: treeItems,
      }),
    });

    if (!treeRes.ok) {
      const err = (await treeRes.json().catch(() => ({}))) as any;
      return { success: false, error: `Failed to create Git tree: ${err.message || treeRes.statusText}` };
    }
    const treeData = (await treeRes.json()) as any;

    // 7. Create Commit
    const commitPayload: Record<string, any> = {
      message: commitMessage,
      tree: treeData.sha,
    };
    if (parentCommitSha) {
      commitPayload.parents = [parentCommitSha];
    }

    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}/git/commits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(commitPayload),
    });

    if (!commitRes.ok) {
      const err = (await commitRes.json().catch(() => ({}))) as any;
      return { success: false, error: `Failed to create commit: ${err.message || commitRes.statusText}` };
    }
    const commitData = (await commitRes.json()) as any;
    const newCommitSha = commitData.sha;

    // 8. Update or Create Branch Ref
    if (parentCommitSha) {
      const updateRefRes = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepoName}/git/refs/heads/${defaultBranch}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sha: newCommitSha,
            force: true,
          }),
        }
      );
      if (!updateRefRes.ok) {
        const err = (await updateRefRes.json().catch(() => ({}))) as any;
        return { success: false, error: `Failed to update branch ref: ${err.message || updateRefRes.statusText}` };
      }
    } else {
      const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}/git/refs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${defaultBranch}`,
          sha: newCommitSha,
        }),
      });
      if (!createRefRes.ok) {
        const err = (await createRefRes.json().catch(() => ({}))) as any;
        return { success: false, error: `Failed to create branch ref: ${err.message || createRefRes.statusText}` };
      }
    }

    const htmlUrl = repoData.html_url || `https://github.com/${owner}/${cleanRepoName}`;

    return {
      success: true,
      repoUrl: htmlUrl,
      repoFullName: `${owner}/${cleanRepoName}`,
      commitSha: newCommitSha,
      fileCount: treeItems.length,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network or unexpected error while uploading to GitHub: ${err.message}`,
    };
  }
}
