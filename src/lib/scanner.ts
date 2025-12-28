import fs from 'fs';
import path from 'path';

export interface TechStack {
  name: string;
  detected_by: string;
  version?: string;
}

export interface ScanResult {
  path: string;
  name: string;
  tech_stacks: TechStack[];
  missing: string[];
  suggested_todos: SuggestedTodo[];
  subprojects: ScanResult[];
}

export interface SuggestedTodo {
  title: string;
  description: string;
  tags: string[];
  priority: number; // 0-3
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
  {
    name: 'Flutter/Dart',
    file: 'pubspec.yaml',
  },
  {
    name: 'Rust',
    file: 'Cargo.toml',
  },
  {
    name: 'Python',
    file: 'requirements.txt',
  },
  {
    name: 'Python',
    file: 'pyproject.toml',
  },
  {
    name: 'Go',
    file: 'go.mod',
  },
  {
    name: 'Next.js',
    file: 'next.config.js',
  },
  {
    name: 'Next.js',
    file: 'next.config.ts',
  },
  {
    name: 'Next.js',
    file: 'next.config.mjs',
  },
  {
    name: 'React',
    file: 'package.json',
    getVersion: (content) => {
      try {
        const pkg = JSON.parse(content);
        return pkg.dependencies?.react || pkg.devDependencies?.react;
      } catch {
        return undefined;
      }
    },
  },
  {
    name: 'Vue.js',
    file: 'vue.config.js',
  },
  {
    name: 'Docker',
    file: 'Dockerfile',
  },
  {
    name: 'Docker Compose',
    file: 'docker-compose.yml',
  },
  {
    name: 'Docker Compose',
    file: 'docker-compose.yaml',
  },
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
    files: ['test/', 'tests/', 'spec/', '__tests__/', '*.test.js', '*.spec.js', '*.test.ts', '*.spec.ts'],
    missing_todo: {
      title: 'Add test coverage',
      description: 'Set up testing framework and add unit/integration tests.',
      tags: ['dev'],
      priority: 2,
    },
  },
  {
    name: 'CI/CD',
    files: ['.github/workflows/', '.gitlab-ci.yml', 'Jenkinsfile', '.circleci/', 'azure-pipelines.yml'],
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

// Web project specific checks
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

function checkFileExists(basePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const fullPath = path.join(basePath, pattern);

    // Handle directory patterns (ending with /)
    if (pattern.endsWith('/')) {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        return true;
      }
    }
    // Handle glob patterns (containing *)
    else if (pattern.includes('*')) {
      const dir = path.dirname(fullPath);
      const filePattern = path.basename(pattern);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const regex = new RegExp('^' + filePattern.replace(/\*/g, '.*') + '$');
        if (files.some((f) => regex.test(f))) {
          return true;
        }
      }
    }
    // Regular file
    else {
      if (fs.existsSync(fullPath)) {
        return true;
      }
    }
  }
  return false;
}

export function scanProject(projectPath: string, maxDepth: number = 1): ScanResult {
  const absPath = path.resolve(projectPath);
  const projectName = path.basename(absPath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Path does not exist: ${absPath}`);
  }

  const stats = fs.statSync(absPath);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${absPath}`);
  }

  const tech_stacks: TechStack[] = [];
  const missing: string[] = [];
  const suggested_todos: SuggestedTodo[] = [];
  const subprojects: ScanResult[] = [];

  // Detect tech stacks
  const detectedTechs = new Set<string>();
  for (const detector of TECH_DETECTORS) {
    const filePath = path.join(absPath, detector.file);
    if (fs.existsSync(filePath)) {
      if (!detectedTechs.has(detector.name)) {
        detectedTechs.add(detector.name);
        let version: string | undefined;
        if (detector.getVersion) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            version = detector.getVersion(content);
          } catch {
            // Ignore read errors
          }
        }
        tech_stacks.push({
          name: detector.name,
          detected_by: detector.file,
          version,
        });
      }
    }
  }

  // Check for React in package.json specifically
  const packageJsonPath = path.join(absPath, 'package.json');
  if (fs.existsSync(packageJsonPath) && !detectedTechs.has('React')) {
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
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
    if (!checkFileExists(absPath, check.files)) {
      missing.push(check.name);
      suggested_todos.push(check.missing_todo);
    }
  }

  // Run web-specific checks for web projects
  if (isWebProject) {
    for (const check of WEB_CHECKS) {
      if (!checkFileExists(absPath, check.files)) {
        missing.push(check.name);
        suggested_todos.push(check.missing_todo);
      }
    }
  }

  // Scan for subprojects (one level deep by default)
  if (maxDepth > 0) {
    const entries = fs.readdirSync(absPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('node_modules')) {
        const subPath = path.join(absPath, entry.name);

        // Check if it looks like a project (has a config file)
        const hasProjectFile = TECH_DETECTORS.some((d) =>
          fs.existsSync(path.join(subPath, d.file))
        );

        if (hasProjectFile) {
          try {
            const subResult = scanProject(subPath, maxDepth - 1);
            subprojects.push(subResult);
          } catch {
            // Skip subprojects that fail to scan
          }
        }
      }
    }
  }

  return {
    path: absPath,
    name: projectName,
    tech_stacks,
    missing,
    suggested_todos,
    subprojects,
  };
}

export function getProjectName(projectPath: string): string {
  const absPath = path.resolve(projectPath);

  // Try to get name from package.json
  const packageJsonPath = path.join(absPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (pkg.name) return pkg.name;
    } catch {
      // Ignore parse errors
    }
  }

  // Try to get name from pubspec.yaml
  const pubspecPath = path.join(absPath, 'pubspec.yaml');
  if (fs.existsSync(pubspecPath)) {
    try {
      const content = fs.readFileSync(pubspecPath, 'utf-8');
      const match = content.match(/^name:\s*(.+)$/m);
      if (match) return match[1].trim();
    } catch {
      // Ignore read errors
    }
  }

  // Fall back to directory name
  return path.basename(absPath);
}
