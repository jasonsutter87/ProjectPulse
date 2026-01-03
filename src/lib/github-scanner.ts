import { TechStack, ScanResult, SuggestedTodo } from './scanner';

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

interface TechDetector {
  name: string;
  file: string;
  getVersion?: (content: string) => string | undefined;
}

const TECH_DETECTORS: TechDetector[] = [
  {
    name: 'Node.js',
    file: 'package.json',
    getVersion: (content) => {
      try {
        const pkg = JSON.parse(content);
        return pkg.engines?.node;
      } catch {
        return undefined;
      }
    },
  },
  { name: 'Flutter/Dart', file: 'pubspec.yaml' },
  { name: 'Rust', file: 'Cargo.toml' },
  { name: 'Python', file: 'requirements.txt' },
  { name: 'Python', file: 'pyproject.toml' },
  { name: 'Go', file: 'go.mod' },
  { name: 'Next.js', file: 'next.config.js' },
  { name: 'Next.js', file: 'next.config.ts' },
  { name: 'Next.js', file: 'next.config.mjs' },
  { name: 'Vue.js', file: 'vue.config.js' },
  { name: 'Docker', file: 'Dockerfile' },
  { name: 'Docker Compose', file: 'docker-compose.yml' },
  { name: 'Docker Compose', file: 'docker-compose.yaml' },
];

interface CompletenessCheck {
  name: string;
  files: string[];
  missing_todo: SuggestedTodo;
}

const COMPLETENESS_CHECKS: CompletenessCheck[] = [
  {
    name: 'README',
    files: ['README.md', 'readme.md', 'README.txt', 'README'],
    missing_todo: {
      title: 'Write README documentation',
      description: 'Add a README.md with project overview, setup instructions, and usage examples.',
      tags: ['dev'],
      priority: 1,
    },
  },
  {
    name: 'License',
    files: ['LICENSE', 'LICENSE.md', 'LICENSE.txt'],
    missing_todo: {
      title: 'Add license file',
      description: 'Choose and add an appropriate license for the project.',
      tags: ['dev', 'go-live'],
      priority: 0,
    },
  },
  {
    name: 'Tests',
    files: ['test', 'tests', 'spec', '__tests__'],
    missing_todo: {
      title: 'Add test coverage',
      description: 'Set up testing framework and add unit/integration tests.',
      tags: ['dev'],
      priority: 2,
    },
  },
  {
    name: 'CI/CD',
    files: ['.github/workflows', '.gitlab-ci.yml', 'Jenkinsfile', '.circleci', 'azure-pipelines.yml'],
    missing_todo: {
      title: 'Set up CI/CD pipeline',
      description: 'Configure automated testing and deployment pipeline.',
      tags: ['dev', 'go-live'],
      priority: 1,
    },
  },
  {
    name: 'Environment Example',
    files: ['.env.example', '.env.sample', 'env.example'],
    missing_todo: {
      title: 'Add environment example file',
      description: 'Create .env.example with all required environment variables documented.',
      tags: ['dev'],
      priority: 1,
    },
  },
  {
    name: 'Git Ignore',
    files: ['.gitignore'],
    missing_todo: {
      title: 'Add .gitignore file',
      description: 'Create .gitignore to exclude build artifacts, dependencies, and sensitive files.',
      tags: ['dev'],
      priority: 2,
    },
  },
];

const WEB_CHECKS: CompletenessCheck[] = [
  {
    name: 'SEO Meta Tags',
    files: ['src/app/layout.tsx', 'pages/_app.tsx', 'index.html'],
    missing_todo: {
      title: 'Optimize SEO meta tags',
      description: 'Add proper title, description, Open Graph, and Twitter card meta tags.',
      tags: ['seo', 'marketing'],
      priority: 1,
    },
  },
  {
    name: 'Favicon',
    files: ['public/favicon.ico', 'favicon.ico', 'public/favicon.svg'],
    missing_todo: {
      title: 'Add favicon and app icons',
      description: 'Create favicon.ico and various app icons for different devices.',
      tags: ['marketing'],
      priority: 0,
    },
  },
  {
    name: 'Sitemap',
    files: ['public/sitemap.xml', 'sitemap.xml'],
    missing_todo: {
      title: 'Generate sitemap.xml',
      description: 'Create and configure automatic sitemap generation for SEO.',
      tags: ['seo'],
      priority: 1,
    },
  },
  {
    name: 'Robots.txt',
    files: ['public/robots.txt', 'robots.txt'],
    missing_todo: {
      title: 'Add robots.txt',
      description: 'Configure robots.txt for search engine crawling.',
      tags: ['seo'],
      priority: 0,
    },
  },
];

// Parse GitHub URL to extract owner and repo
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Handle various GitHub URL formats
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
    /^([^\/]+)\/([^\/]+)$/, // owner/repo format
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  }

  return null;
}

// Fetch repo contents from GitHub API
async function fetchRepoContents(
  owner: string,
  repo: string,
  path: string = '',
  token?: string
): Promise<GitHubFile[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ProjectPulse-Scanner',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    }
    if (response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Try again later or add a GitHub token.');
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [data];
}

// Fetch file content from GitHub
async function fetchFileContent(downloadUrl: string, token?: string): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': 'ProjectPulse-Scanner',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(downloadUrl, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }

  return response.text();
}

// Get repo info for the name
async function fetchRepoInfo(
  owner: string,
  repo: string,
  token?: string
): Promise<{ name: string; description: string | null }> {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ProjectPulse-Scanner',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    return { name: repo, description: null };
  }

  const data = await response.json();
  return { name: data.name || repo, description: data.description };
}

// Build a file tree from repo contents
async function buildFileTree(
  owner: string,
  repo: string,
  token?: string,
  maxDepth: number = 2
): Promise<Map<string, GitHubFile>> {
  const fileTree = new Map<string, GitHubFile>();

  async function fetchRecursive(path: string, depth: number) {
    if (depth > maxDepth) return;

    try {
      const contents = await fetchRepoContents(owner, repo, path, token);

      for (const item of contents) {
        fileTree.set(item.path, item);

        // Recursively fetch directories (but not node_modules, .git, etc.)
        if (item.type === 'dir' && !item.name.startsWith('.') && item.name !== 'node_modules') {
          await fetchRecursive(item.path, depth + 1);
        }
      }
    } catch {
      // Ignore errors for subdirectories
    }
  }

  await fetchRecursive('', 0);
  return fileTree;
}

// Check if a file exists in the tree
function checkFileExists(fileTree: Map<string, GitHubFile>, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Check exact match
    if (fileTree.has(pattern)) {
      return true;
    }

    // Check if any file matches the pattern (for directories)
    for (const [path] of fileTree) {
      if (path === pattern || path.startsWith(pattern + '/')) {
        return true;
      }
    }
  }
  return false;
}

// Main GitHub scanning function
export async function scanGitHubRepo(
  repoUrl: string,
  token?: string
): Promise<ScanResult> {
  const parsed = parseGitHubUrl(repoUrl);

  if (!parsed) {
    throw new Error('Invalid GitHub URL. Use format: https://github.com/owner/repo or owner/repo');
  }

  const { owner, repo } = parsed;

  // Fetch repo info and file tree in parallel
  const [repoInfo, fileTree] = await Promise.all([
    fetchRepoInfo(owner, repo, token),
    buildFileTree(owner, repo, token, 2),
  ]);

  const tech_stacks: TechStack[] = [];
  const missing: string[] = [];
  const suggested_todos: SuggestedTodo[] = [];
  const detectedTechs = new Set<string>();

  // Detect tech stacks
  for (const detector of TECH_DETECTORS) {
    const file = fileTree.get(detector.file);
    if (file && !detectedTechs.has(detector.name)) {
      detectedTechs.add(detector.name);

      let version: string | undefined;
      if (detector.getVersion && file.download_url) {
        try {
          const content = await fetchFileContent(file.download_url, token);
          version = detector.getVersion(content);
        } catch {
          // Ignore fetch errors
        }
      }

      tech_stacks.push({
        name: detector.name,
        detected_by: detector.file,
        version,
      });
    }
  }

  // Check for React in package.json
  const packageJson = fileTree.get('package.json');
  if (packageJson && packageJson.download_url && !detectedTechs.has('React')) {
    try {
      const content = await fetchFileContent(packageJson.download_url, token);
      const pkg = JSON.parse(content);
      if (pkg.dependencies?.react || pkg.devDependencies?.react) {
        tech_stacks.push({
          name: 'React',
          detected_by: 'package.json',
          version: pkg.dependencies?.react || pkg.devDependencies?.react,
        });
      }
    } catch {
      // Ignore parse errors
    }
  }

  const isWebProject = tech_stacks.some((t) =>
    ['Next.js', 'React', 'Vue.js', 'Node.js'].includes(t.name)
  );

  // Run completeness checks
  for (const check of COMPLETENESS_CHECKS) {
    if (!checkFileExists(fileTree, check.files)) {
      missing.push(check.name);
      suggested_todos.push(check.missing_todo);
    }
  }

  // Run web-specific checks
  if (isWebProject) {
    for (const check of WEB_CHECKS) {
      if (!checkFileExists(fileTree, check.files)) {
        missing.push(check.name);
        suggested_todos.push(check.missing_todo);
      }
    }
  }

  return {
    path: `https://github.com/${owner}/${repo}`,
    name: repoInfo.name,
    tech_stacks,
    missing,
    suggested_todos,
    subprojects: [], // GitHub scanning doesn't support subprojects for now
  };
}

// Get project name from GitHub repo
export async function getGitHubProjectName(
  repoUrl: string,
  token?: string
): Promise<string> {
  const parsed = parseGitHubUrl(repoUrl);

  if (!parsed) {
    throw new Error('Invalid GitHub URL');
  }

  const repoInfo = await fetchRepoInfo(parsed.owner, parsed.repo, token);
  return repoInfo.name;
}
