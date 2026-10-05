import { useEffect, useRef, useState } from 'react';
 import { Alert, Animated, Easing, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import Screen from '../../src/components/Screen';
import { useStudio } from '../../src/context/StudioContext';
import { card, colors, fmt, radius } from '../../src/theme';

const BARS = 36;

export default function Gravar() {
  const { addRecording, stopPlayback } = useStudio();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 100);
  const [perm, setPerm] = useState({ granted: false, canAskAgain: true, checked: false });
  const [levels, setLevels] = useState([]);
  const [saved, setSaved] = useState(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AudioModule.getRecordingPermissionsAsync().then((p) =>
      setPerm({ granted: p.granted, canAskAgain: p.canAskAgain, checked: true })
    );
  }, []);

  useEffect(() => {
    if (!state.isRecording) return;
    const db = state.metering ?? -60;
    const v = Math.max(0, Math.min(1, (db + 60) / 60));
    setLevels((prev) => [...prev.slice(-(BARS - 1)), v]);
  }, [state.durationMillis]);

  useEffect(() => {
    if (!state.isRecording) return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [state.isRecording]);

  const askPermission = async () => {
    const p = await AudioModule.requestRecordingPermissionsAsync();
    setPerm({ granted: p.granted, canAskAgain: p.canAskAgain, checked: true });
    return p.granted;
  };

  const warnDenied = () =>
    Alert.alert('Microfone bloqueado', 'Sem o microfone não dá para gravar. Libere o acesso nas configurações do celular.', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
    ]);

  const start = async () => {
    const ok = perm.granted || (await askPermission());
    if (!ok) return warnDenied();
    try {
      stopPlayback();
      setSaved(null);
      setLevels([]);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert('Ops', 'Não consegui iniciar a gravação. Tente de novo.');
    }
  };

  const stop = async () => {
    try {
      const durationMs = state.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) setSaved(addRecording({ uri: recorder.uri, durationMs }));
    } catch {
      Alert.alert('Ops', 'Não consegui salvar a gravação.');
    }
  };

  const recording = state.isRecording;
  const showPermCard = perm.checked && !perm.granted;

  return (
    <Screen
      eyebrow="ESTÚDIO DE BOLSO"
      title="Gravar"
      right={
        <Image
          source={require('../../assets/soundcraft_logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Soundcraft"
        />
      }
    >
      <View style={styles.center}>
        <View style={[styles.chip, recording && { backgroundColor: 'rgba(255,77,109,0.18)' }]}>
          <View style={[styles.dot, { backgroundColor: recording ? colors.coral : colors.muted }]} />
          <Text style={[styles.chipText, recording && { color: colors.coral }]}>{recording ? 'NO AR' : 'PRONTO'}</Text>
        </View>

        <Text style={styles.timer}>{fmt(state.durationMillis)}</Text>

        <View style={styles.wave}>
          {Array.from({ length: BARS }).map((_, i) => {
            const v = levels[i - (BARS - levels.length)] ?? 0;
            return <View key={i} style={[styles.bar, { height: 6 + v * 64, opacity: v ? 1 : 0.3, backgroundColor: recording ? colors.coral : colors.violet }]} />;
          })}
        </View>

        <View style={styles.recWrap}>
          <Animated.View
            style={[
              styles.ring,
              { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }] },
            ]}
          />
          <Pressable onPress={recording ? stop : start} style={({ pressed }) => [styles.recBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
            <Ionicons name={recording ? 'stop' : 'mic'} size={40} color="#fff" />
          </Pressable>
        </View>
        <Text style={styles.hint}>{recording ? 'Toque para parar' : 'Toque para começar a gravar'}</Text>

        {saved && !recording && (
          <View style={styles.saved}>
            <Ionicons name="checkmark-circle" size={18} color={colors.mint} />
            <Text style={styles.savedText}>{saved.nome} salva · {fmt(saved.durationMs)}</Text>
          </View>
        )}
      </View>

      {showPermCard && (
        <View style={styles.permCard}>
          <Ionicons name="mic-off" size={22} color={colors.amber} />
          <View style={{ flex: 1 }}>
            <Text style={styles.permTitle}>Microfone desligado</Text>
            <Text style={styles.permText}>
              {perm.canAskAgain ? 'Precisamos da sua permissão para gravar a voz.' : 'O acesso foi negado. Ative nas configurações do celular.'}
            </Text>
          </View>
          <Pressable style={styles.permBtn} onPress={() => (perm.canAskAgain ? askPermission() : Linking.openSettings())}>
            <Text style={styles.permBtnText}>{perm.canAskAgain ? 'Permitir' : 'Abrir'}</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 192, height: 72 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceAlt, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: colors.muted, fontWeight: '800', fontSize: 12, letterSpacing: 1.5 },
  timer: { color: colors.text, fontSize: 72, fontWeight: '200', marginTop: 18, fontVariant: ['tabular-nums'] },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 80, marginVertical: 18 },
  bar: { width: 5, borderRadius: 3 },
  recWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 8, height: 130, width: 130 },
  ring: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: colors.coral },
  recBtn: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', shadowColor: colors.coral, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  hint: { color: colors.muted, marginTop: 6, fontSize: 14 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  savedText: { color: colors.mint, fontWeight: '700' },
  permCard: { ...card, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, borderColor: colors.amber },
  permTitle: { color: colors.text, fontWeight: '800' },
  permText: { color: colors.muted, fontSize: 13, marginTop: 2 },
  permBtn: { backgroundColor: colors.amber, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill },
  permBtnText: { color: '#1B1200', fontWeight: '800' },
});
