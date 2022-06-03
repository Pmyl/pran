import { createFFmpeg } from "@ffmpeg/ffmpeg";

export const webmToMp4 = async webmBlob => {
  const webmData = await new Response(webmBlob).arrayBuffer();
  const ffmpeg = createFFmpeg({ log: true, corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js' });

  await ffmpeg.load();
  ffmpeg.FS('writeFile', 'input.webm', new Uint8Array(webmData));
  await ffmpeg.run('-i', 'input.webm', '-c:v', 'copy', '-strict', '-2', 'output.mp4');

  return ffmpeg.FS('readFile', 'output.mp4');
}