/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_DATABASE_ID || '';

export interface NotionTask {
  id: string;
  title: string;
  status: string;
  assignee: string;
  url: string;
  last_edited: string;
}

export async function fetchRecentTasks(): Promise<NotionTask[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          timestamp: 'last_edited_time',
          last_edited_time: {
            after: oneDayAgo,
          },
        },
      ],
    },
    sorts: [
      {
        timestamp: 'last_edited_time',
        direction: 'descending',
      },
    ],
  });

  const tasks: NotionTask[] = [];

  for (const page of response.results) {
    if (!('properties' in page)) continue;

    const props = page.properties;

    // Extract title
    let title = 'Untitled';
    const titleProp = Object.values(props).find((p: any) => p.type === 'title') as any;
    if (titleProp?.title?.[0]?.plain_text) {
      title = titleProp.title[0].plain_text;
    }

    // Extract status
    let status = 'Unknown';
    const statusProp = props['Status'] as any;
    if (statusProp?.status?.name) {
      status = statusProp.status.name;
    } else if (statusProp?.select?.name) {
      status = statusProp.select.name;
    }

    // Skip done items
    if (status.toLowerCase() === 'done' || status.toLowerCase() === 'complete') continue;

    // Extract assignee
    let assignee = 'Unassigned';
    const assigneeProp = (props['Assignee'] || props['Assign'] || props['Person']) as any;
    if (assigneeProp?.people?.[0]?.name) {
      assignee = assigneeProp.people[0].name;
    }

    tasks.push({
      id: page.id,
      title,
      status,
      assignee,
      url: (page as any).url || `https://notion.so/${page.id.replace(/-/g, '')}`,
      last_edited: (page as any).last_edited_time || new Date().toISOString(),
    });
  }

  return tasks;
}

export async function createNotionTask(
  title: string,
  description: string,
  priority: string,
  sourceLink?: string
): Promise<string> {
  const properties: Record<string, any> = {
    Name: {
      title: [
        {
          text: {
            content: title,
          },
        },
      ],
    },
  };

  const children: any[] = [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: description },
          },
        ],
      },
    },
  ];

  if (sourceLink) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: `Source: ${sourceLink}` },
          },
        ],
      },
    });
  }

  children.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: { content: `Priority: ${priority}` },
        },
      ],
    },
  });

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
    children,
  });

  return response.id;
}
