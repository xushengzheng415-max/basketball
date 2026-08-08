'use strict'

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const officialOrigin = 'https://sxfbasketball.cn'
const errors = []

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function fail(message) {
  errors.push(message)
}

const articleDirectory = path.join(root, 'articles', 'posts')
const articleFiles = fs.readdirSync(articleDirectory)
  .filter((name) => name.endsWith('.html'))
  .sort()

const homepage = read('index.html')
const homepageTitle = homepage.match(/<title>([\s\S]*?)<\/title>/i)
const homepageCanonical = homepage.match(
  /<link\s+rel="canonical"\s+href="([^"]+)"/i
)
const homepageH1 = homepage.match(/<h1>([\s\S]*?)<\/h1>/i)
const homepageJsonLd = [...homepage.matchAll(
  /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi
)]

if (!homepageTitle || !homepageTitle[1].includes('赛小蜂篮球官网')) {
  fail('index.html: title must identify the official 赛小蜂篮球 website')
}
if (!homepageCanonical || homepageCanonical[1] !== `${officialOrigin}/`) {
  fail('index.html: canonical must match the official homepage')
}
if (!homepageH1 || !homepageH1[1].replace(/<[^>]+>/g, '').includes('赛小蜂篮球')) {
  fail('index.html: visible H1 must include the full brand name')
}
if (homepageJsonLd.length === 0) {
  fail('index.html: missing JSON-LD')
} else {
  let hasWebsiteBrand = false
  for (const block of homepageJsonLd) {
    try {
      const data = JSON.parse(block[1])
      const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data]
      if (nodes.some((node) => (
        node['@type'] === 'WebSite' &&
        node.name === '赛小蜂篮球' &&
        node.url === `${officialOrigin}/` &&
        (
          node.alternateName === '赛小蜂' ||
          (Array.isArray(node.alternateName) && node.alternateName.includes('赛小蜂'))
        )
      ))) {
        hasWebsiteBrand = true
      }
    } catch (error) {
      fail(`index.html: invalid JSON-LD: ${error.message}`)
    }
  }
  if (!hasWebsiteBrand) {
    fail('index.html: missing WebSite brand data for 赛小蜂篮球 / 赛小蜂')
  }
}

for (const fileName of articleFiles) {
  const relativePath = path.join('articles', 'posts', fileName)
  const html = read(relativePath)

  const title = html.match(/<title>([\s\S]*?)<\/title>/i)
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)

  if (!title || !title[1].trim()) fail(`${relativePath}: missing title`)
  if (!description || description[1].trim().length < 40) {
    fail(`${relativePath}: missing or short meta description`)
  }
  if (!canonical || canonical[1] !== `${officialOrigin}/articles/posts/${fileName}`) {
    fail(`${relativePath}: canonical must match the official URL`)
  }

  const jsonLdBlocks = [...html.matchAll(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi
  )]
  if (jsonLdBlocks.length === 0) fail(`${relativePath}: missing JSON-LD`)
  for (const block of jsonLdBlocks) {
    try {
      JSON.parse(block[1])
    } catch (error) {
      fail(`${relativePath}: invalid JSON-LD: ${error.message}`)
    }
  }

  for (const match of html.matchAll(/href="([^"#]+)"/gi)) {
    const href = match[1]
    if (/^(https?:|mailto:|tel:|\/)/i.test(href)) continue
    const target = path.resolve(path.dirname(path.join(root, relativePath)), href)
    if (!fs.existsSync(target)) fail(`${relativePath}: missing local link ${href}`)
  }

  const articleBody = html.match(/<article class="article-body">([\s\S]*?)<\/article>/i)
  if (!articleBody || !/<a\s+href="\/">[^<]{4,40}<\/a>/i.test(articleBody[1])) {
    fail(`${relativePath}: missing contextual keyword link to the homepage`)
  }

  const forbiddenPatterns = [
    { phrase: '首先', pattern: /(?:>|。)\s*首先[，、：]/ },
    { phrase: '其次', pattern: /(?:>|。)\s*其次[，、：]/ },
    { phrase: '最后', pattern: /(?:>|。)\s*最后[，、：]/ },
    { phrase: '综上所述', pattern: /综上所述/ },
    { phrase: '总而言之', pattern: /总而言之/ },
    { phrase: '未来可期', pattern: /未来可期/ },
    { phrase: '让我们一起', pattern: /让我们一起/ },
    { phrase: '当然可以', pattern: /当然可以/ },
    { phrase: '希望这对你有帮助', pattern: /希望这对你有帮助/ }
  ]
  for (const item of forbiddenPatterns) {
    if (item.pattern.test(html)) {
      fail(`${relativePath}: AI-style phrase requires rewrite: ${item.phrase}`)
    }
  }
}

const sitemap = read('sitemap.xml')
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
const duplicateUrls = sitemapUrls.filter((url, index) => sitemapUrls.indexOf(url) !== index)
if (duplicateUrls.length) fail(`sitemap.xml: duplicate URLs: ${[...new Set(duplicateUrls)].join(', ')}`)

for (const fileName of articleFiles) {
  const url = `${officialOrigin}/articles/posts/${fileName}`
  if (!sitemapUrls.includes(url)) fail(`sitemap.xml: missing ${url}`)
}

const robots = read('robots.txt')
if (!robots.includes(`Sitemap: ${officialOrigin}/sitemap.xml`)) {
  fail('robots.txt: missing official Sitemap URL')
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(
  `SEO validation passed: ${articleFiles.length} articles, ` +
  `${sitemapUrls.length} sitemap URLs.`
)
