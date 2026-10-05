import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Accelerometer } from 'expo-sensors';

const StudioContext = createContext(null);
export const useStudio = () => useContext(StudioContext);

export function StudioProvider({ children }) {
  const [recordings, setRecordings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState({ position: 0, duration: 0 });

  const [volume, setVolumeState] = useState(0.6);
  const [locked, setLockedState] = useState(false);
  const [output, setOutputState] = useState('speaker');
  const [connecting, setConnecting] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);

  const volumeRef = useRef(0.6);
  const lockedRef = useRef(false);
  const current = useRef(null);
  const pads = useRef({});
  const counter = useRef(0);

  // ---------- volume (acelerômetro) ----------
  const applyVolume = useCallback((v) => {
    const vol = Math.max(0, Math.min(1, v));
    volumeRef.current = vol;
    setVolumeState((old) => (Math.abs(old - vol) > 0.01 ? vol : old));
    try {
      if (current.current) current.current.player.volume = vol;
      Object.values(pads.current).forEach((p) => (p.volume = vol));
    } catch {}
  }, []);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    Accelerometer.setUpdateInterval(120);
    const sub = Accelerometer.addListener(({ x }) => {
      if (lockedRef.current) return;
      // inclinar para a esquerda = mais baixo, para a direita = mais alto
      const tilt = Math.max(-0.7, Math.min(0.7, x));
      const target = (tilt + 0.7) / 1.4;
      applyVolume(volumeRef.current * 0.75 + target * 0.25);
    });
    return () => {
      sub.remove();
      try {
        current.current?.player.release();
        Object.values(pads.current).forEach((p) => p.release());
      } catch {}
    };
  }, [applyVolume]);

  const setLocked = useCallback((v) => {
    lockedRef.current = v;
    setLockedState(v);
  }, []);

  // ---------- saída Bluetooth (simulada) ----------
  const setOutput = useCallback((id) => {
    setConnecting(true);
    setTimeout(() => {
      setOutputState(id);
      setConnecting(false);
    }, 900);
  }, []);

  // ---------- gravações ----------
  const stopPlayback = useCallback(() => {
    const cur = current.current;
    if (cur) {
      try {
        cur.sub.remove();
        cur.player.pause();
        cur.player.release();
      } catch {}
      current.current = null;
    }
    setPlayingId(null);
    setIsPlaying(false);
    setProgress({ position: 0, duration: 0 });
  }, []);

  const addRecording = useCallback(({ uri, durationMs }) => {
    counter.current += 1;
    const rec = { id: String(Date.now()), nome: `Gravação ${counter.current}`, uri, durationMs, published: false };
    setRecordings((list) => [rec, ...list]);
    setSelectedId(rec.id);
    return rec;
  }, []);

  const togglePlay = useCallback(
    (rec) => {
      const cur = current.current;
      setSelectedId(rec.id);
      if (cur && cur.id === rec.id) {
        cur.player.playing ? cur.player.pause() : cur.player.play();
        return;
      }
      stopPlayback();
      const player = createAudioPlayer({ uri: rec.uri }, { updateInterval: 100 });
      player.volume = volumeRef.current;
      const sub = player.addListener('playbackStatusUpdate', (s) => {
        setIsPlaying(!!s.playing);
        if (s.didJustFinish) {
          player.seekTo(0);
          setProgress({ position: 0, duration: s.duration });
        } else {
          setProgress({ position: s.currentTime, duration: s.duration });
        }
      });
      current.current = { id: rec.id, player, sub };
      setPlayingId(rec.id);
      player.play();
    },
    [stopPlayback]
  );

  const deleteRecording = useCallback(
    (id) => {
      if (current.current?.id === id) stopPlayback();
      setRecordings((list) => list.filter((r) => r.id !== id));
      setSelectedId((sel) => (sel === id ? null : sel));
    },
    [stopPlayback]
  );

  // ---------- pad de vinhetas ----------
  const playVinheta = useCallback((v) => {
    let p = pads.current[v.id];
    if (!p) {
      p = createAudioPlayer(v.source);
      pads.current[v.id] = p;
    }
    p.volume = volumeRef.current;
    p.seekTo(0);
    p.play();
  }, []);

  // ---------- publicação (simulada) ----------
  const publish = useCallback((id) => {
    setPublishing(true);
    setPublishProgress(0);
    let pct = 0;
    const timer = setInterval(() => {
      pct += 0.05;
      setPublishProgress(Math.min(1, pct));
      if (pct >= 1) {
        clearInterval(timer);
        setRecordings((list) => list.map((r) => (r.id === id ? { ...r, published: true } : r)));
        setPublishing(false);
      }
    }, 120);
  }, []);

  return (
    <StudioContext.Provider
      value={{
        recordings, selectedId, setSelectedId, playingId, isPlaying, progress,
        addRecording, togglePlay, stopPlayback, deleteRecording,
        volume, applyVolume, locked, setLocked,
        output, setOutput, connecting,
        playVinheta,
        publishing, publishProgress, publish,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}
