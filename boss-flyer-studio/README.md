# BOSS Flyer Studio

A small website for the BOSS team: paste course information, and it builds a print-ready program flyer in the BOSS design, with an AI-generated photo. Everything can be edited before downloading.

## What it does

1. **Paste**: paste course details (brochure text, a web page, an email). OpenAI fills in the flyer using only those facts, and lists anything it could not find.
2. **Text**: edit every field: headline, badge, tagline, key facts (with icons), topics, highlights, careers, admission, salary and the financial note. Section titles are editable too.
3. **Photo**: the app writes the photo prompt for you (South Indian people with fair to light wheatish skin, bright modern setting, clothing in the flyer colours, no text). Edit the scene, then generate it with OpenAI, or upload your own photo. Move and zoom the photo to frame faces.
4. **Design**: 9 colour themes (including the G2, G3, ECEA and PSW colours), "make a theme from one colour", five fine-tune colour pickers, layout options, topic columns, text size and header height, and show or hide any section.
5. **Contact**: the logo tagline, phone, address and website on the flyer. Save them as the default for new flyers.

Text size adjusts automatically so the page is always full and nothing spills over. The badge at the top of the preview tells you if something is too long.

**Downloads**
- **PDF**: one-click print PDF, 8.75 x 11.25 in (US Letter with 0.125 in bleed), 300 dpi.
- **PNG**: 300 dpi image for a print shop.
- **Web JPG**: smaller file for WhatsApp, email and social media.
- **Print**: opens the browser print dialog. Choose "Save as PDF" for a PDF with sharp vector text.

**Saving**: flyers save automatically in each person's browser ("My flyers"). To pass a flyer to a teammate, use *My flyers > Export current flyer* and send them the file; they use *Import a flyer file*.

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
3. **Optional settings** (Vercel > Project > Settings > Environment Variables, then redeploy):
   - `OPENAI_TEXT_MODEL` (default `gpt-5.6`): the model that reads the course text.
   - `OPENAI_IMAGE_MODEL` (default `gpt-image-2.5-sunburst`): the photo model.
   - `OPENAI_IMAGE_QUALITY` (default `high`; `medium` or `low` are cheaper).
   If OpenAI renames or retires a model, the app shows the error message. Change the variable to a current model name and redeploy.

Photo generation can take up to a minute. On Vercel's free plan, if photos time out, turn on **Fluid Compute** in the project settings (it allows longer requests).

## Costs

OpenAI bills your account for each "Create flyer" (a small text request) and each photo (the larger cost). Set a monthly budget limit at platform.openai.com > Settings > Limits. Vercel hosting is free on the Hobby plan.

## Run it on your own computer (optional)

```bash
npm install
cp .env.example .env.local   # then put your key and a password in .env.local
npm run dev                  # open http://localhost:3000
```

To try the app without an OpenAI key, run `MOCK_OPENAI=1 npm run dev`. It then returns sample text and a grey placeholder photo instead of calling OpenAI.

## Files

- `components/Flyer.tsx`: the flyer design (layout, auto-fit, all visual rules)
- `lib/colors.ts`: colour themes and automatic readable text colours
- `lib/prompt.ts`: the photo prompt rules
- `lib/schema.ts`: the instructions OpenAI follows when reading course text (facts only, no invented details, no long dashes)
- `lib/samples.ts`: the G2, G3, ECEA and PSW starter flyers
- `app/api/parse` and `app/api/image`: the server routes that call OpenAI (your key never reaches the browser)
- `proxy.ts`: the team password check
- `public/logo-*.svg`: BOSS logos
