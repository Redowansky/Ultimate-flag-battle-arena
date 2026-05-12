export async function getLiveChatId(apiKey, videoId) {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'liveStreamingDetails');
  url.searchParams.set('id', videoId);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Could not connect to YouTube video. Check API key and video ID.');
  const data = await response.json();
  const liveChatId = data.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
  if (!liveChatId) throw new Error('No active live chat found for this video.');
  return liveChatId;
}

export async function fetchChatMessages({ apiKey, liveChatId, pageToken }) {
  const url = new URL('https://www.googleapis.com/youtube/v3/liveChat/messages');
  url.searchParams.set('part', 'snippet,authorDetails');
  url.searchParams.set('liveChatId', liveChatId);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('maxResults', '200');
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Could not read live chat messages.');
  const data = await response.json();
  return {
    messages: (data.items || []).map((item) => ({
      id: item.id,
      text: item.snippet?.displayMessage || '',
      author: item.authorDetails?.displayName || 'Viewer',
      avatar: item.authorDetails?.profileImageUrl || ''
    })),
    nextPageToken: data.nextPageToken,
    pollingIntervalMillis: data.pollingIntervalMillis || 3500
  };
}

export function startYouTubePolling({ apiKey, videoId, onMessage, onStatus, onError }) {
  let cancelled = false;
  let timer = null;
  let liveChatId = null;
  let pageToken = null;
  const seen = new Set();

  const loop = async () => {
    try {
      if (!liveChatId) {
        onStatus?.('Connecting to YouTube live chat…');
        liveChatId = await getLiveChatId(apiKey, videoId);
        onStatus?.('YouTube live chat connected.');
      }

      const result = await fetchChatMessages({ apiKey, liveChatId, pageToken });
      pageToken = result.nextPageToken;
      result.messages.forEach((message) => {
        if (seen.has(message.id)) return;
        seen.add(message.id);
        onMessage?.(message);
      });

      if (!cancelled) timer = window.setTimeout(loop, result.pollingIntervalMillis);
    } catch (error) {
      onError?.(error.message || 'YouTube chat error.');
      if (!cancelled) timer = window.setTimeout(loop, 6500);
    }
  };

  loop();
  return () => {
    cancelled = true;
    if (timer) window.clearTimeout(timer);
  };
}
