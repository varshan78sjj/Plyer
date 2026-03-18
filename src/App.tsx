
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ListMusic, Repeat, Shuffle, Repeat1, Upload, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseBlob } from 'music-metadata';

interface Song {
  id: string;
  title: string;
  artist: string;
  src: string;
  cover: string;
}

const DEFAULT_COVER = 'https://69bac67ae0476b59e5d52082.imgix.net/Player%20logo.png';

export default function App() {
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newSongsPromises = Array.from(files).map(async (file) => {
      try {
        const metadata = await parseBlob(file);
        let coverUrl = DEFAULT_COVER;
        const picture = metadata.common.picture?.[0];
        
        if (picture) {
          const blob = new Blob([picture.data], { type: picture.format });
          coverUrl = URL.createObjectURL(blob);
        }

        return {
          id: Math.random().toString(36).substring(7),
          title: metadata.common.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: metadata.common.artist || 'Local File',
          src: URL.createObjectURL(file),
          cover: coverUrl,
        };
      } catch (error) {
        console.error('Error parsing metadata:', error);
        return {
          id: Math.random().toString(36).substring(7),
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Local File',
          src: URL.createObjectURL(file),
          cover: DEFAULT_COVER,
        };
      }
    });

    const newSongs = await Promise.all(newSongsPromises);

    setPlaylist((prev) => {
      const updated = [...prev, ...newSongs];
      if (prev.length === 0 && newSongs.length > 0) {
        setCurrentSongIndex(0);
        setIsPlaying(true);
      }
      return updated;
    });
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        handleNext();
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSongIndex, repeatMode, isShuffle, playlist.length]);

  useEffect(() => {
    if (isPlaying && playlist.length > 0) {
      audioRef.current?.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying, currentSongIndex, playlist.length]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleNext = () => {
    if (playlist.length === 0) return;
    if (isShuffle) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } while (nextIndex === currentSongIndex && playlist.length > 1);
      setCurrentSongIndex(nextIndex);
    } else {
      setCurrentSongIndex((prev) => (prev + 1) % playlist.length);
    }
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    if (progress > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
    } else {
      setCurrentSongIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
      setIsPlaying(true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || playlist.length === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pos * duration;
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeBarRef.current) return;
    const rect = volumeBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(pos);
    if (pos > 0) setIsMuted(false);
  };

  if (playlist.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0502] text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#1a0f0a] to-[#0a0502]" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl text-center"
        >
          <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ListMusic size={40} className="text-white/50" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Music Found</h2>
          <p className="text-white/60 mb-8">Upload some audio files to start listening.</p>
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 bg-[#ff4e00] hover:bg-[#ff6a2b] text-white px-6 py-3 rounded-full font-medium transition-colors shadow-lg shadow-[#ff4e00]/20">
            <Upload size={20} />
            <span>Upload Songs</span>
            <input type="file" accept="audio/*" multiple className="hidden" onChange={handleFileUpload} />
          </label>
        </motion.div>
      </div>
    );
  }

  const currentSong = playlist[currentSongIndex];

  return (
    <div className="min-h-screen bg-[#0a0502] text-white flex items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Background */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-40"
        animate={{
          backgroundImage: `url(${currentSong.cover})`,
        }}
        transition={{ duration: 1 }}
        style={{
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(60px) brightness(0.5)',
          transform: 'scale(1.1)'
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#0a0502]/80 to-[#0a0502]" />

      {/* Player Container */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row gap-8 items-center md:items-stretch justify-center">
        
        {/* Player Chrome */}
        <motion.div 
          layout
          className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex-shrink-0"
        >
          {/* Cover Art */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-8 shadow-2xl bg-black/20">
            <motion.img 
              key={currentSong.id}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: isPlaying ? 1.05 : 1 }}
              transition={{ duration: 0.7 }}
              src={currentSong.cover} 
              alt="Cover Art" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Info */}
          <div className="mb-8 flex justify-between items-end">
            <div className="min-w-0 pr-4">
              <motion.h2 
                key={`title-${currentSong.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold tracking-tight mb-1 truncate"
              >
                {currentSong.title}
              </motion.h2>
              <motion.p 
                key={`artist-${currentSong.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-white/60 font-medium truncate"
              >
                {currentSong.artist}
              </motion.p>
            </div>
            <button 
              onClick={() => setShowPlaylist(!showPlaylist)}
              className={`p-3 rounded-full transition-colors shrink-0 ${showPlaylist ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
            >
              <ListMusic size={20} />
            </button>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div 
              ref={progressBarRef}
              onClick={handleProgressClick}
              className="h-1.5 bg-white/10 rounded-full cursor-pointer relative group py-2 -my-2"
            >
              <div className="absolute top-2 left-0 h-1.5 bg-white/20 w-full rounded-full pointer-events-none" />
              <div 
                className="absolute top-2 left-0 h-1.5 bg-gradient-to-r from-white/80 to-white rounded-full pointer-events-none"
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1/2" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-white/50 mt-2 font-mono tracking-wider">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2 transition-colors ${isShuffle ? 'text-[#ff4e00]' : 'text-white/40 hover:text-white'}`}
            >
              <Shuffle size={20} />
            </button>
            
            <div className="flex items-center gap-4 md:gap-6">
              <button onClick={handlePrev} className="p-2 text-white/70 hover:text-white transition-colors">
                <SkipBack size={28} fill="currentColor" />
              </button>
              
              <button 
                onClick={togglePlay} 
                className="w-16 h-16 md:w-18 md:h-18 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
              >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </button>
              
              <button onClick={handleNext} className="p-2 text-white/70 hover:text-white transition-colors">
                <SkipForward size={28} fill="currentColor" />
              </button>
            </div>

            <button 
              onClick={() => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')}
              className={`p-2 transition-colors ${repeatMode !== 'off' ? 'text-[#ff4e00]' : 'text-white/40 hover:text-white'}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 px-2">
            <button onClick={() => setIsMuted(!isMuted)} className="text-white/50 hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div 
              ref={volumeBarRef}
              onClick={handleVolumeClick}
              className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer relative group py-2 -my-2"
            >
              <div className="absolute top-2 left-0 h-1.5 bg-white/20 w-full rounded-full pointer-events-none" />
              <div 
                className="absolute top-2 left-0 h-1.5 bg-white/80 rounded-full pointer-events-none"
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1/2" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Playlist Sidebar */}
        <AnimatePresence>
          {showPlaylist && (
            <motion.div 
              initial={{ opacity: 0, x: -20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 'auto' }}
              exit={{ opacity: 0, x: -20, width: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full md:w-80 overflow-hidden shrink-0"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 h-[500px] md:h-full flex flex-col">
                <div className="flex items-center justify-between mb-6 px-2">
                  <h3 className="text-lg font-semibold tracking-wide">Up Next</h3>
                  <label className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white" title="Add more songs">
                    <Plus size={18} />
                    <input type="file" accept="audio/*" multiple className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                  {playlist.map((song, index) => (
                    <div 
                      key={song.id}
                      onClick={() => {
                        setCurrentSongIndex(index);
                        setIsPlaying(true);
                      }}
                      className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${currentSongIndex === index ? 'bg-white/15 shadow-lg' : 'hover:bg-white/5'}`}
                    >
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-black/20">
                        <img src={song.cover} alt={song.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {currentSongIndex === index && isPlaying && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                            <div className="flex gap-[3px] items-end h-4">
                              <motion.div 
                                animate={{ height: ['40%', '100%', '40%'] }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                                className="w-1 bg-[#ff4e00] rounded-full" 
                              />
                              <motion.div 
                                animate={{ height: ['70%', '30%', '70%'] }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.2 }}
                                className="w-1 bg-[#ff4e00] rounded-full" 
                              />
                              <motion.div 
                                animate={{ height: ['50%', '90%', '50%'] }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.4 }}
                                className="w-1 bg-[#ff4e00] rounded-full" 
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${currentSongIndex === index ? 'text-white' : 'text-white/70'}`}>{song.title}</p>
                        <p className="text-sm text-white/40 truncate mt-0.5">{song.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <audio 
        ref={audioRef}
        src={currentSong.src}
        preload="metadata"
      />
    </div>
  );
}
