import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();
let isLoaded = false;

self.onmessage = async (event) => {
    const { id, file, type } = event.data;

    if (type === 'load') {
        try {
            if (!isLoaded) {
                 const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
                 await ffmpeg.load({
                     coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                     wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                 });
                 isLoaded = true;
            }
            self.postMessage({ type: 'loaded', id });
        } catch (error) {
            self.postMessage({ type: 'error', id, error });
        }
        return;
    }

    if (type === 'transcode') {
        if (!isLoaded) {
            self.postMessage({ type: 'error', id, error: 'FFmpeg not loaded' });
            return;
        }

        try {
            const ext = file.name.split('.').pop()?.toLowerCase();
            const inputName = `input_${id}.${ext}`;
            const outputName = `output_${id}.mp4`;

            // Progress handler
            ffmpeg.on('progress', ({ progress }) => {
                 self.postMessage({ type: 'progress', id, progress: progress * 100 });
            });

            await ffmpeg.writeFile(inputName, await fetchFile(file));
            await ffmpeg.exec(['-i', inputName, '-c:v', 'libx264', '-preset', 'ultrafast', outputName]);

            const data = await ffmpeg.readFile(outputName);
            // Send back as ArrayBuffer to minimize cloning overhead, or just Blob
            const blob = new Blob([data as any], { type: 'video/mp4' });

            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);
            
            self.postMessage({ type: 'complete', id, blob });

        } catch (error) {
            // console.error(error);
            self.postMessage({ type: 'error', id, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
};
