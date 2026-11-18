import { getImageProps } from 'next/image';

interface EventImageProps {
  /** Normal (landscape) image: used on screens 640px and wider, and as the fallback. */
  src: string;
  /** Optional portrait image used on phones (below 640px). */
  mobileSrc?: string | null;
  alt?: string;
  sizes: string;
  priority?: boolean;
  unoptimized?: boolean;
  quality?: number;
  className?: string;
}

/**
 * Art-directed event picture. Phones get the organiser's mobile image when there is one;
 * everything else gets the normal image. Uses <picture>, so only the matching file is downloaded.
 * The parent must be `relative` with a fixed aspect ratio (the image fills it).
 */
export function EventImage({ src, mobileSrc, alt = '', sizes, priority, unoptimized, quality, className }: EventImageProps) {
  const common = { alt, sizes, fill: true as const, priority, unoptimized, quality };
  const { props: main } = getImageProps({ ...common, src });
  const { srcSet: mainSet, ...img } = main;

  if (!mobileSrc || mobileSrc === src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...main} alt={alt} className={className} />;
  }

  const { props: mobile } = getImageProps({ ...common, src: mobileSrc });
  return (
    <picture>
      <source media="(max-width: 639px)" srcSet={mobile.srcSet ?? mobile.src} />
      <source media="(min-width: 640px)" srcSet={mainSet ?? main.src} />
      <img {...img} alt={alt} className={className} />
    </picture>
  );
}
