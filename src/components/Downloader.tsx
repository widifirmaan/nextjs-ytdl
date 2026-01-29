
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, AlertCircle, Check, Loader2 } from 'lucide-react';

interface VideoFormat {
    itag: number;
    qualityLabel: string;
    container: string;
    hasAudio: boolean;
    hasVideo: boolean;
    url: string;
    contentLength?: string;
    mimeType?: string;
}

interface VideoDetails {
    title: string;
    thumbnail: string;
    lengthSeconds: string;
    author: string;
}

interface VideoInfo {
    videoDetails: VideoDetails;
    formats: VideoFormat[];
}

export default function Downloader() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<VideoInfo | null>(null);
    const [error, setError] = useState('');

    const fetchInfo = async () => {
        if (!url.trim()) return;
        setLoading(true);
        setError('');
        setData(null);

        try {
            const res = await fetch('/api/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Failed to fetch video info');
            }

            setData(json);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (title: string, itag: number, container: string) => {
        // build proxy url
        const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&itag=${itag}&title=${encodeURIComponent(title)}&container=${container}`;
        window.location.href = downloadUrl;
    };

    const formatBytes = (bytes?: string) => {
        if (!bytes) return 'N/A';
        const b = parseInt(bytes, 10);
        if (b === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-4 flex flex-col items-center gap-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-2"
            >
                <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 drop-shadow-sm">
                    Next.js YT Downloader
                </h1>
                <p className="text-gray-400 dark:text-gray-400">
                    Paste a YouTube link and download in highest quality.
                </p>
            </motion.div>

            {/* Input Section */}
            <motion.div
                className="w-full relative group"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-5 h-5" />
                </div>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full pl-12 pr-32 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-lg shadow-xl"
                />
                <button
                    onClick={fetchInfo}
                    disabled={loading || !url}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/25 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start'}
                </button>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result Section */}
            <AnimatePresence>
                {data && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                            {/* Thumbnail */}
                            <div className="w-full md:w-1/3 flex-shrink-0">
                                <div className="aspect-video rounded-xl overflow-hidden shadow-lg relative group">
                                    <img src={data.videoDetails.thumbnail} alt={data.videoDetails.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                                <div className="mt-4 text-center md:text-left">
                                    <p className="text-sm text-gray-400">Duration: {Math.floor(parseInt(data.videoDetails.lengthSeconds) / 60)}:{(parseInt(data.videoDetails.lengthSeconds) % 60).toString().padStart(2, '0')}</p>
                                    <p className="text-sm text-gray-400">Author: {data.videoDetails.author}</p>
                                </div>
                            </div>

                            {/* Info & Options */}
                            <div className="flex-1 space-y-6">
                                <h2 className="text-2xl font-bold line-clamp-2 leading-tight">{data.videoDetails.title}</h2>

                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Download Options</h3>
                                    <div className="grid gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                        {data.formats.map((fmt, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${fmt.hasVideo ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                                        {fmt.hasVideo ? (fmt.hasAudio ? 'MP4' : 'Video') : 'Audio'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{fmt.qualityLabel || 'Audio Only'}</span>
                                                        <span className="text-xs text-gray-500">{fmt.container} • {formatBytes(fmt.contentLength)}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownload(data.videoDetails.title, fmt.itag, fmt.container)}
                                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Download className="w-4 h-4" /> Download
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
