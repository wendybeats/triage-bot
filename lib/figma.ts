export interface FigmaComment {
  id: string;
  file_key: string;
  message: string;
  user: {
    handle: string;
    img_url: string;
  };
  created_at: string;
  resolved_at: string | null;
  order_id: string;
  parent_id: string;
  client_meta?: {
    node_id?: string;
    node_offset?: { x: number; y: number };
  };
}

async function fetchFileComments(fileKey: string, token: string): Promise<FigmaComment[]> {
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/comments`,
    {
      headers: {
        'X-Figma-Token': token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Figma API error for file ${fileKey}: ${response.status}`);
  }

  const data = await response.json();
  return data.comments || [];
}

export async function fetchRecentComments(): Promise<FigmaComment[]> {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) throw new Error('Figma access token not configured');

  const fileKeys = (process.env.FIGMA_FILE_KEYS || '').split(',').filter(Boolean);
  if (fileKeys.length === 0) throw new Error('No Figma file keys configured');

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const allComments: FigmaComment[] = [];

  for (const fileKey of fileKeys) {
    try {
      const comments = await fetchFileComments(fileKey.trim(), token);

      // Filter: unresolved, recent, not from the user themselves
      const filtered = comments.filter(c => {
        const createdAt = new Date(c.created_at);
        return !c.resolved_at && createdAt >= oneDayAgo;
      });

      // Add file_key to each comment for link generation
      filtered.forEach(c => { c.file_key = fileKey.trim(); });
      allComments.push(...filtered);
    } catch (err) {
      console.error(`Failed to fetch Figma comments for ${fileKey}:`, err);
    }
  }

  return allComments;
}

export function getFigmaCommentLink(fileKey: string, commentId: string): string {
  return `https://www.figma.com/file/${fileKey}?commentId=${commentId}`;
}
