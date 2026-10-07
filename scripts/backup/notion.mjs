// The two Notion calls a backup needs. Read-only.

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
      // Rate limited: wait as long as Notion asks, a few times over.
      if (res.status === 429 && attempt < MAX_RETRIES) {
        await sleep(Number(res.headers.get("retry-after") ?? 1) * 1000);
        continue;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(`${res.status} ${data.code ?? ""}: ${data.message ?? "request failed"}`);
      return data;
    }
  }

  return {
    /** The database itself: its title and columns. */
    getDatabase: (id) => request("GET", `/databases/${id}`),

    /** Every row, following Notion's paging. */
    async getAllPages(id) {
      const pages = [];
      let cursor;
      do {
        const data = await request("POST", `/databases/${id}/query`, { page_size: 100, start_cursor: cursor });
        pages.push(...data.results);
        cursor = data.has_more ? data.next_cursor : undefined;
      } while (cursor);
      return pages;
    },
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
