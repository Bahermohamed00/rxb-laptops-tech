import { useState } from 'react'
import { demoProducts } from '../../data/demo-products'
import type { Product } from './products.types'
import './home.css'

function ProductVisual({ product }: { product: Product }) {
  return <div className={`product-visual ${product.accent}`} aria-hidden="true"><div className={`laptop-art ${product.visual}`}><div className="screen"><span className="screen-light" /></div><div className="base"><span /></div></div><span className="visual-index">RXB / 0{demoProducts.indexOf(product) + 1}</span></div>
}

type HomePageProps = { introVisible: boolean }

export default function HomePage({ introVisible }: HomePageProps) {
  const [language, setLanguage] = useState<'EN' | 'عربي'>('EN')
  const [filter, setFilter] = useState<'all' | 'new' | 'pre-owned'>('all')
  const isArabic = language === 'عربي'
  const shownProducts = filter === 'all' ? demoProducts : demoProducts.filter((product) => product.type === filter)

  return <main className={`site ${introVisible ? 'site-muted' : 'site-ready'}`} dir={isArabic ? 'rtl' : 'ltr'}>
    <div className="announcement"><span className="status-dot" /> CURATED TECHNOLOGY. READY FOR WHAT'S NEXT. <span className="announce-end">CAIRO, EGYPT <span>↗</span></span></div>
    <header className="header wrap">
      <a className="wordmark" href="#top" aria-label="RXB home"><span className="wordmark-rxb">RXB<span>®</span></span><span className="wordmark-caption">LAPTOPS <i>/</i> TECH</span></a>
      <nav className="main-nav" aria-label="Main navigation"><a href="#categories">Discover</a><a href="#collection">Laptops</a><a href="#about">Our standard</a></nav>
      <div className="header-tools"><label className="search-box"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input type="search" placeholder={isArabic ? 'ابحث عن أجهزة' : 'Search laptops'} aria-label={isArabic ? 'ابحث عن أجهزة' : 'Search laptops'} /></label><button className="language" onClick={() => setLanguage(isArabic ? 'EN' : 'عربي')} aria-label="Switch language">{isArabic ? 'عربي' : 'EN'} <span>⌄</span></button><button className="bag-button">BAG <span>0</span></button></div>
    </header>

    <section className="hero wrap" id="top">
      <div className="hero-copy"><div className="eyebrow"><span>01</span><i /> BUILT AROUND YOUR NEXT MOVE</div><h1>{isArabic ? <>قوةٌ <em>تواكب</em><br />طموحك.</> : <>Power that<br />moves <em>you.</em></>}</h1><p className="hero-description">Thoughtfully selected laptops for the way you think, work, and create. Your next chapter starts here.</p><div className="hero-actions"><a className="button-primary" href="#collection">Explore the collection <span>↗</span></a><a href="#categories" className="text-link">Find your fit <span>↓</span></a></div><div className="hero-note"><span className="note-rule" /> INDEPENDENTLY SOURCED. PERSONALLY CHECKED.</div></div>
      <div className="hero-art" aria-label="Illustrative image of a premium laptop"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-coordinate">30°02' N&nbsp;&nbsp; 31°14' E</div><div className="hero-laptop"><div className="hero-screen"><div className="screen-wallpaper"><span className="wallpaper-orb" /><span className="wallpaper-glow" /><span className="wallpaper-line" /><b>01<br /><small>MAKE IT MATTER</small></b></div><span className="camera" /></div><div className="hero-base"><div className="keyboard" /><div className="trackpad" /></div></div><div className="art-caption"><span>RXB / FIELD NOTE 001</span><span>FORM MEETS FUNCTION</span></div><div className="art-glint">✳</div></div>
      <div className="hero-bottom"><span>SCROLL TO EXPLORE <b>↓</b></span><span>DESIGNED FOR EVERY DAY. CHOSEN FOR YOU.</span><span>EST. 2025&nbsp; /&nbsp; EGYPT</span></div>
    </section>

    <section className="category-section wrap" id="categories"><div className="section-heading"><div><div className="eyebrow"><span>02</span><i /> CHOOSE YOUR PACE</div><h2>Made for <em>your kind</em><br className="mobile-break" /> of day.</h2></div><p>Different days call for different tools.<br />Start with what you need to do.</p></div><div className="category-grid"><a className="category-card study" href="#collection"><span className="category-number">01 / FOCUS</span><span className="category-icon">✳</span><div><span>FOR THE CURIOUS</span><h3>Study<span>↗</span></h3></div><span className="category-arrow">EXPLORE <b>↗</b></span></a><a className="category-card work" href="#collection"><span className="category-number">02 / FLOW</span><span className="category-icon">⌘</span><div><span>FOR THE BUILDERS</span><h3>Work<span>↗</span></h3></div><span className="category-arrow">EXPLORE <b>↗</b></span></a><a className="category-card performance" href="#collection"><span className="category-number">03 / FULL THROTTLE</span><span className="category-icon">ϟ</span><div><span>FOR THE ALL-IN</span><h3>Perform<span>↗</span></h3></div><span className="category-arrow">EXPLORE <b>↗</b></span></a></div></section>

    <section className="collection-section" id="collection"><div className="wrap"><div className="collection-top"><div><div className="eyebrow"><span>03</span><i /> THE RXB EDIT</div><h2>Good machines.<br /><em>Better stories.</em></h2></div><div className="collection-aside"><p>A considered lineup of new and pre-owned laptops, each chosen with care.</p><a className="text-link" href="#about">Our quality promise <span>↗</span></a></div></div><div className="product-toolbar"><span>DEMO COLLECTION <i>·</i> ILLUSTRATIVE PRODUCTS & PRICES</span><div className="filters" role="group" aria-label="Filter products">{(['all', 'new', 'pre-owned'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All laptops' : item === 'new' ? 'New' : 'Pre-owned'}</button>)}</div></div><div className="product-grid">{shownProducts.map((product, index) => <article className="product-card" key={product.name}><div className="product-image-wrap"><ProductVisual product={product} /><span className="condition-pill">{product.condition}</span><button className="save-button" aria-label={`Save ${product.name}`}>＋</button></div><div className="product-info"><div><span className="product-label">{product.type === 'new' ? 'JUST ARRIVED' : 'RXB CHECKED'}</span><h3>{product.name}</h3><p>{product.line}</p></div><div className="product-price">{product.price}<span>ILLUSTRATIVE</span></div></div><div className="product-foot"><span>01 — 0{index + 1}</span><span>VIEW DETAILS ↗</span></div></article>)}</div></div></section>

    <section className="manifesto wrap" id="about"><span className="manifesto-mark">✳</span><div className="eyebrow"><span>04</span><i /> A BETTER WAY TO CHOOSE</div><h2>Less scrolling.<br /><em>More certainty.</em></h2><p>Every RXB pick is considered for real life: clear specs, honest condition, and the right machine for the move you’re making.</p><a className="button-outline" href="#collection">Get to know RXB <span>↗</span></a><span className="manifesto-foot">POWER YOUR NEXT MOVE&nbsp; /&nbsp; RXB</span></section>

    <footer className="footer"><div className="wrap footer-inner"><a className="wordmark" href="#top"><span className="wordmark-rxb">RXB<span>®</span></span><span className="wordmark-caption">LAPTOPS <i>/</i> TECH</span></a><span className="footer-note">POWER YOUR NEXT MOVE.</span><span className="footer-right">© RXB Laptops / Tech&nbsp; · &nbsp;DEMO CONCEPT</span></div></footer>
  </main>
}
