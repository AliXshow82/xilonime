window.XILONIME_CATALOG = (() => {
  const CACHE_KEY = 'xiloAnimeVault.catalogSearch.v1';
  const TTL = 7 * 24 * 60 * 60 * 1000;
  const MAX_CACHE_KEYS = 80;
  const ENDPOINT = 'https://graphql.anilist.co';
  const DEFAULT_API_BASE = location.protocol.startsWith('http') ? `${location.origin}/api` : 'https://xilonime.ir/api';

  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english native }
          coverImage { large medium color }
          episodes
          status
          seasonYear
          genres
          averageScore
          description(asHtml: false)
        }
      }
    }
  `;

  function readCache() {
    try {
      const value = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  }

  function writeCache(cache) {
    const keys = Object.keys(cache).sort((a, b) => (cache[b].updatedAt || 0) - (cache[a].updatedAt || 0));
    const trimmed = {};
    keys.slice(0, MAX_CACHE_KEYS).forEach(key => { trimmed[key] = cache[key]; });
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  }

  function cleanText(value, max = 500) {
    return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function normalize(item) {
    const title = item.title || {};
    return {
      provider: 'anilist',
      id: String(item.id),
      title: cleanText(title.native || title.romaji || title.english, 160),
      titleEn: cleanText(title.english || title.romaji || title.native, 160),
      titleRomaji: cleanText(title.romaji || title.english || title.native, 160),
      year: Number(item.seasonYear) || 0,
      status: cleanText(item.status, 40),
      episodes: Number(item.episodes) || 0,
      genres: Array.isArray(item.genres) ? item.genres.map(g => cleanText(g, 40)).filter(Boolean).slice(0, 8) : [],
      score: Number(item.averageScore) || 0,
      cover: item.coverImage?.large || item.coverImage?.medium || '',
      color: item.coverImage?.color || '',
      description: cleanText(item.description, 700)
    };
  }

  function getApiBase() {
    return String(localStorage.getItem('xiloAnimeVault.apiBase') || DEFAULT_API_BASE).replace(/\/+$/, '');
  }

  async function searchOwnApi(key) {
    const response = await fetch(getApiBase() + '/anime/search?q=' + encodeURIComponent(key), {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error('Xilonime API search failed');
    const payload = await response.json();
    return (payload.items || []).map(item => ({
      provider: item.provider || 'xilonime',
      id: String(item.id || item.anilistId || item.malId || ''),
      title: cleanText(item.titleNative || item.titleRomaji || item.titleEnglish, 160),
      titleEn: cleanText(item.titleEnglish || item.titleRomaji || item.titleNative, 160),
      titleRomaji: cleanText(item.titleRomaji || item.titleEnglish || item.titleNative, 160),
      year: Number(item.year) || 0,
      status: cleanText(item.status, 40),
      episodes: Number(item.episodes) || 0,
      genres: Array.isArray(item.genres) ? item.genres.map(g => cleanText(g, 40)).filter(Boolean).slice(0, 8) : [],
      score: Number(item.score) || 0,
      cover: item.coverUrl || '',
      color: item.color || '',
      description: cleanText(item.description, 700)
    })).filter(item => item.id);
  }

  async function searchAniList(key) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { search: key, page: 1, perPage: 8 } })
    });

    if (!response.ok) throw new Error('AniList search failed');
    const payload = await response.json();
    return (payload?.data?.Page?.media || []).map(normalize);
  }

  async function search(searchText, { force = false } = {}) {
    const key = String(searchText || '').trim().toLowerCase();
    if (key.length < 3) return { items: [], cached: false };

    const cache = readCache();
    const cached = cache[key];
    if (!force && cached && Date.now() - cached.updatedAt < TTL) {
      return { items: cached.items || [], cached: true };
    }

    let items = [];
    let source = 'api';
    try {
      items = await searchOwnApi(key);
    } catch {
      source = 'anilist';
      items = await searchAniList(key);
    }
    cache[key] = { updatedAt: Date.now(), items };
    writeCache(cache);
    return { items, cached: false, source };
  }

  function clearCache() {
    localStorage.removeItem(CACHE_KEY);
  }

  return { search, clearCache };
})();
