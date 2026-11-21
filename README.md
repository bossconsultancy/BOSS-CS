# BOSS Studio

One website for the BOSS team, behind one password. The home page has four tiles:

| Tile | Address | What it does |
|---|---|---|
| Department news | `/news` | Pulls today's verified topics for each department and designs the posts (English or தமிழ்). |
| Social media posts | `/social` | Turn your own idea into a post or carousel, in English or Tamil. Tamil is rewritten naturally, not translated word for word. |
| Flyers | `/flyers` | Program flyers from pasted course details (the former BOSS Flyer Studio). |
| Company profile booklet | `/booklet` | The 40-page booklet in Tamil **and English**, edited like Figma (see below). |

## Settings on Vercel (Project > Settings > Environment Variables)

Required: `OPENAI_API_KEY`, `APP_PASSWORD`, and Blob storage connected (adds `BLOB_READ_WRITE_TOKEN`).
Optional: `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_QUALITY` (posts use medium, about $0.05 a post), `SOCIAL_TEXT_MODEL` (default `gpt-4o-mini`), `OPENAI_DESIGN_MODEL`, `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (free backup image maker), `DAILY_AI_LIMIT`.
Turn on **Fluid Compute** so image requests are not cut off. After adding a setting, redeploy.

Posts saved on the old Render site (Cloudflare KV) do not move over. Once this site is live, the Render site can be switched off.

## Booklet editing (Tamil and English)

- Switch language with **தமிழ் | English** in the top bar. Each language has its own saved copy, shared with the whole team.
- Every title, paragraph, photo, line and box is its own layer (nothing is grouped).
- Point at anything: a blue outline and a pencil appear. Click the pencil, double-click, or press Enter to type in text.
- Click to select, drag to move, pull a handle to resize (hold Shift on a photo corner to keep its shape). Arrow keys nudge 1px, Shift + arrow nudges 10px. Delete removes the layer, and Esc lets go.
- Undo and redo: Cmd/Ctrl + Z and Cmd/Ctrl + Shift + Z.
- Download PDF, PNG or HTML for the language you are viewing.

---

# Flyers (former BOSS Flyer Studio)

A small website for the BOSS team: paste course information, and it builds a print-ready program flyer in the BOSS design, with an AI-generated photo. Everything can be edited before downloading.

## What it does

1. **Paste**: paste course details (brochure text, a web page, an email). OpenAI fills in the flyer using only those facts, and lists anything it could not find.
2. **Text**: edit every field: headline, badge, tagline, key facts (with icons), topics, highlights, careers, admission, salary and the financial note. Section titles are editable too.
3. **Photo**: the app writes the photo prompt for you (South Indian people with fair to light wheatish skin, bright modern setting, clothing in the flyer colours, no text). Edit the scene, then generate it with OpenAI, or upload your own photo. Move and zoom the photo to frame faces.
4. **Design**: text sizes for each part of the flyer (headline, big code, tagline, key facts, section titles, lists, career boxes, salary and financial note, footer) with sliders and A− / A+ buttons, a warning when print text gets smaller than 12px, and a reset button; 9 colour themes (including the G2, G3, ECEA and PSW colours), "make a theme from one colour", five fine-tune colour pickers, layout options, topic columns, text size and header height, and show or hide any section.
5. **Contact**: the logo tagline, phone, address and website on the flyer. Save them as the default for new flyers.

**Undo / Redo**: the arrow buttons in the top bar (or Cmd/Ctrl + Z and Cmd/Ctrl + Shift + Z, Ctrl + Y on Windows) step back and forward through the last 100 changes, including an AI fill or a new photo. Each flyer has its own history while it is open.

Text size adjusts automatically so the page is always full and nothing spills over. The badge at the top of the preview tells you if something is too long.

**Downloads**
- **PDF**: one-click print PDF, 8.75 x 11.25 in (US Letter with 0.125 in bleed), 300 dpi.
- **PNG**: 300 dpi image for a print shop.
- **Web JPG**: smaller file for WhatsApp, email and social media.
- **Print**: opens the browser print dialog. Choose "Save as PDF" for a PDF with sharp vector text.

**Team library (shared cloud saving)**: once Vercel Blob storage is connected (see below), every flyer and its photo save automatically to the cloud, and everyone opens them from **Team flyers**.
- The first time, each person types their name, which is shown next to their changes.
- The top bar shows "Saved to team library" after each change.
- If two people edit the same flyer at once, the second person is asked whether to load the other version, keep theirs, or save theirs as a copy. Nobody's work is silently overwritten.
- Make a copy of any flyer to start a new course from it.
- Delete asks twice. Deleted flyers are moved to a `trash/` folder in storage, so an admin can recover them.
- Without the storage connected, flyers save in each person's browser only, and can be shared with Export / Import file.

Long dashes (— and –) are replaced automatically with commas or "to", following the BOSS writing rule.

## Put it online (Vercel, about 10 minutes)

You need a free GitHub account and a free Vercel account.

1. **Upload the code to GitHub**
   - Go to github.com, click **New repository**, name it `boss-flyer-studio`, set it to **Private**, and create it.
   - On the new repository page, click **uploading an existing file**, drag in all the files and folders from this zip (not the zip itself), and click **Commit changes**.
2. **Deploy on Vercel**
   - Go to vercel.com, sign in with GitHub, click **Add New > Project**, and import `boss-flyer-studio`.
   - Before clicking Deploy, open **Environment Variables** and add:
     - `OPENAI_API_KEY`: your OpenAI key (from platform.openai.com > API keys)
     - `APP_PASSWORD`: a team password. Everyone who opens the site must enter it (any username works). **Do not skip this**, or anyone with the link could spend your OpenAI credit.
   - Click **Deploy**. Vercel gives you a link like `boss-flyer-studio.vercel.app`. Share that link and the password with your team.
3. **Turn on the team library (shared cloud saving)**
   - In your Vercel project, open the **Storage** tab, click **Create Database** (or **Connect Store**), choose **Blob**, give it a name like `boss-flyers`, and connect it to this project for all environments.
   - Vercel adds the `BLOB_READ_WRITE_TOKEN` setting automatically.
   - Go to **Deployments**, click **⋯** on the newest one, then **Redeploy**. The top bar now shows "Team library".
4. **Optional settings** (Vercel > Project > Settings > Environment Variables, then redeploy):
   - `OPENAI_TEXT_MODEL` (default `gpt-5.6`): the model that reads the course text.
   - `OPENAI_IMAGE_MODEL` (default `gpt-image-2.5-sunburst`): the photo model.
   - `OPENAI_IMAGE_QUALITY` (default `high`; `medium` or `low` are cheaper).
   If OpenAI renames or retires a model, the app shows the error message. Change the variable to a current model name and redeploy.

Photo generation can take up to a minute. On Vercel's free plan, if photos time out, turn on **Fluid Compute** in the project settings (it allows longer requests).

## Company profile booklet

Open **Booklet** in the top bar (or go to `/booklet`). The 40 page Tamil company profile opens page by page and everything on it can be changed in the browser:

- **Text**: click any line and type. Colour, bold, italic, size and alignment are in the panel on the left.
- **Tamil**: the booklet is set in the Bamini fonts, where Latin letters stand for Tamil glyphs. Type normal Unicode Tamil in the box on the left and press **Replace this text**, and it is converted for you. English words inside Tamil lines keep the Latin font.
- **Photos**: click a photo to put your own in its place, and slide it across or up and down so faces stay in view.
- **Blocks**: Add text, Copy and Delete; arrow keys move the selected block (hold Shift for 10px steps).
- **Undo / Redo**: Cmd/Ctrl + Z, and Cmd/Ctrl + Shift + Z.
- **Saving**: changes are kept in your browser on this computer, page by page, and come back when you open it again. **Back to the original** puts every page back.
- **Ask for a change**: select something and type what you want in plain language ("shorten this heading", "say it in simpler Tamil", "make the text navy and a bit bigger"). This is the one part of the booklet page that uses OpenAI, with the same `OPENAI_API_KEY` as the flyers, so it costs the usual few cents per request. Everything else on this page is free.
- **Downloads**: PDF (all 40 pages), PNG of the page you are on at 300 dpi, HTML (one file with the fonts and photos inside, editable offline), and Print, where "Save as PDF" gives sharp vector text.

Apart from **Ask for a change**, nothing on this page uses AI, so day to day editing costs nothing. To replace the booklet with a newer version, drop the new `pages.html`, `booklet.css` and `assets/` into `public/booklet/`.

## Costs

- **OpenAI** (your API key) is the only AI cost:
  - **Create flyer** reading pasted text is one small text request (a fraction of a cent to a few cents).
  - **Generate photo** is one image request, the main cost (roughly tens of cents per photo at high quality, less at medium or low).
  - Set a monthly budget limit at platform.openai.com > Settings > Limits.
- **Free**: editing text, colours and layout, uploading your own photo, and downloading PDF, PNG or JPG use no AI.
- **Vercel** hosting and Blob storage are free on the Hobby plan within its monthly limits, which a team flyer library will not come close to. Vercel's Hobby plan is meant for non-commercial use; move to Pro if Vercel asks.
- Claude is not used by the app at all.

## Run it on your own computer (optional)

```bash
npm install
cp .env.example .env.local   # then put your key and a password in .env.local
npm run dev                  # open http://localhost:3000
```

To try the app without an OpenAI key, run `MOCK_OPENAI=1 npm run dev`. It then returns sample text and a grey placeholder photo instead of calling OpenAI. Add `MOCK_CLOUD=1` to test the team library with a local folder instead of Vercel Blob.

## Files

- `components/Flyer.tsx`: the flyer design (layout, auto-fit, all visual rules)
- `lib/colors.ts`: colour themes and automatic readable text colours
- `lib/prompt.ts`: the photo prompt rules
- `lib/schema.ts`: the instructions OpenAI follows when reading course text (facts only, no invented details, no long dashes)
- `lib/samples.ts`: the G2, G3, ECEA and PSW starter flyers
- `app/api/parse` and `app/api/image`: the server routes that call OpenAI (your key never reaches the browser)
- `lib/cloud.ts`, `app/api/projects`, `app/api/photo`: the team library on Vercel Blob (private files, served only through the app)
- `proxy.ts`: the team password check
- `public/logo-*.svg`: BOSS logos
