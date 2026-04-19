import type { ParserPlugin, Email, MatchedPlugin } from './types';

export class ParserRegistry {
  private plugins: ParserPlugin[] = [];

  register(plugin: ParserPlugin): this {
    this.plugins.push(plugin);
    return this;
  }

  findBestMatcher(email: Email): MatchedPlugin | null {
    const matched = this.plugins
      .map(plugin => ({ plugin, score: this.scorePlugin(plugin, email) }))
      .filter(m => m.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.plugin.priority !== a.plugin.priority) return b.plugin.priority - a.plugin.priority;
        return compareVersions(b.plugin.version, a.plugin.version);
      });

    if (matched.length === 0) return null;

    return {
      plugin: matched[0].plugin,
      score: matched[0].score,
    };
  }

  private scorePlugin(plugin: ParserPlugin, email: Email): number {
    let score = 0;
    const emailFrom = email.from.toLowerCase();
    const emailSubject = email.subject.toLowerCase();

    for (const pattern of plugin.match.from_patterns) {
      const patternLower = pattern.toLowerCase();

      if (patternLower === emailFrom) {
        score += 15;
      } else if (patternLower.includes('@')) {
        if (patternLower.startsWith('*')) {
          const domain = patternLower.slice(1);
          if (emailFrom.endsWith(domain)) {
            score += 10;
          }
        } else if (emailFrom.endsWith(patternLower)) {
          score += 10;
        }
      } else if (patternLower.includes('*')) {
        score += 5;
      }
    }

    for (const pattern of plugin.match.subject_patterns || []) {
      const patternClean = pattern.toLowerCase().replace(/\*/g, '');
      if (patternClean && emailSubject === patternClean) {
        score += 5;
      } else if (patternClean && emailSubject.includes(patternClean)) {
        score += 2;
      }
    }

    if (plugin.match.from_patterns.length > 3) {
      score -= 2;
    }

    return score;
  }

  getPlugins(): ParserPlugin[] {
    return [...this.plugins];
  }

  getById(id: string): ParserPlugin | undefined {
    return this.plugins.find(p => p.id === id);
  }
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}
