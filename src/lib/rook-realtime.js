// ============================================================
// ROOK REALTIME  (OpenAI Realtime over WebRTC - the in-app voice assistant)
//
// startRealtime() mints an ephemeral session from /api/realtime-session, opens
// a WebRTC peer connection straight to OpenAI, streams mic audio up and spoken
// audio down, and routes the model's tool calls back into the app. Returns a
// controller { stop }. THROWS when Realtime is not available (no key, blocked
// mic, unsupported browser) so the caller can fall back to Web Speech.
//
// The browser never sees OPENAI_API_KEY - only the short-lived client secret.
// NO em-dash / en-dash. ASCII only.
// ============================================================

export async function startRealtime({ onUserText, onAssistantText, onSpeaking, onTool } = {}) {
  if (typeof RTCPeerConnection === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
    throw new Error('webrtc-unsupported');
  }
  const sessResp = await fetch('/api/realtime-session', { method: 'POST' }).then(r => r.json()).catch(() => null);
  const secret = sessResp?.session?.client_secret?.value;
  if (!sessResp?.ok || !secret) throw new Error('no-realtime');
  const model = sessResp.model || 'gpt-4o-realtime-preview-2024-12-17';

  const pc = new RTCPeerConnection();
  const audioEl = document.createElement('audio');
  audioEl.autoplay = true;
  audioEl.style.display = 'none';
  document.body.appendChild(audioEl);
  pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  mic.getTracks().forEach(t => pc.addTrack(t, mic));

  const dc = pc.createDataChannel('oai-events');
  const send = (obj) => { try { if (dc.readyState === 'open') dc.send(JSON.stringify(obj)); } catch {} };

  let acc = '';
  dc.onmessage = (e) => {
    let ev; try { ev = JSON.parse(e.data); } catch { return; }
    switch (ev.type) {
      case 'response.audio_transcript.delta':
        acc += ev.delta || ''; onSpeaking?.(true); break;
      case 'response.audio_transcript.done':
        if (ev.transcript || acc) onAssistantText?.(ev.transcript || acc); acc = ''; break;
      case 'conversation.item.input_audio_transcription.completed':
        if (ev.transcript) onUserText?.(ev.transcript.trim()); break;
      case 'response.done':
        onSpeaking?.(false); break;
      case 'response.function_call_arguments.done': {
        let args = {}; try { args = JSON.parse(ev.arguments || '{}'); } catch {}
        Promise.resolve(onTool?.(ev.name, args)).then((result) => {
          send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: ev.call_id, output: JSON.stringify(result || { ok: true }) } });
          send({ type: 'response.create' });
        });
        break;
      }
      default: break;
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  const answerResp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
    method: 'POST',
    body: offer.sdp,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/sdp' },
  });
  if (!answerResp.ok) {
    try { mic.getTracks().forEach(t => t.stop()); pc.close(); audioEl.remove(); } catch {}
    throw new Error('sdp-failed');
  }
  const sdp = await answerResp.text();
  await pc.setRemoteDescription({ type: 'answer', sdp });

  const stop = () => {
    try { dc.close(); } catch {}
    try { pc.close(); } catch {}
    try { mic.getTracks().forEach(t => t.stop()); } catch {}
    try { audioEl.srcObject = null; audioEl.remove(); } catch {}
  };
  return { stop };
}
