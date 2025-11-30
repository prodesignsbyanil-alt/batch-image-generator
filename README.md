# AI Batch Image Studio (Gemini + Next.js + Vercel)

এই প্রজেক্ট দিয়ে আপনি একসাথে অনেকগুলো prompt থেকে Google Gemini Imagen API ব্যবহার করে batch আকারে ইমেজ জেনারেট করতে পারবেন।

## কী আছে এই প্রজেক্টে

- Professional looking UI
- উপরে বাম পাশে বড় অক্ষরে সাইটের নাম — **AI Batch Image Studio**
- উপরে ডান পাশে:
  - Email দিয়ে login (login না করলে অ্যাপ ব্যবহার করা যাবে না, UI ব্লার থাকবে)
  - ডানদিকের কোনায় box এর ভিতরে: **Developed By – Anil Chandra Barman**
- **Generation Controls** সেকশন:
  - ১০টি Gemini API key এর ইনপুট বক্স
  - প্রতিটির পাশে View / Hide বাটন
  - নিচে **Save API Keys** বাটন — keys ব্রাউজারের `localStorage` এ সেভ হবে
- Prompt queue — এক লাইনে একটি করে prompt
- Batch run করলে:
  - প্রতিটি prompt এর জন্য Gemini Imagen model দিয়ে ইমেজ জেনারেট
  - Auto file name তৈরি (prompt থেকে slug)
  - Preview + Download লিংক (ব্রাউজার যে ডাউনলোড ফোল্ডার দেখাবে সেখানেই সেভ হবে)

## লোকাল সেটআপ

```bash
npm install
```

`.env.local` ফাইলে চাইলে fallback key সেট করতে পারেন:

```bash
GEMINI_API_KEY=your_default_gemini_api_key_here
```

তারপর ডেভ সার্ভার চালু করুন:

```bash
npm run dev
```

`http://localhost:3000` এ যান।

## Vercel এ ডিপ্লয়

1. এই ফোল্ডার GitHub repo হিসেবে push করুন।
2. Vercel এ নতুন প্রজেক্ট করে ঐ repo সিলেক্ট করুন।
3. `GEMINI_API_KEY` (optional fallback) environment variable সেট করতে পারেন।
4. ডিপ্লয় হয়ে গেলে live URL থেকে ব্যবহার করতে পারবেন।

## গুরুত্বপূর্ণ নোট

- UI থেকে দেয়া API keys শুধুই ব্রাউজারের `localStorage` এ সেভ হয় এবং প্রতিটি `/api/generate-image` রিকোয়েস্টে body এর সাথে পাঠানো হয়।
- Security এর দিক থেকে production সিস্টেমের জন্য server-side secure storage (DB / secret manager) ব্যবহার করা উচিত।
- Gemini Imagen ব্যবহার এবং rate limit সম্পর্কিত তথ্যের জন্য অফিসিয়াল ডক দেখুন।
