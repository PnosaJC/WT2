# wt2

Daily IELTS Writing Task 2 practice, with a minimal dark theme inspired by monkeytype.

Each day works like this:

1. You get **3 new questions**, each from a **different, randomly chosen type**. A question never comes up twice.
2. You write an **introduction** for each question. A live word counter shows your count. When you're done, you lock them.
3. You **pick one** of the three and write the **full essay**. The essay starts with your introduction already filled in, and the counter shows your progress towards 250 words.
4. You **submit**. The essay is then locked, and you can add **self-review notes** to it at any time.

The **history** page shows every past session. The **stats** page shows your streak, a calendar heatmap, and counts by question type, including how many new questions are left for each type.

Drafts save automatically. Everything is stored in your browser's `localStorage`, so use the same browser each time, and don't clear site data.

## Questions

Questions live in [`public/questions.json`](public/questions.json):

```json
{
  "questions": [
    {
      "id": "opinion-001",
      "type": "opinion",
      "text": "Some people think ...\n\nTo what extent do you agree or disagree?"
    }
  ]
}
```

- `type` must be one of: `opinion`, `discussion`, `advantages-disadvantages`, `problem-solution` (this includes causes/effects), or `two-part`.
- `id` must be unique and must never change once used. The app uses the id to track which questions you've already done.
- To add questions, copy them from howtodoielts.com and paste them to Kiro, which will format them into this file.

The questions currently in the file are placeholder samples, and their ids start with `sample-`.

## Development

```sh
npm install
npm run build   # validates questions.json, then compiles to dist/
npm run serve   # serves dist/ at http://localhost:5173
```

The site is plain TypeScript with no runtime dependencies. Every push to `main` deploys it to GitHub Pages through `.github/workflows/deploy.yml`.
