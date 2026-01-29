import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const CACHE_DIR = path.join(process.cwd(), '.cache');

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const itag = searchParams.get('itag');
    const title = searchParams.get('title') || 'video';
    const container = searchParams.get('container') || 'mp4';

    if (!url || !itag) {
        return NextResponse.json({ error: 'Missing url or itag' }, { status: 400 });
    }

    try {
        if (!ytdl.validateURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        const videoID = ytdl.getVideoID(url);
        let downloadUrl = '';

        // 1. Try to get direct URL from cache first
        try {
            const cacheFile = path.join(CACHE_DIR, `${videoID}.json`);
            const cachedData = await fs.readFile(cacheFile, 'utf-8');
            const data = JSON.parse(cachedData);
            const format = data.formats.find((f: any) => String(f.itag) === String(itag));
            if (format && format.url) {
                downloadUrl = format.url;
            }
        } catch (e) {
            // Cache miss or invalid
        }

        // 2. If not in cache, fetch fresh info
        if (!downloadUrl) {
            const info = await ytdl.getInfo(url);
            const format = info.formats.find((f) => String(f.itag) === String(itag));
            if (format && format.url) {
                downloadUrl = format.url;
            }
        }

        if (!downloadUrl) {
            console.error('Format not found for itag:', itag);
            return NextResponse.json({ error: 'Format not found' }, { status: 404 });
        }

        console.log('Fetching upstream:', downloadUrl);

        const requestHeaders = new Headers();
        requestHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        requestHeaders.set('Referer', 'https://www.youtube.com/');

        const range = request.headers.get('range');
        if (range) {
            requestHeaders.set('Range', range);
        }

        // 3. Stream the content
        const upstreamResponse = await fetch(downloadUrl, {
            headers: requestHeaders
        });

        if (!upstreamResponse.ok) {
            console.error('Upstream fetch failed:', upstreamResponse.status, upstreamResponse.statusText);
            const text = await upstreamResponse.text();
            console.error('Upstream body:', text);
            return NextResponse.json({ error: 'Failed to fetch video stream' }, { status: 502 });
        }

        const filename = title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);

        const headers = new Headers();
        headers.set('Content-Disposition', `attachment; filename="${filename}.${container}"`);
        headers.set('Content-Length', upstreamResponse.headers.get('content-length') || '');
        headers.set('Content-Type', upstreamResponse.headers.get('content-type') || 'application/octet-stream');

        return new NextResponse(upstreamResponse.body, { headers });

    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
