import Image from 'next/image';
import logo from '@/assets/logo.png';
import styles from './BrandLogo.module.scss';

type LogoSize = 'sidebar' | 'login' | 'document';

export function BrandLogo({ size = 'sidebar', priority = false }: { size?: LogoSize; priority?: boolean }) {
  return (
    <span className={`${styles.logo} ${styles[size]}`} aria-label="Peremoney">
      <Image src={logo} alt="Peremoney" priority={priority} sizes={size === 'login' ? '252px' : '168px'} />
    </span>
  );
}
