import { parseTimelineData } from './parser';

self.onmessage = (e: MessageEvent<{ jsonString?: string; jsonObject?: any }>) => {
  try {
    let data = e.data.jsonObject;
    if (!data && e.data.jsonString) {
      self.postMessage({ type: 'progress', progress: 0.05, stage: 'Parsing JSON text string...' });
      data = JSON.parse(e.data.jsonString);
    }

    const result = parseTimelineData(data, (progress, stage) => {
      self.postMessage({ type: 'progress', progress, stage });
    });

    self.postMessage({ type: 'success', data: result });
  } catch (err: any) {
    self.postMessage({ type: 'error', error: err?.message || 'Failed to parse JSON file' });
  }
};
