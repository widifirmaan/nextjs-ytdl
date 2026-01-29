
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export const runtime = 'nodejs'; // Enforce Node.js runtime

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!ytdl.validateURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
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

        return NextResponse.json({ videoDetails, formats });
    } catch (error) {
        console.error('Error fetching video info:', error);
        return NextResponse.json({ error: 'Failed to fetch video info' }, { status: 500 });
    }
}
