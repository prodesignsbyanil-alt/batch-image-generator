# Batch Image Generator (Next.js + Vercel)

এটা একটা সিম্পল প্রজেক্ট, যেখানে আপনি একসাথে অনেকগুলো prompt দিয়ে OpenAI Image API ব্যবহার করে batch আকারে ইমেজ জেনারেট করতে পারবেন।

## কীভাবে ব্যবহার করবেন

### 1. লোকাল সেটআপ

```bash
npm install
```

প্রজেক্ট রুটে `.env.local` ফাইল তৈরি করুন:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

তারপর:

```bash
npm run dev
```

ব্রাউজারে যান: `http://localhost:3000`

### 2. Vercel এ ডিপ্লয়

1. এই প্রজেক্ট GitHub এ push করুন।
2. Vercel এ গিয়ে নতুন প্রজেক্ট হিসেবে ওই GitHub repo সিলেক্ট করুন।
3. Vercel Project Settings → Environment Variables এ গিয়ে:
   - Key: `OPENAI_API_KEY`
   - Value: আপনার OpenAI secret key
4. ডিপ্লয় শেষ হলে প্রোডাকশন URL থেকে অ্যাপ খুলে ব্যবহার করতে পারবেন।

## কী করে এই অ্যাপ

- Home পেজে একটি বড় textarea আছে, যেখানে:
  - প্রতি লাইনে ১টি করে prompt লিখবেন।
- "Load Prompts" দিলে সবগুলো prompt একটি লিস্টে চলে যাবে।
- "Start Batch" চাপলে:
  - এক এক করে `/api/generate-image` route এ রিকুয়েস্ট যায়।
  - প্রতিটি prompt থেকে OpenAI Image API দিয়ে ১টি করে ইমেজ জেনারেট হয়।
  - ফলাফল হিসেবে:
    - Status: pending / processing / done / error
    - ইমেজ preview + ডাউনলোড লিংক দেখায়।

> নোট: Demo হিসেবে এখানে ইমেজ সাইজ `512x512` দেওয়া আছে। প্রয়োজন অনুযায়ী `/pages/api/generate-image.js` ফাইলের `size` প্যারামিটার পরিবর্তন করে নিন।
