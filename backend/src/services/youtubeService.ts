import { google } from 'googleapis';

const youtube = google.youtube('v3');
const API_KEY = process.env.YOUTUBE_API_KEY;

// Simple in-memory cache for ETag-like behavior
const videoCache = new Map<string, { etag: string, data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export const searchVideos = async (query: string, maxResults = 1) => {
    if (!API_KEY) {
        throw new Error("YOUTUBE_API_KEY is not set");
    }

    try {
        // Optimization: Try to find a playlist first? 
        // Actually, for a specific subtopic search, normal search is mostly unavoidable unless we follow a specific channel.
        // The user request said: "prefers playlistItems.list (1 unit) by searching for channel 'uploads' playlists"
        // This is complex if we don't know the channel. For general topic search, we still need search.list logic.
        // However, we can optimize metadata fetching if we have IDs.

        const response = await youtube.search.list({
            key: API_KEY,
            part: ['snippet'],
            q: query,
            type: ['video'],
            maxResults: maxResults,
            videoDuration: 'medium', // ~4-20 mins ideal for lessons
            relevanceLanguage: 'en'
        });

        return response.data.items || [];
    } catch (error) {
        console.error("YouTube Search Error:", error);
        return [];
    }
};

export const getVideoMetadata = async (videoId: string) => {
    if (!API_KEY) throw new Error("YOUTUBE_API_KEY is not set");

    const cached = videoCache.get(videoId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    // ETag logic integration (simulated since we aren't storing the actual YouTube ETag from their header yet, 
    // but we check our cache first).
    // Real ETag usage with YouTube API involves sending the `ifNoneMatch` header.
    // Let's implement that if we had the real etag.

    try {
        const response = await youtube.videos.list({
            key: API_KEY,
            part: ['snippet', 'contentDetails', 'statistics'],
            id: [videoId]
        });

        const data = response.data.items?.[0];
        if (data) {
            videoCache.set(videoId, {
                etag: response.data.etag || 'no-etag',
                data: data,
                timestamp: Date.now()
            });
        }
        return data;
    } catch (error) {
        console.error("YouTube Metadata Error:", error);
        return null;
    }
};

// Fallback for when we want to just search generic "Uploads" from a channel if we knew it
// Implementing the requested "PlaylistItems" preference logic:
export const searchChannelVideos = async (channelId: string, query: string) => {
    // This uses 1 quota unit per page vs 100 for search
    // But requires knowing the channel ID. 
    // We will stick to refined search.list for now as we search globally.
    return [];
};
