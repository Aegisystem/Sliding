import { TEXTS } from "@sliding/core";
import type { Limits } from "../decks/limits";
import { formatBytes } from "../pages";

/**
 * /llms.txt (#8): lo que un Agente necesita para subir y reemplazar una
 * presentación con la API, paso a paso y con curl. Va en inglés porque lo lee
 * un Agente, y las direcciones salen del origen que lo sirve.
 */
export function llmsTxt(origin: string, limits: Limits): string {
  const deckSize = formatBytes(limits.deckBytes, TEXTS.en);
  const space = formatBytes(limits.bytesPerOwner, TEXTS.en);
  const api = `${origin}/api/v1/presentations`;
  return `# Sliding

> Sliding hosts presentations made as a single HTML file (or a PDF) so their owner doesn't have to deploy anything, and lets them present with their phone as the remote, where they read their speaker notes. This file explains how an agent uploads and replaces a presentation on behalf of its owner.

## 1. Get the owner's agent key

Every request needs an agent key. The owner creates it at ${origin}/panel/agentes. It looks like \`sliding_\` followed by 40 letters and digits. Look for it in this order:

1. The \`SLIDING_KEY\` environment variable.
2. The file \`~/.config/sliding/key\`.
3. The conversation: the owner may have pasted it, usually in a message that points to this file and ends with \`My agent key:\` or \`Mi Clave para Agentes:\`.

If there's no key, ask the owner to create one at ${origin}/panel/agentes and paste you the message that page gives them. When the key came from the conversation, offer to save it on their computer so you don't have to ask next time. Put the key in place of \`sliding_…\`:

\`\`\`sh
mkdir -p ~/.config/sliding && (umask 077 && printf '%s\\n' "sliding_…" > ~/.config/sliding/key)
\`\`\`

Treat it like a password: don't print it, don't save it in the project or in a commit, and send it only to ${origin}. Send it in every request as a header:

    Authorization: Bearer $SLIDING_KEY

The commands below start by loading the key from the variable or the file. Run each one as a single command: a variable set in one command is gone in the next. If the key only came from the conversation and the owner didn't want it saved, put it in place of that first line: \`SLIDING_KEY="sliding_…"\`.

## 2. Upload a new presentation

Send the file in a multipart form field named \`file\`. Sliding accepts:

- \`.html\`: one self-contained file, with its CSS and JavaScript inline. Images go inline as data URLs or as absolute https URLs, because Sliding serves only that one file. The title comes from its \`<title>\`.
- \`.pdf\`: for presentations made in PowerPoint, Keynote or Google Slides. The title comes from the file name.

Each file can be up to ${deckSize}, and all of the owner's presentations together up to ${space}.

\`\`\`sh
SLIDING_KEY="\${SLIDING_KEY:-$(cat ~/.config/sliding/key 2>/dev/null)}"
curl -sS -X POST "${api}" \\
  -H "Authorization: Bearer $SLIDING_KEY" \\
  -F "file=@index.html"
\`\`\`

The answer is \`201 Created\` with JSON:

\`\`\`json
{
  "id": "Ab3dEf6hJk8m",
  "title": "Photosynthesis",
  "kind": "html-slides",
  "slides": 12,
  "link": "${origin}/d/Ab3dEf6hJk8m",
  "presentingLink": "${origin}/p/Q2xhdmUtZGUtZWplbXBsbw"
}
\`\`\`

- \`link\` is the presentation link. Anyone who has it sees the slides, without the speaker notes. The owner shares it with the audience.
- \`presentingLink\` is the presenting link, and it's secret. Opened on the computer connected to the projector, it shows the presentation and a QR code; the phone that scans it becomes the remote and shows the speaker notes. Give it only to the owner.
- \`kind\` is \`html-slides\` (made with the html-slides skill: Sliding reads its speaker notes and controls each slide), \`generic\` (any other HTML: the remote only moves back and forward) or \`pdf\`. \`slides\` is the number of slides, or \`null\` if Sliding can't count them.

Tell the owner both links.

## 3. Save the id next to the file

Save the id in \`.sliding.json\`, in the same folder as \`index.html\`:

\`\`\`json
{ "id": "Ab3dEf6hJk8m" }
\`\`\`

Save only the id: never the key or the presenting link.

## 4. Replace the presentation after changes

If \`.sliding.json\` already exists, replace that presentation instead of uploading a new one. Put its id in place of \`<id>\`:

\`\`\`sh
SLIDING_KEY="\${SLIDING_KEY:-$(cat ~/.config/sliding/key 2>/dev/null)}"
curl -sS -X PUT "${api}/<id>" \\
  -H "Authorization: Bearer $SLIDING_KEY" \\
  -F "file=@index.html"
\`\`\`

The answer is \`200 OK\` with the same JSON. The id and both links stay the same, so the audience and the owner keep using the links they already have.

If the answer is \`404\` with \`not-found\`, that presentation no longer exists (the owner deleted it) or belongs to another account. Upload it as new (step 2) and write the new id to \`.sliding.json\`.

## Errors

Errors come as JSON with a fixed code and a message that says what to do:

\`\`\`json
{ "error": "too-large", "message": "The file is over ${deckSize}. Shrink its images and try again." }
\`\`\`

| Status | \`error\` | What to do |
| --- | --- | --- |
| 401 | \`unauthorized\` | The key is missing, wrong or revoked. Ask the owner for a new one at ${origin}/panel/agentes. |
| 400 | \`empty\` | Send the file in the multipart field \`file\`. |
| 415 | \`format\` | Send an \`.html\` or \`.pdf\` file. |
| 400 | \`not-pdf\` | The file isn't a valid PDF. Export it again. |
| 413 | \`too-large\` | The file is over ${deckSize}. Shrink its images. |
| 413 | \`no-space\` | The owner's presentations already use their ${space}. Ask the owner to delete one. |
| 404 | \`not-found\` | See step 4. |

## Speaker notes

Speaker notes need an html-slides presentation: each \`<section class="slide">\` carries its notes in an \`<aside class="notes">\`. Sliding removes them from what the audience sees and shows them only on the remote. The html-slides skill, which builds these presentations, is at ${origin}/skill.
`;
}
