import { upsertAnime } from './store.js';
import { fileURLToPath } from 'node:url';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const JIKAN_TOP_ENDPOINT = 'https://api.jikan.moe/v4/top/anime';
const LIMIT = Math.max(1, Math.min(500, Number.parseInt(process.env.XILONIME_SYNC_LIMIT || '80', 10)));

const query = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: POPULARITY_DESC) {
        id
        idMal
        title { romaji english native }
        coverImage { large color }
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

function clean(value, max = 700) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalize(item) {
  return {
    id: String(item.id),
    anilistId: item.id,
    malId: item.idMal || null,
    titleRomaji: clean(item.title?.romaji, 160),
    titleEnglish: clean(item.title?.english, 160),
    titleNative: clean(item.title?.native, 160),
    year: Number(item.seasonYear) || 0,
    status: clean(item.status, 40),
    episodes: Number(item.episodes) || 0,
    coverUrl: item.coverImage?.large || '',
    color: item.coverImage?.color || '',
    genres: Array.isArray(item.genres) ? item.genres.slice(0, 10) : [],
    score: Number(item.averageScore) || 0,
    description: clean(item.description)
  };
}

export async function syncPopularAnime() {
  const perPage = Math.min(50, LIMIT);
  const pages = Math.ceil(LIMIT / perPage);
  const items = [];

  try {
    for (let page = 1; page <= pages; page += 1) {
      const response = await fetch(ANILIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables: { page, perPage } })
      });
      if (!response.ok) throw new Error(`AniList sync failed: ${response.status}`);
      const payload = await response.json();
      items.push(...(payload?.data?.Page?.media || []).map(normalize));
      await new Promise(resolve => setTimeout(resolve, 850));
    }
  } catch (error) {
    console.warn(`${error.message}. Falling back to Jikan.`);
    for (let page = 1; page <= pages; page += 1) {
      const response = await fetch(`${JIKAN_TOP_ENDPOINT}?page=${page}&limit=${perPage}`);
      if (!response.ok) throw new Error(`Jikan sync failed: ${response.status}`);
      const payload = await response.json();
      items.push(...(payload?.data || []).map(item => ({
        id: String(item.mal_id),
        anilistId: null,
        malId: item.mal_id,
        titleRomaji: clean(item.title, 160),
        titleEnglish: clean(item.title_english || item.title, 160),
        titleNative: clean(item.title_japanese, 160),
        year: Number(item.year) || 0,
        status: clean(item.status, 40),
        episodes: Number(item.episodes) || 0,
        coverUrl: item.images?.jpg?.large_image_url || item.images?.webp?.large_image_url || '',
        color: '',
        genres: Array.isArray(item.genres) ? item.genres.map(genre => genre.name).slice(0, 10) : [],
        score: Math.round(Number(item.score) * 10) || 0,
        description: clean(item.synopsis)
      })));
      await new Promise(resolve => setTimeout(resolve, 850));
    }
  }

  return upsertAnime(items.slice(0, LIMIT));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  syncPopularAnime()
    .then(count => {
      console.log(`Xilonime anime database synced. Total records: ${count}`);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
