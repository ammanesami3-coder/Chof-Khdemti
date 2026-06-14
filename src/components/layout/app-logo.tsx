import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<Size, number> = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 80,
};

type Props = {
  size?: Size;
  showText?: boolean;
  href?: string;
  className?: string;
};

function LogoImage({ size }: { size: Size }) {
  const px = SIZE_MAP[size];
  return (
    <>
      {/* Light mode */}
      <Image
        src="/logo.png"
        alt="Chof Khdemti — شوف خدمتي"
        width={px}
        height={px}
        className={cn('rounded-xl object-cover dark:hidden', size === 'sm' && 'rounded-lg')}
        priority
      />
      {/* Dark mode */}
      <Image
        src="/logo-dark.png"
        alt="Chof Khdemti — شوف خدمتي"
        width={px}
        height={px}
        className={cn('hidden rounded-xl object-cover dark:block', size === 'sm' && 'rounded-lg')}
        priority
      />
    </>
  );
}

export function AppLogo({ size = 'md', showText = false, href = '/', className }: Props) {
  const content = (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoImage size={size} />
      {showText && (
        <span className="font-bold text-foreground" style={{ fontSize: size === 'xl' ? 22 : size === 'lg' ? 18 : 15 }}>
          Chof Khdemti
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="Chof Khdemti — شوف خدمتي">
      {content}
    </Link>
  );
}
