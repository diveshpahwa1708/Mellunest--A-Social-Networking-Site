'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, LoaderCircle } from 'lucide-react';

const timeLabel = (seconds: number) => {
    const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
    return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
};

export function VideoPlayer({ src }: { src: string }) {
    const video = useRef<HTMLVideoElement>(null);
    const shell = useRef<HTMLDivElement>(null);
    const [playing, setPlaying] = useState(false);
    const [ended, setEnded] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [rate, setRate] = useState(1);
    const [fullscreen, setFullscreen] = useState(false);
    const [error, setError] = useState('');
    const [fullscreenSupported, setFullscreenSupported] = useState(false);

    useEffect(() => {
        const v = video.current;
        setFullscreenSupported(!!shell.current?.requestFullscreen || !!(v as any)?.webkitEnterFullscreen);
        const changed = () => setFullscreen(document.fullscreenElement === shell.current);
        const pauseOther = (event: Event) => {
            if ((event as CustomEvent).detail !== v) v?.pause();
        };
        document.addEventListener('fullscreenchange', changed);
        window.addEventListener('mellunest-video-play', pauseOther);
        return () => {
            v?.pause();
            document.removeEventListener('fullscreenchange', changed);
            window.removeEventListener('mellunest-video-play', pauseOther);
        };
    }, []);

    const togglePlay = async () => {
        const v = video.current;
        if (!v) return;
        if (!v.paused) { v.pause(); return; }
        setError('');
        setWaiting(true);
        if (v.error) v.load();
        if (v.ended) v.currentTime = 0;
        try { await v.play(); }
        catch { setWaiting(false); setError('Could not play this video. Try again.'); }
    };
    const seek = (value: number) => {
        const v = video.current;
        if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
        v.currentTime = Math.max(0, Math.min(value, v.duration));
        setPosition(v.currentTime);
    };
    const toggleMute = () => {
        const v = video.current;
        if (!v) return;
        if (v.volume === 0) { v.volume = 0.5; v.muted = false; }
        else v.muted = !v.muted;
    };
    const toggleFullscreen = async () => {
        try {
            if (document.fullscreenElement === shell.current) await document.exitFullscreen();
            else if (shell.current?.requestFullscreen) await shell.current.requestFullscreen();
            else (video.current as any)?.webkitEnterFullscreen?.();
        } catch { setError('Fullscreen is unavailable in this browser.'); }
    };
    const metadata = () => {
        const value = video.current?.duration || 0;
        setDuration(Number.isFinite(value) ? value : 0);
    };
    const progress = duration ? Math.min(100, position / duration * 100) : 0;
    return <div className="mn-player" ref={shell} tabIndex={0} role="region" aria-label="Video player"
        onKeyDown={e => {
            if (e.target !== e.currentTarget) return;
            if (e.key === ' ' || e.key.toLowerCase() === 'k') { e.preventDefault(); void togglePlay(); }
            else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); seek((video.current?.currentTime || 0) + (e.key === 'ArrowRight' ? 5 : -5)); }
            else if (e.key.toLowerCase() === 'm') { e.preventDefault(); toggleMute(); }
            else if (e.key.toLowerCase() === 'f') { e.preventDefault(); void toggleFullscreen(); }
        }}>
        <div className="mn-player-stage">
            <video ref={video} src={src} playsInline preload="none"
                onClick={() => void togglePlay()}
                onLoadedMetadata={metadata} onDurationChange={metadata}
                onTimeUpdate={() => setPosition(video.current?.currentTime || 0)}
                onProgress={() => {
                    const v = video.current;
                    if (v && v.buffered.length && Number.isFinite(v.duration) && v.duration > 0)
                        setBuffered(Math.min(100, v.buffered.end(v.buffered.length - 1) / v.duration * 100));
                }}
                onPlay={() => { setPlaying(true); setEnded(false); window.dispatchEvent(new CustomEvent('mellunest-video-play', { detail: video.current })); }}
                onPlaying={() => setWaiting(false)}
                onPause={() => { setPlaying(false); setWaiting(false); }}
                onEnded={() => { setPlaying(false); setEnded(true); setWaiting(false); }}
                onWaiting={() => setWaiting(true)} onCanPlay={() => setWaiting(false)}
                onVolumeChange={() => { setVolume(video.current?.volume ?? 1); setMuted(video.current?.muted ?? false); }}
                onRateChange={() => setRate(video.current?.playbackRate || 1)}
                onError={() => { setWaiting(false); setPlaying(false); setError('This video could not load. Check your connection and retry.'); }}
            />
            <span className="mn-player-badge"><span /> A MELLUNEST MOMENT</span>
            {!playing && !waiting && <button type="button" className="mn-player-big-play" aria-label={ended ? 'Replay video' : 'Play video'} onClick={() => void togglePlay()}>
                {ended ? <RotateCcw size={28}/> : <Play size={30} fill="currentColor"/>}
            </button>}
            {waiting && <span className="mn-player-loading" role="status"><LoaderCircle className="spin" size={28}/><span className="mn-player-sr">Buffering video</span></span>}
            {error && <div className="mn-player-error" role="alert">{error}<button type="button" onClick={() => void togglePlay()}>Retry</button></div>}
        </div>
        <div className="mn-player-controls">
            <div className="mn-player-seek" style={{ '--mn-progress': progress + '%', '--mn-buffered': buffered + '%' } as React.CSSProperties}>
                <input type="range" aria-label="Seek video" aria-valuetext={timeLabel(position) + ' of ' + timeLabel(duration)}
                    min={0} max={duration || 1} step={0.1} value={Math.min(position, duration || 0)} disabled={!duration}
                    onChange={e => seek(Number(e.target.value))}/>
            </div>
            <div className="mn-player-toolbar">
                <button type="button" className="mn-player-action mn-player-play" aria-label={playing ? 'Pause video' : ended ? 'Replay video' : 'Play video'} onClick={() => void togglePlay()}>
                    {playing ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
                </button>
                <span className="mn-player-time">{timeLabel(position)} <span>/ {duration ? timeLabel(duration) : '–:––'}</span></span>
                <div className="mn-player-volume">
                    <button type="button" className="mn-player-action" aria-label={muted || volume === 0 ? 'Unmute video' : 'Mute video'} onClick={toggleMute}>
                        {muted || volume === 0 ? <VolumeX size={19}/> : <Volume2 size={19}/>}
                    </button>
                    <input type="range" aria-label="Volume" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                        onChange={e => { if (video.current) { video.current.volume = Number(e.target.value); video.current.muted = false; } }}/>
                </div>
                <select className="mn-player-speed" aria-label="Playback speed" value={rate} onChange={e => { if (video.current) video.current.playbackRate = Number(e.target.value); }}>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}
                </select>
                {fullscreenSupported && <button type="button" className="mn-player-action" aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={() => void toggleFullscreen()}>
                    {fullscreen ? <Minimize size={19}/> : <Maximize size={19}/>}
                </button>}
            </div>
        </div>
    </div>;
}
