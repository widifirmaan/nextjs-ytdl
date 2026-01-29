
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const itag = searchParams.get('itag');
    const title = searchParams.get('title') || 'video';

    if (!url || !itag) {
        return NextResponse.json({ error: 'Missing url or itag' }, { status: 400 });
    }

    try {
        // Validate URL
        if (!ytdl.validateURL(url)) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        // Get info to verify itag (optional but good for safety)
        // For speed, strict validation might be skipped, but catch errors.

        const headers = new Headers();
        // sanitize title
        const filename = title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        // Determine extension? We can guess from itag or just use mp4/mp3
        // But checking itag would require getInfo. Let's assume mp4 or try to detect from the stream? 
        // Usually browser handles content-type.

        // Let's get generic stream first
        const videoStream = ytdl(url, { filter: (format) => format.itag === Number(itag) });

        // We can't easily know the content-length without getInfo, but ytdl might emit it.
        // For now, chunked transfer encoding is fine.

        headers.set('Content-Disposition', `attachment; filename="${filename}.mp4"`);
        // Note: If only audio, we might want .mp3, but ytdl usually returns a container. 
        // The previous info route can pass the extension.

        // Let's allow passing extension/container in params
        const container = searchParams.get('container') || 'mp4';
        headers.set('Content-Disposition', `attachment; filename="${filename}.${container}"`);


        // @ts-ignore - ReadableStream type mismatch with Node stream but it often works in Next.js
        // Actually we need to convert Node stream to Web ReadableStream for NextResponse
        // or use `iteratorToStream`

        // Simplest way to convert node stream to web stream:
        const stream = new ReadableStream({
            start(controller) {
                videoStream.on('data', (chunk) => controller.enqueue(chunk));
                videoStream.on('end', () => controller.close());
                videoStream.on('error', (err) => controller.error(err));
            }
        });

        return new NextResponse(stream, { headers });

    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
