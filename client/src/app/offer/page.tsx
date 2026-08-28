import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { BrandLogo } from '@/shared/ui/BrandLogo';
import styles from '../privacy/page.module.scss';

function readOffer() {
  return fs
    .readFileSync(path.join(process.cwd(), 'public', 'public-offer.txt'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function OfferPage() {
  const [title, subtitle, edition, ...content] = readOffer();

  return <main className={styles.page}>
    <article className={styles.document}>
      <header className={styles.header}>
        <BrandLogo size="login" priority />
        <Link href="/login">Вернуться ко входу</Link>
      </header>
      <h1>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
      <p className={styles.updated}>{edition}</p>

      <div className={styles.offerContent}>
        {content.map((line, index) => /^\d+\.\s/.test(line)
          ? <h2 key={`${index}-${line}`}>{line}</h2>
          : <p key={`${index}-${line}`}>{line}</p>)}
      </div>
    </article>
  </main>;
}
