
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs'; // Enforce Node.js runtime

const CACHE_DIR = path.join(process.cwd(), '.cache');
const LINK_EXPIRATION_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_LIFETIME_MS = 24 * 60 * 60 * 1000; // 1 day

async function ensureCacheDir() {
    try {
        await fs.access(CACHE_DIR);
    } catch {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    }
}

async function cleanOldCache() {
    try {
        const files = await fs.readdir(CACHE_DIR);
        const now = Date.now();
        for (const file of files) {
            const filePath = path.join(CACHE_DIR, file);
            const stats = await fs.stat(filePath);
            if (now - stats.mtimeMs > CACHE_LIFETIME_MS) {
                await fs.unlink(filePath).catch(() => { });
            }
        }
    } catch (e) {
        console.error('Cache cleanup error:', e);
    }
}

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!ytdl.validateURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        const videoID = ytdl.getVideoID(url);
        const cacheFile = path.join(CACHE_DIR, `${videoID}.json`);

        await ensureCacheDir();

        // Trigger cleanup in background (fire and forget)
        cleanOldCache();

        // Check cache
        try {
            const stats = await fs.stat(cacheFile);
            const now = Date.now();

            // If cache exists and is fresh enough for links to work (< 6 hours)
            if (now - stats.mtimeMs < LINK_EXPIRATION_MS) {
                const cachedData = await fs.readFile(cacheFile, 'utf-8');
                return NextResponse.json(JSON.parse(cachedData));
            }
        } catch (e) {
            // Cache miss or error, proceed to fetch
        }

        const info = await ytdl.getInfo(url);

        // Filter formats (e.g., mp4, audio)
        const formats = info.formats
            .filter((format) => format.container === 'mp4' || format.hasAudio)
            .map((format) => ({
                itag: format.itag,
                qualityLabel: format.qualityLabel,
                container: format.container,
                hasAudio: format.hasAudio,
                hasVideo: format.hasVideo,
                url: format.url, // Note: might be IP restricted
                contentLength: format.contentLength,
                mimeType: format.mimeType,
            }));

        // Sort formats: Video+Audio best -> Video only -> Audio only
        formats.sort((a, b) => {
            const aRes = parseInt(a.qualityLabel || '0');
            const bRes = parseInt(b.qualityLabel || '0');
            return bRes - aRes;
        });

        const videoDetails = {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails.pop()?.url, // Highest quality usually last
            lengthSeconds: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name,
        };

        const responseData = { videoDetails, formats };

        // Save to cache
        await fs.writeFile(cacheFile, JSON.stringify(responseData));

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Error fetching video info:', error);
        return NextResponse.json({ error: 'Failed to fetch video info' }, { status: 500 });
    }
}
