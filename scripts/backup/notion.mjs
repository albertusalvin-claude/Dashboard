// The Notion calls a backup needs. Read-only.

const MAX_RETRIES = 5;

export function notionClient(apiKey) {
  async function request(method, apiPath, body) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`https://api.notion.com/v1${apiPath}`, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      // Rate limited, or Notion having a moment: wait and try again, a few
      // times over — as long as Notion asks, or longer each time.
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        await sleep(Number(res.headers.get("retry-after") ?? attempt + 1) * 1000);
        continue;
      }
      const data = await res.json();
      if (!res.ok) throw new NotionError(res.status, data);
      return data;
    }
  }

  // Every result of a paged endpoint, following Notion's cursors.
  async function allResults(fetchPage) {
    const results = [];
    let cursor;
    do {
      const data = await fetchPage(cursor);
      results.push(...data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
    return results;
  }

  /**
   * A page's content: its blocks, each with its own `children` filled in.
   * Child pages and databases aren't descended into — they're backed up as
   * items of their own — but each block is passed to `onBlock` so the
   * caller can find them.
   */
  async function getBlockTree(id, onBlock = () => {}) {
    const blocks = await allResults((cursor) =>
      request("GET", `/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`)
    );
    for (const block of blocks) {
      onBlock(block);
      if (block.has_children && block.type !== "child_page" && block.type !== "child_database") {
        block.children = await getBlockTree(block.id, onBlock);
      }
    }
    return blocks;
  }

  return {
    /** The database itself: its title and columns. */
    getDatabase: (id) => request("GET", `/databases/${id}`),

    /** Every row of a database. */
    getAllPages: (id) => allResults((cursor) => request("POST", `/databases/${id}/query`, { page_size: 100, start_cursor: cursor })),

    getPage: (id) => request("GET", `/pages/${id}`),

    getBlockTree,

    /** Every page and database shared with the integration. */
    searchAll: () => allResults((cursor) => request("POST", "/search", { page_size: 100, start_cursor: cursor })),
  };
}

export class NotionError extends Error {
  constructor(status, data) {
    super(`${status} ${data.code ?? ""}: ${data.message ?? "request failed"}`);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
