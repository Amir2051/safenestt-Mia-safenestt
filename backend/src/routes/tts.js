import { Router } from 'express';
import { spawn } from 'child_process';
import { createReadStream, unlink } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

const router   = Router();
const EDGE_TTS = '/home/ronzoro/.pyenv/shims/edge-tts';

// Futuristic voice: Aria with lower pitch + crisp pace
const VOICE  = 'en-US-AriaNeural';
const PITCH  = '-14Hz';   // lower = more synthetic/AI-like
const RATE   = '+10%';    // slightly faster, crisp delivery
const VOLUME = '+25%';    // clear and present

router.post('/', (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const clean   = text.trim().slice(0, 4000);
  const outFile = join(tmpdir(), `mia-tts-${randomUUID()}.mp3`);

  const proc = spawn(EDGE_TTS, [
    `--voice=${VOICE}`,
    `--pitch=${PITCH}`,
    `--rate=${RATE}`,
    `--volume=${VOLUME}`,
    `--text=${clean}`,
    `--write-media=${outFile}`,
  ]);

  let done = false;

  proc.on('error', (err) => {
    if (!done && !res.headersSent) res.status(500).json({ error: err.message });
    done = true;
  });

  proc.on('close', (code) => {
    if (done) return;
    done = true;

    if (code !== 0 && code !== null) {
      if (!res.headersSent) res.status(500).json({ error: `edge-tts exited ${code}` });
      unlink(outFile, () => {});
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    const stream = createReadStream(outFile);
    stream.pipe(res);
    stream.on('end',   () => unlink(outFile, () => {}));
    stream.on('error', () => {
      res.end();
      unlink(outFile, () => {});
    });
  });
});

export default router;
