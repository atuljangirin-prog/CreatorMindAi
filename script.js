/* ═══════════════════════════════════════
   CREATORMIND by ToolVora AI — SCRIPT.JS
   ═══════════════════════════════════════ */

'use strict';

// ── State ──────────────────────────────────
const state = {
  ownApiKey: localStorage.getItem('cm_api_key') || '',
  theme: localStorage.getItem('cm_theme') || 'dark',
  lastPrompt: null,
  lastContent: '',
  draft: localStorage.getItem('cm_draft') || '',
};

// ── DOM Refs ──────────────────────────────
const $ = id => document.getElementById(id);

// ── Init ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  initNavbar();
  initThemeToggle();
  initApiSetup();
  initGenerator();
  initTemplates();
  initTestimonials();
  initFAQ();
  initReveal();
  initKeyboardShortcuts();
  restoreDraft();
});

// ═══════════════ THEME ═══════════════
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☽' : '☀';
  state.theme = theme;
  localStorage.setItem('cm_theme', theme);
}

function initThemeToggle() {
  $('themeToggle')?.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });
}

// ═══════════════ NAVBAR ═══════════════
function initNavbar() {
  const navbar = $('navbar');
  const hamburger = $('hamburger');
  const navLinks = $('navLinks');

  window.addEventListener('scroll', () => {
    navbar.style.background = window.scrollY > 20
      ? (state.theme === 'dark' ? 'rgba(11,17,32,0.96)' : 'rgba(248,250,252,0.96)')
      : '';
  }, { passive: true });

  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });
}

// ═══════════════ API SETUP (USER KEY ONLY) ═══════════════
function initApiSetup() {
  // Restore saved key
  if (state.ownApiKey && $('apiKeyInput')) {
    $('apiKeyInput').value = state.ownApiKey;
  }

  $('saveApiKey')?.addEventListener('click', () => {
    const key = $('apiKeyInput')?.value.trim();
    if (!key) { showToast('Please enter your API key.'); return; }
    state.ownApiKey = key;
    localStorage.setItem('cm_api_key', key);
    showToast('✓ API key saved securely in your browser!');
  });
}

// Returns the active API key
function getActiveApiKey() {
  return state.ownApiKey;
}

// ═══════════════ GENERATOR ═══════════════
function initGenerator() {
  $('generateBtn')?.addEventListener('click', handleGenerate);

  // Quick template buttons
  document.querySelectorAll('.qt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const topic = btn.dataset.topic;
      if (type) { const el = $('contentType'); if (el) el.value = type; }
      if (topic) { const el = $('topicInput'); if (el) el.value = topic; }
      handleGenerate();
    });
  });

  // Action buttons
  $('copyBtn')?.addEventListener('click', copyOutput);
  $('downloadBtn')?.addEventListener('click', downloadOutput);
  $('regenBtn')?.addEventListener('click', handleGenerate);

  // Auto-save draft
  $('topicInput')?.addEventListener('input', () => {
    localStorage.setItem('cm_draft', $('topicInput').value);
  });
}

function restoreDraft() {
  if (state.draft && $('topicInput')) {
    $('topicInput').value = state.draft;
  }
}

async function handleGenerate() {
  const topic = $('topicInput')?.value.trim();
  const type = $('contentType')?.value;
  const tone = $('toneSelect')?.value;
  const platform = $('platformSelect')?.value;
  const length = $('lengthSelect')?.value;
  const context = $('contextInput')?.value.trim();

  if (!topic) { showToast('⚠ Please enter a content topic.'); $('topicInput')?.focus(); return; }

  const activeKey = getActiveApiKey();
  if (!activeKey) {
    showToast('⚠ Please save your Groq API key first.');
    document.querySelector('#setup')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const prompt = buildPrompt({ topic, type, tone, platform, length, context });
  state.lastPrompt = prompt;

  setGenerating(true);
  showSkeleton();

  try {
    const content = await callGroqAPI(prompt, activeKey);
    state.lastContent = content;
    renderOutput(content);
    renderAnalytics(content);
    $('panelActions').style.display = 'flex';
  } catch (err) {
    renderError(err.message);
  } finally {
    setGenerating(false);
  }
}

function buildPrompt({ topic, type, tone, platform, length, context }) {
  const typeLabels = {
    youtube_script: 'YouTube Video Script',
    youtube_title: '10 YouTube Video Titles',
    instagram_caption: 'Instagram Caption',
    blog_intro: 'Blog Post Introduction',
    reels_hook: '5 Viral Reels/TikTok Hooks',
    twitter_post: 'Twitter/X Post',
    linkedin_post: 'LinkedIn Post',
    product_desc: 'Product Description',
    hashtags: 'Hashtag Pack (30 hashtags)',
    video_ideas: '10 Video Ideas',
    content_plan: '30-Day Content Plan',
  };

  const lengths = { short: '100-150 words', medium: '250-350 words', long: '500-700 words', detailed: '800-1000 words' };
  const label = typeLabels[type] || type;
  const wordRange = lengths[length] || '250-350 words';

  let systemPrompt = `You are CreatorMind by ToolVora AI, an elite content creation specialist. 
Generate high-quality, platform-optimized content. Format output clearly with sections. 
Use emoji sparingly. Be specific, engaging, and actionable.`;

  let userPrompt = `Create a ${label} about: "${topic}"

Tone: ${tone}
Platform: ${platform}
Target length: ${wordRange}
${context ? `Additional context: ${context}` : ''}

${getTypeInstructions(type)}

Format the output professionally with clear sections. Make it ready to use immediately.`;

  return { system: systemPrompt, user: userPrompt };
}

function getTypeInstructions(type) {
  const instructions = {
    youtube_script: `Structure the script as:
## 🎬 HOOK (first 5 seconds)
## 📌 INTRO (15-30 seconds)  
## 📝 MAIN CONTENT (key points with sub-sections)
## 🎯 CTA (call to action)
## 👋 OUTRO
Include estimated read time.`,
    youtube_title: `Generate 10 titles in these categories:
- 3 Clickbait titles
- 3 SEO-optimized titles  
- 2 Curiosity-driven titles
- 2 Listicle titles
Rate each title 1-10 for viral potential.`,
    hashtags: `Generate 30 hashtags organized as:
## Broad/Trending (10 tags)
## Niche/Specific (10 tags)
## Long-tail (10 tags)
Include estimated reach for each category.`,
    reels_hook: `Create 5 different viral hooks:
Each hook should be 1-3 sentences, create instant curiosity, and stop the scroll.
Label them: Hook #1, Hook #2, etc.
Explain why each hook works.`,
    content_plan: `Create a structured 30-day content calendar with:
- Week 1-4 themes
- Daily post types
- Topic suggestions
- Engagement tips
Format as a weekly breakdown.`,
    video_ideas: `Generate 10 video ideas with:
- Title
- 2-sentence concept
- Target audience hook
- Expected engagement level`,
  };
  return instructions[type] || '';
}

async function callGroqAPI({ system, user }, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.85,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No content returned.';
}

function setGenerating(loading) {
  const btn = $('generateBtn');
  const btnText = $('generateBtnText');
  if (!btn) return;
  btn.disabled = loading;
  if (btnText) btnText.textContent = loading ? 'Generating...' : 'Generate with AI';
}

function showSkeleton() {
  const body = $('outputBody');
  if (!body) return;
  body.innerHTML = `
    <div class="skeleton skeleton-line" style="width:80%"></div>
    <div class="skeleton skeleton-line" style="width:65%"></div>
    <div class="skeleton skeleton-line" style="width:90%"></div>
    <div class="skeleton skeleton-line" style="width:55%"></div>
    <div class="skeleton skeleton-line" style="width:75%"></div>
    <div class="skeleton skeleton-line" style="width:60%"></div>
  `;
}

function renderOutput(content) {
  const body = $('outputBody');
  if (!body) return;
  body.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'typing-cursor';
  body.appendChild(container);
  typeContent(container, formatMarkdown(content));
}

function typeContent(el, html, speed = 6) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.innerHTML;
  let i = 0;
  el.innerHTML = '';

  function step() {
    if (i < text.length) {
      el.innerHTML = text.slice(0, i + 1);
      i += Math.ceil(speed);
      requestAnimationFrame(step);
    } else {
      el.innerHTML = html;
      el.classList.remove('typing-cursor');
    }
  }
  requestAnimationFrame(step);
}

function formatMarkdown(text) {
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hup])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

function renderError(msg) {
  const body = $('outputBody');
  if (!body) return;
  body.innerHTML = `
    <div style="color:#F87171; text-align:center; padding: 40px 20px;">
      <div style="font-size:2rem; margin-bottom:12px">⚠</div>
      <strong>Generation Failed</strong>
      <p style="font-size:0.85rem; margin-top:8px; color:var(--text-muted)">${msg}</p>
      <p style="font-size:0.8rem; margin-top:8px; color:var(--text-muted)">Check your API key at <a href="https://console.groq.com" target="_blank" style="color:var(--cyan)">console.groq.com</a></p>
    </div>
  `;
}

function renderAnalytics(content) {
  const analytics = $('outputAnalytics');
  if (!analytics) return;
  analytics.style.display = 'block';

  const wordCount = content.split(/\s+/).length;
  const hasEmoji = /[\u{1F300}-\u{1FFFF}]/u.test(content);
  const hasHeaders = /##/.test(content);
  const hasCTA = /click|subscribe|follow|share|comment|like|buy|visit/i.test(content);

  const aiScore = Math.min(98, 70 + (hasHeaders ? 10 : 0) + (hasCTA ? 8 : 0) + (wordCount > 100 ? 10 : 0));
  const readScore = Math.min(96, 65 + (wordCount < 400 ? 15 : 5) + (hasHeaders ? 10 : 0) + (hasEmoji ? 6 : 0));
  const seoScore = Math.min(94, 60 + (wordCount > 150 ? 12 : 0) + (hasHeaders ? 12 : 0) + (hasCTA ? 10 : 0));
  const engScore = Math.min(97, 68 + (hasEmoji ? 8 : 0) + (hasCTA ? 10 : 0) + (wordCount > 200 ? 11 : 0));

  animateScore('scoreAI', aiScore);
  animateScore('scoreRead', readScore);
  animateScore('scoreSEO', seoScore);
  animateScore('scoreEng', engScore);

  const bar = $('barAI');
  if (bar) {
    setTimeout(() => { bar.style.width = `${Math.round((aiScore + readScore + seoScore + engScore) / 4)}%`; }, 100);
  }
}

function animateScore(id, target) {
  const el = $(id);
  if (!el) return;
  let current = 0;
  const step = () => {
    current = Math.min(target, current + 3);
    el.textContent = current + '/100';
    if (current < target) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function copyOutput() {
  if (!state.lastContent) return;
  navigator.clipboard.writeText(state.lastContent).then(() => {
    showToast('✓ Copied to clipboard!');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = state.lastContent;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✓ Copied!');
  });
}

function downloadOutput() {
  if (!state.lastContent) return;
  const topic = $('topicInput')?.value.trim() || 'content';
  const type = $('contentType')?.value || 'output';
  const filename = `${type}-${topic.slice(0, 30).replace(/\s+/g, '-')}.txt`;
  const blob = new Blob([state.lastContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ Downloaded!');
}

// ═══════════════ TEMPLATES ═══════════════
const TEMPLATES = [
  { id: 1, cat: 'youtube', icon: '▶', color: 'cyan', name: 'YouTube Hook Script', desc: 'High-retention hook, intro, and CTA for any YouTube video.', type: 'youtube_script', tone: 'viral', topic: '' },
  { id: 2, cat: 'youtube', icon: '🔥', color: 'purple', name: 'Viral Title Pack', desc: '10 clickbait + SEO YouTube titles with engagement scores.', type: 'youtube_title', tone: 'viral', topic: '' },
  { id: 3, cat: 'youtube', icon: '💡', color: 'cyan', name: 'Video Ideas Burst', desc: '10 fresh video ideas with hooks and audience targeting.', type: 'video_ideas', tone: 'creative', topic: '' },
  { id: 4, cat: 'instagram', icon: '◈', color: 'purple', name: 'Instagram Caption', desc: 'Scroll-stopping captions with emojis and CTA.', type: 'instagram_caption', tone: 'creative', topic: '' },
  { id: 5, cat: 'instagram', icon: '#', color: 'cyan', name: 'Hashtag Power Pack', desc: '30 trending + niche hashtags organized by reach.', type: 'hashtags', tone: 'viral', topic: '' },
  { id: 6, cat: 'instagram', icon: '✦', color: 'purple', name: 'Reels Hook Collection', desc: '5 viral hooks that stop the scroll instantly.', type: 'reels_hook', tone: 'funny', topic: '' },
  { id: 7, cat: 'blog', icon: '✍', color: 'cyan', name: 'Blog Post Intro', desc: 'SEO-optimized blog introductions that hook readers.', type: 'blog_intro', tone: 'educational', topic: '' },
  { id: 8, cat: 'linkedin', icon: '◉', color: 'purple', name: 'LinkedIn Thought Post', desc: 'Professional LinkedIn posts that drive engagement.', type: 'linkedin_post', tone: 'professional', topic: '' },
  { id: 9, cat: 'twitter', icon: '𝕏', color: 'cyan', name: 'Twitter Thread Hook', desc: 'Viral Twitter/X posts with strong hooks.', type: 'twitter_post', tone: 'viral', topic: '' },
  { id: 10, cat: 'blog', icon: '📅', color: 'purple', name: '30-Day Content Plan', desc: 'Full content calendar with daily themes and ideas.', type: 'content_plan', tone: 'professional', topic: '' },
  { id: 11, cat: 'linkedin', icon: '🎯', color: 'cyan', name: 'Product Description', desc: 'Conversion-focused product descriptions that sell.', type: 'product_desc', tone: 'luxury', topic: '' },
  { id: 12, cat: 'twitter', icon: '⚡', color: 'purple', name: 'Motivational Post', desc: 'High-engagement motivational content for any niche.', type: 'twitter_post', tone: 'motivational', topic: '' },
];

function initTemplates() {
  renderTemplates(TEMPLATES);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      const filtered = cat === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.cat === cat);
      renderTemplates(filtered);
    });
  });

  $('templateSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = TEMPLATES.filter(t => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
    renderTemplates(filtered);
  });
}

function renderTemplates(list) {
  const grid = $('templatesGrid');
  if (!grid) return;
  grid.innerHTML = list.map(t => `
    <div class="template-card reveal" onclick="useTemplate(${t.id})">
      <div class="tc-header">
        <div class="tc-icon" style="background: var(--${t.color}-dim); color: var(--${t.color})">${t.icon}</div>
        <div>
          <div class="tc-name">${t.name}</div>
          <div class="tc-cat">${t.cat}</div>
        </div>
      </div>
      <div class="tc-desc">${t.desc}</div>
      <span class="tc-use">Use Template →</span>
    </div>
  `).join('');
  observeReveal();
}

function useTemplate(id) {
  const tpl = TEMPLATES.find(t => t.id === id);
  if (!tpl) return;
  const typeEl = $('contentType');
  const toneEl = $('toneSelect');
  const topicEl = $('topicInput');
  if (typeEl) typeEl.value = tpl.type;
  if (toneEl) toneEl.value = tpl.tone;
  if (topicEl && !topicEl.value) topicEl.placeholder = `Enter a topic for ${tpl.name}...`;

  document.querySelector('#generator')?.scrollIntoView({ behavior: 'smooth' });
  showToast(`✓ Template "${tpl.name}" applied!`);
  topicEl?.focus();
}

// ═══════════════ TESTIMONIALS ═══════════════
const TESTIMONIALS = [
  { name: 'Verified Human', role: 'YouTuber · 500K subs', rating: 5, text: 'CreatorMind completely changed my content workflow. I generate a week of video scripts in under 30 minutes. The hooks are insanely good.' },
  { name: 'Happy Customer', role: 'Instagram Creator · 200K', rating: 5, text: 'The hashtag generator alone is worth it. My reach went up 3x in the first month. The captions feel genuinely human and creative.' },
  { name: 'Internet Stranger', role: 'LinkedIn Influencer', rating: 5, text: 'I was skeptical about AI content tools, but this one actually understands context. My LinkedIn posts now consistently hit 50K+ impressions.' },
  { name: 'Website Visitor', role: 'Brand Strategist', rating: 5, text: 'The 30-day content plan feature is a game-changer for client work. I deliver full content strategies in hours instead of days.' },
  { name: 'Marketing Ninja', role: 'TikTok Creator · 1M subs', rating: 5, text: 'The viral hooks are unreal. I copy one, shoot a quick video, and it blows up. CreatorMind basically does the hard creative thinking for me.' },
  { name: 'Tech Enthusiast', role: 'Content Director', rating: 5, text: 'Best AI content tool on the market. The tone customization is so precise — Luxury, Educational, Funny — everything lands perfectly every time.' },
];

let sliderIndex = 0;
let sliderInterval;

function initTestimonials() {
  const track = $('testimonialsTrack');
  const dots = $('sliderDots');
  if (!track) return;

  track.innerHTML = TESTIMONIALS.map((t, i) => `
    <div class="testimonial-card">
      <div class="tc-stars">${'★'.repeat(t.rating)}</div>
      <p class="tc-text">"${t.text}"</p>
      <div class="tc-author">
        <div class="tc-avatar">${t.name[0]}</div>
        <div>
          <div class="tc-author-name">${t.name}</div>
          <div class="tc-author-role">${t.role}</div>
        </div>
      </div>
    </div>
  `).join('');

  const count = Math.ceil(TESTIMONIALS.length / 3);
  if (dots) {
    dots.innerHTML = Array.from({ length: count }, (_, i) =>
      `<button class="slider-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`
    ).join('');
  }

  sliderInterval = setInterval(() => goToSlide((sliderIndex + 1) % count), 4000);
}

function goToSlide(index) {
  const track = $('testimonialsTrack');
  const dots = document.querySelectorAll('.slider-dot');
  if (!track) return;

  const isMobile = window.innerWidth <= 768;
  const cardWidth = isMobile ? 100 : 33.33;
  const perSlide = isMobile ? 1 : 3;

  sliderIndex = index % Math.ceil(TESTIMONIALS.length / perSlide);
  track.style.transform = `translateX(-${sliderIndex * cardWidth * perSlide}%)`;

  dots.forEach((d, i) => d.classList.toggle('active', i === sliderIndex));
  clearInterval(sliderInterval);
  sliderInterval = setInterval(() => {
    const count = Math.ceil(TESTIMONIALS.length / perSlide);
    goToSlide((sliderIndex + 1) % count);
  }, 4000);
}

// ═══════════════ FAQ ═══════════════
const FAQS = [
  { q: 'How does AI content generation work?', a: 'CreatorMind by ToolVora AI connects to advanced language models (Groq/LLaMA) via API. You provide a topic, type, and tone — the AI generates platform-optimized content in seconds. No complex setup needed.' },
  { q: 'Is there a free plan available?', a: 'Yes! You can use your own free Groq API key (available at console.groq.com) and generate up to 20 pieces of content per day for free. Groq provides extremely fast inference at no cost.' },
  { q: 'Which AI model does the platform use?', a: 'CreatorMind uses LLaMA 3.3 70B via Groq\'s ultra-fast inference API. This gives you high-quality, GPT-4 level content at blazing speeds — often under 2 seconds per generation.' },
  { q: 'How good is the content quality?', a: 'Very high. The platform uses carefully engineered prompts optimized for each content type. YouTube scripts include proper hooks and CTAs. Hashtag packs are organized by reach and niche. Every output is ready to use.' },
  { q: 'Can I export or save my content?', a: 'Yes. Every generated piece can be copied to clipboard or downloaded as a .txt file. Your topic drafts are also auto-saved locally so you never lose your work.' },
  { q: 'Is my API key secure?', a: 'Your API key is stored only in your browser\'s localStorage and is never sent to our servers. All API calls are made directly from your browser to Groq\'s servers. Your data stays completely private.' },
];

function initFAQ() {
  const list = $('faqList');
  if (!list) return;

  list.innerHTML = FAQS.map((f, i) => `
    <div class="faq-item reveal" id="faq-${i}">
      <button class="faq-q" onclick="toggleFAQ(${i})">
        <span>${f.q}</span>
        <span class="faq-chevron">▼</span>
      </button>
      <div class="faq-a">${f.a}</div>
    </div>
  `).join('');
}

function toggleFAQ(i) {
  const item = document.getElementById(`faq-${i}`);
  const isOpen = item?.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) item?.classList.add('open');
}

// ═══════════════ REVEAL ═══════════════
function initReveal() {
  observeReveal();
}

function observeReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  if (!els.length) return;

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 60);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
  } else {
    els.forEach(el => el.classList.add('visible'));
  }
}

document.querySelectorAll('.feature-card, .price-card, .testimonial-card, .faq-item').forEach(el => {
  el.classList.add('reveal');
});

setTimeout(observeReveal, 100);

// ═══════════════ KEYBOARD SHORTCUTS ═══════════════
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      $('topicInput')?.focus();
      $('topicInput')?.select();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && state.lastContent) {
      e.preventDefault();
      downloadOutput();
    }
  });
}

// ═══════════════ TOAST ═══════════════
let toastTimer;
function showToast(msg) {
  const toast = $('toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ═══════════════ SMOOTH SCROLL ═══════════════
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Expose global for inline onclick handlers
window.useTemplate = useTemplate;
window.goToSlide = goToSlide;
window.toggleFAQ = toggleFAQ;
